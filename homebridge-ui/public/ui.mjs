/* ui.mjs: Settings UI for homebridge-sony-projector-unified, built on the homebridge-plugin-utils webUi (the same framework homebridge-unifi-protect uses).
 *
 * First run: enter the projector's address and password, test the connection, save. After that the Feature Options tab lists each configured projector with its
 * model, protocol and lamp hours, and only offers options that projector supports.
 */
import { hasProjector, primaryProjector, projectors, withPrimaryProjector } from "./config-helpers.mjs";
import { scopeSafeId } from "homebridge-plugin-utils/featureOptions.js";
import { webUi } from "homebridge-plugin-utils/webUi.mjs";

const field = (id) => document.getElementById(id);

// Match the runtime identity rules so per-device options survive mixed-case IDs and IP changes.
const projectorId = (projector) => (typeof projector?.id === "string") && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(projector.id) ?
  projector.id.toLowerCase() : scopeSafeId(String(projector?.host ?? "").trim().toLowerCase());

const showError = (title, result) => {

  const nodes = [ document.createTextNode(title), document.createElement("br") ];

  if(result?.message) {

    const detail = document.createElement("code");

    detail.className = "text-danger";
    detail.textContent = (result.code ? "[" + result.code + "] " : "") + result.message;
    nodes.push(detail, document.createElement("br"));
  }

  if(result?.hint) {

    nodes.push(document.createTextNode(result.hint));
  }

  field("probeError").replaceChildren(...nodes);
};

const firstRun = {

  isRequired: ({ config }) => !hasProjector(config),

  onStart: ({ config }) => {

    const projector = primaryProjector(config);

    field("host").value = projector?.host ?? "";
    field("password").value = projector?.password ?? "Projector";
    field("username").value = projector?.username ?? "root";

    return true;
  },

  onSubmit: async ({ commit, config }) => {

    const host = field("host").value.trim();
    const password = field("password").value;
    const username = field("username").value.trim() || "root";

    field("probeError").replaceChildren();

    if(!host) {

      showError("Please enter the projector's IP address or hostname.");
      homebridge.hideSpinner();

      return false;
    }

    try {

      const result = await homebridge.request("/probe", { host, password, username });

      if(!result?.ok) {

        showError("Unable to connect to the projector.", result);
        homebridge.hideSpinner();

        return false;
      }

      await commit(withPrimaryProjector(config, { host, name: result.identity?.model ?? "Projector", password, username }));

      return true;
    } catch(error) {

      showError("Unable to complete setup.", { message: (error instanceof Error) ? error.message : String(error) });
      homebridge.hideSpinner();

      return false;
    }
  }
};

// Each projector is a "controller" in the options editor, and also its only device, so options can be set globally or per projector.
const getControllers = async ({ config }) => ({

  controllers: projectors(config).filter((projector) => projector?.host).map((projector) => ({

    address: projector.host, name: projector.name || projector.host, serialNumber: projectorId(projector)
  })),
  error: ""
});

const getDevices = async (controller, { config }) => {

  if(!controller) {

    return { devices: [], error: "" };
  }

  const projector = projectors(config).find((candidate) => projectorId(candidate) === controller.serialNumber);

  if(!projector) {

    return { devices: [], error: "This projector is no longer in the plugin configuration." };
  }

  const result = await homebridge.request("/probe", projector);

  if(!result?.ok) {

    return { devices: [], error: (result?.code ? "[" + result.code + "] " : "") + (result?.message ?? "Unable to reach the projector."),
      guidance: result?.hint };
  }

  return {

    devices: [{

      capabilities: result.capabilities,
      firmwareRevision: result.identity.firmware ?? "",
      isProjector: true,
      lightHours: result.lightHours,
      manufacturer: "Sony",
      model: result.identity.model ?? "Sony projector",
      name: projector.name || result.identity.model || projector.host,
      power: result.power,
      protocol: result.protocol,
      serial: result.identity.serial ?? "",
      serialNumber: controller.serialNumber
    }],
    error: ""
  };
};

// Hide options the selected projector cannot use, using the `meta.requires` capability names from the options catalog.
const supports = (device, meta) => {

  if(!device?.capabilities || !meta?.requires) { return true; }
  const capability = device.capabilities[meta.requires];

  return Array.isArray(capability) ? capability.length > 0 : capability === true;
};

const statRow = (label, value) => {

  const item = document.createElement("div");
  const labelSpan = document.createElement("span");
  const valueSpan = document.createElement("span");

  item.className = "stat-item";
  labelSpan.className = "stat-label";
  valueSpan.className = "stat-value";
  labelSpan.textContent = label;
  valueSpan.textContent = value ?? "";
  item.append(labelSpan, valueSpan);

  return item;
};

const infoPanel = ({ device, panel }) => {

  if(!device) {

    panel.textContent = "";

    return;
  }

  const grid = document.createElement("div");

  grid.className = "device-stats-grid";
  grid.append(

    statRow("Model", device.model),
    statRow("Serial", device.serial || "Unknown"),
    statRow("Protocol", String(device.protocol ?? "").toUpperCase()),
    statRow("Power", device.power),
    statRow("Lamp hours", ((device.lightHours === null) || (device.lightHours === undefined)) ? "Unknown" : String(device.lightHours))
  );

  panel.replaceChildren(grid);
};

const ui = new webUi({

  featureOptions: {

    getControllers,
    getDevices,
    infoPanel,
    sidebar: { controllerLabel: "Projectors", deviceLabel: "Projector" },
    ui: {

      controllerRetryEnableDelayMs: 5000,
      isController: (device) => device?.isProjector === true,
      validOption: (device, option) => supports(device, option.meta),
      validOptionCategory: (device, category) => supports(device, category.meta)
    }
  },
  firstRun,
  name: "Sony Projector Unified"
});

await ui.show();

// Connection testing does not commit configuration or issue any projector setters.
let testProfiles = [];

try {

  const blocks = await homebridge.getPluginConfig();

  testProfiles = blocks.flatMap((block) => projectors(block));
} catch { /* A new installation can still test a manually entered address. */ }
const selectProfile = field("testProfile");

for(const [ index, profile ] of testProfiles.entries()) {

  const option = document.createElement("option");

  option.value = String(index);
  option.textContent = profile.name || profile.host;
  selectProfile.append(option);
}
const loadTestProfile = () => {

  const profile = testProfiles[Number(selectProfile.value)] || {};

  field("testHost").value = profile.host || "";
  field("testUsername").value = profile.username || "root";
  field("testPassword").value = profile.password ?? "Projector";
};

selectProfile.addEventListener("change", loadTestProfile);
loadTestProfile();
field("testConnection").addEventListener("click", async () => {

  const button = field("testConnection");
  const resultNode = field("connectionResult");
  const profile = testProfiles[Number(selectProfile.value)] || {};

  button.disabled = true;
  resultNode.textContent = "正在连接 / Connecting…";
  try {

    const result = await homebridge.request("/probe", {

      ...profile, host: field("testHost").value.trim(), password: field("testPassword").value, username: field("testUsername").value.trim() || "root"
    });

    resultNode.textContent = result?.ok ?
      "连接成功 / Connected: " + (result.identity.model || "Sony") + " · " + (result.identity.firmware || "") + " · " + result.protocol + " · " + result.power :
      (result?.code || "Error") + ": " + (result?.message || "连接失败") + " " + (result?.hint || "");
  } catch {

    resultNode.textContent = "连接失败，请检查地址、认证设置和网络 / Connection failed. Check address, authentication and network.";
  } finally {

    button.disabled = false;
  }
});
