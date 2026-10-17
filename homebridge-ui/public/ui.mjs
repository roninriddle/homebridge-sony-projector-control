/* Native bilingual settings keep the current edit, feature scopes and Homebridge-owned pairing metadata intact. */
import { FeatureOptions, scopeSafeId } from "homebridge-plugin-utils/featureOptions.js";
import { HOST_PATTERN, ID_PATTERN, probeErrorKey, probeSettings, validateSettings } from "./settings-model.mjs";
import { messages, selectLanguage } from "./i18n.mjs";
const app = document.getElementById("controlApp");

// Retire listeners from the previous settings implementation as well as a reused native page.
globalThis.webUiPageEpoch?.abort();
const previous = globalThis.sonyControlEpoch;

previous?.abort();
const epoch = new AbortController();

globalThis.sonyControlEpoch = epoch;
globalThis.webUiPageEpoch = epoch;
const signal = epoch.signal;
let blocks;
let config;
let catalog;
let language;
let selected = 0;
let tab = "settings";
let scope = "";
let generation = 0;
let pendingProbe = 0;
let stageQueue = Promise.resolve();
let stageFailed = false;
let dirty = false;
let saving = false;
let staging = 0;
const results = new Map();
const capabilities = new Map();
const t = (key) => messages[language]?.[key] ?? messages.en[key] ?? key;
const listen = (node, event, handler) => node.addEventListener(event, handler, { signal });
const node = (tag, text, className) => {

  const item = document.createElement(tag);

  if(text !== undefined) {

    item.textContent = text;
  }

  if(className) {

    item.className = className;
  }

  return item;
};
const button = (text, action, className = "") => {

  const item = node("button", text, "spj-button " + className);

  item.type = "button";
  listen(item, "click", action);

  return item;
};
const deviceId = p => p.id && new RegExp(ID_PATTERN).test(p.id) ? p.id.toLowerCase() : scopeSafeId(String(p.host || "").trim().toLowerCase());
const valid = () => validateSettings(config).every(errors => Object.keys(errors).length === 0) && !app.querySelector("input:invalid");
const resize = () => homebridge.fixScrollHeight();

function refreshSaveState() {

  const ready = valid() && !saving && !staging;

  homebridge[ready ? "enableSaveButton" : "disableSaveButton"]();
  const save = document.getElementById("saveSettings");

  if(save) {

    save.disabled = !ready;
    save.textContent = t(saving ? "saving" : "save");
  }
  const status = document.getElementById("saveStatus");

  if(status) {

    status.textContent = dirty ? t("unsaved") : "";
  }
}

// Serialize host staging so an older change cannot overwrite a later keystroke or language selection.
function stage() {

  dirty = true;
  refreshSaveState();

  if(!valid()) {

    return;
  }
  staging++;
  refreshSaveState();
  const snapshot = globalThis.structuredClone(blocks);

  stageQueue = stageQueue.then(async () => {

    if(signal.aborted) {

      return;
    }
    try {

      await homebridge.updatePluginConfig(snapshot);
      stageFailed = false;
    } catch {

      stageFailed = true;

      if(!signal.aborted) {

        document.getElementById("saveStatus").textContent = t("saveError");
      }
    } finally {

      staging--;

      if(!signal.aborted) {

        refreshSaveState();
      }
    }
  });
}

function select(items, value, label, change, id) {

  const input = node("select", undefined, "spj-input");

  if(id) {

    input.id = id;
  }
  input.setAttribute("aria-label", label);

  for(const [ v, text ] of items) {

    const option = node("option", text);

    option.value = v;
    input.append(option);
  }
  input.value = value;
  listen(input, "change", () => change(input.value));

  return input;
}

function field(key, input, hint) {

  const label = node("label", undefined, "spj-field");

  label.append(node("span", t(key)), input);

  if(hint) {

    label.append(node("small", t(hint), "spj-hint"));
  }

  return label;
}

function changed(p, key, value, input) {

  if(key.startsWith("capabilities.")) {

    p.capabilities ??= {};
    const name = key.split(".")[1];

    if(value === undefined) {

      delete p.capabilities[name];
    } else {

      p.capabilities[name] = value;
    }
  } else if(value === undefined) {

    delete p[key];
  } else {

    p[key] = value;
  }
  generation++;
  results.delete(selected);
  capabilities.delete(deviceId(p));
  const report = document.getElementById("connectionResult");

  if(report) {

    report.replaceChildren();
  }
  showValidation(input);
  stage();
}

function showValidation(input) {

  const errors = validateSettings(config)[selected] || {};

  for(const control of app.querySelectorAll("[data-setting]")) {

    const key = control.dataset.setting;
    const error = errors[key];

    control.setAttribute("aria-invalid", String(Boolean(error) || !control.checkValidity()));
    const message = document.getElementById("error-" + key);

    if(message) {

      message.textContent = error ? t(error) : control.checkValidity() ? "" : t("validationNumber");
    }
  }
  const test = document.getElementById("testConnection");

  if(test) {

    test.disabled = Boolean(pendingProbe) || (Object.keys(errors).length > 0) || Boolean(app.querySelector("input:invalid"));
  }

  if(input) {

    refreshSaveState();
  }
}

function inputField(p, key, { type = "text", placeholder, hint, min, max, pattern, required = false } = {}) {

  const input = node("input", undefined, "spj-input");

  input.type = type;
  input.id = "setting-" + key;
  input.dataset.setting = key;
  input.value = p[key] ?? "";
  input.autocomplete = key === "password" ? "current-password" : key === "username" ? "username" : "off";
  input.required = required;

  if(placeholder !== undefined) {

    input.placeholder = String(placeholder);
  }

  if(min !== undefined) {

    input.min = String(min);
  }

  if(max !== undefined) {

    input.max = String(max);
  }

  if(type === "number") {

    input.step = "1";
    input.inputMode = "numeric";
  }

  if(pattern) {

    input.pattern = pattern;
  }
  input.setAttribute("aria-label", t(key));
  input.setAttribute("aria-describedby", "error-" + key);
  listen(input, "input", () => changed(p, key, (input.value === "") && (type === "number") ? undefined : type === "number" ?
    Number(input.value) : input.value, input));
  const wrapper = field(key, input, hint);
  const error = node("div", undefined, "spj-error");

  error.id = "error-" + key;
  error.setAttribute("aria-live", "polite");
  wrapper.append(error);

  return wrapper;
}

function choiceField(p, key, items, fallback, hint, targetKey = key) {

  const input = select(items, p[targetKey] ?? fallback, t(key), value => changed(p, targetKey, value, input), "setting-" + key);

  input.dataset.setting = targetKey;
  const wrapper = field(key, input, hint);
  const error = node("div", undefined, "spj-error");

  error.id = "error-" + key;
  wrapper.append(error);

  return wrapper;
}

function checkField(p, key, hint) {

  const input = node("input");

  input.type = "checkbox";
  input.checked = p[key] === true;
  listen(input, "change", () => changed(p, key, input.checked, input));
  const label = node("label", undefined, "spj-check");

  label.append(input, node("span", t(key)));
  const wrapper = node("div");

  wrapper.append(label);

  if(hint) {

    wrapper.append(node("p", t(hint), "spj-hint"));
  }

  return wrapper;
}

function details(title) {

  const section = node("details", undefined, "spj-section");

  section.append(node("summary", t(title)));
  listen(section, "toggle", resize);

  return section;
}

function passwordField(p) {

  const wrapper = inputField(p, "password", { hint: "passwordHint", placeholder: "Projector", type: "password" });
  const input = wrapper.querySelector("input");

  if(p.password === undefined) {

    input.value = "Projector";
  }
  const group = node("div", undefined, "spj-password");
  const toggle = button(t("showPassword"), () => {

    const revealed = input.type === "password";

    input.type = revealed ? "text" : "password";
    toggle.textContent = t(revealed ? "hidePassword" : "showPassword");
    toggle.setAttribute("aria-pressed", String(revealed));
  });

  toggle.id = "togglePassword";
  toggle.setAttribute("aria-pressed", "false");
  toggle.setAttribute("aria-controls", input.id);
  input.replaceWith(group);
  group.append(input, toggle);

  return wrapper;
}

function renderProbeResult(result) {

  const panel = document.getElementById("connectionResult");

  if(!panel || !result) {

    return;
  }
  panel.replaceChildren();

  if(result.waiting) {

    panel.textContent = t("testing");

    return;
  }

  if(!result.ok) {

    panel.textContent = t(probeErrorKey(result.code)) + (result.code ? " (" + result.code + ")" : "");

    return;
  }
  panel.append(node("strong", t("connected")));
  const grid = node("div", undefined, "spj-stats");

  for(const [ key, value ] of [ [ "model", result.identity.model ], [ "firmware", result.identity.firmware ], [ "protocol",
    result.protocol?.toUpperCase() ], [ "power", t(result.power || "unknown") ], [ "lampHours", result.lightHours ?? t("unknown") ] ]) {

    grid.append(node("div", t(key) + ": " + (value ?? t("unknown"))));
  }
  panel.append(grid);
  resize();
}

async function testConnection() {

  const p = config.projectors[selected];
  const prepared = probeSettings(p);

  if(prepared.errors) {

    showValidation();

    return;
  }
  const index = selected;
  const ownGeneration = ++generation;
  const ticket = ++pendingProbe;

  results.set(index, { waiting: true });
  renderProbeResult(results.get(index));
  showValidation();
  try {

    const result = await homebridge.request("/probe", prepared.settings);

    if(signal.aborted || (generation !== ownGeneration)) {

      return;
    }
    results.set(index, result);

    if(result?.ok) {

      capabilities.set(deviceId(p), result.capabilities);
    }

    if((tab === "settings") && (index === selected)) {

      renderProbeResult(result);
    }
  } catch {

    if((generation === ownGeneration) && !signal.aborted) {

      results.set(index, { code: "SPJ-NET-UNREACHABLE", ok: false });
      renderProbeResult(results.get(index));
    }
  } finally {

    if(ticket === pendingProbe) {

      pendingProbe = 0;
    }

    if((generation !== ownGeneration) && results.get(index)?.waiting) {

      results.delete(index);

      if((tab === "settings") && (index === selected)) {

        document.getElementById("connectionResult")?.replaceChildren();
      }
    }

    if(!signal.aborted) {

      showValidation();
    }
  }
}

function renderOverrides(p, section) {

  const overrides = details("overrides");

  overrides.append(node("p", t("overridesHint"), "spj-hint"));

  for(const key of [ "inputs", "pictureModes", "aspects", "hdrModes", "testPatterns" ]) {

    const input = node("input", undefined, "spj-input");
    const full = "capabilities." + key;

    input.value = (p.capabilities?.[key] || []).join(", ");
    input.dataset.setting = full;
    listen(input, "input", () => changed(p, full, input.value.trim() ? input.value.split(",").map(v => v.trim()) : undefined, input));
    const wrapper = field(key, input, "tokensHint");
    const error = node("div", undefined, "spj-error");

    error.id = "error-" + full;
    wrapper.append(error);
    overrides.append(wrapper);
  }

  for(const key of [ "brightness", "contrast", "blank", "faults", "lightHours", "remote" ]) {

    const input = select([ [ "auto", t("discover") ], [ "true", t("supported") ], [ "false", t("unsupported") ] ],
      p.capabilities?.[key] === undefined ? "auto" : String(p.capabilities[key]), t(key), value => changed(p, "capabilities." + key,
        value === "auto" ? undefined : value === "true", input));

    overrides.append(field(key, input));
  }
  section.append(overrides);
}

function renderSettings(body) {

  const toolbar = node("div", undefined, "spj-toolbar");

  toolbar.append(select(config.projectors.map((p, i) => [ String(i), p.name || t("projector") + " " + (i + 1) ]), String(selected),
    t("projector"), value => { selected = Number(value); generation++; render(); }, "projectorSelect"));
  toolbar.append(button(t("add"), () => {

    config.projectors.push({ autoPowerOn: false, host: "", id: "projector-" + Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)),
      n => n.toString(16).padStart(2, "0")).join(""), name: t("projector"), password: "Projector", protocol: "auto", username: "root" });
    selected = config.projectors.length - 1;
    generation++;
    render();
    stage();
  }));
  body.append(toolbar);
  const p = config.projectors[selected];

  if(!p) {

    body.append(node("p", t("noProfiles")));

    return;
  }
  const connection = node("section");

  connection.id = "projectorSettings";
  connection.append(inputField(p, "name"), inputField(p, "host", { pattern: HOST_PATTERN, placeholder: "192.0.2.10", required: true }),
    inputField(p, "username", { placeholder: "root" }), passwordField(p));
  const test = button(t("test"), testConnection, "spj-primary");

  test.id = "testConnection";
  connection.append(test, node("p", t("testHint"), "spj-hint"));
  const report = node("div", undefined, "spj-result");

  report.id = "connectionResult";
  report.setAttribute("role", "status");
  connection.append(report);
  const advanced = details("advanced");

  advanced.append(choiceField(p, "protocol", [ [ "auto", t("auto") ], [ "adcp", t("adcp") ], [ "sdcp", t("sdcp") ] ], "auto"), inputField(p,
    "port", { hint: "portHint", max: 65535, min: 1, placeholder: p.protocol === "sdcp" ? 53484 : 53595, type: "number" }), inputField(p,
    "pollInterval", { max: 300, min: 3, placeholder: 10, type: "number" }), inputField(p, "community", { placeholder: "SONY" }), inputField(p,
    "id", { hint: "idHint", pattern: ID_PATTERN }), choiceField(p, "accessoryLanguage", [ [ "en", "English" ], [ "zh-CN", "简体中文" ] ], p.language ||
    "en", "accessoryLanguageHint", "language"));
  advanced.append(choiceField(p, "inputSource", [ [ "hdmi", t("hdmi") ], [ "pictureModes", t("pictureModes") ] ], "hdmi"), checkField(p,
    "autoPowerOn", "autoPowerHint"), inputField(p, "readyTimeout", { max: 300, min: 10, placeholder: 120, type: "number" }));
  renderOverrides(p, advanced);
  connection.append(advanced);
  connection.append(button(t("remove"), () => {

    if(!window.confirm(t("removeConfirm"))) {

      return;
    }
    config.projectors.splice(selected, 1);
    selected = Math.max(0, selected - 1);
    results.clear();
    capabilities.clear();
    generation++;
    render();
    stage();
  }, "spj-danger"));
  body.append(connection);
  const additional = details("additional");

  additional.append(inputField(config, "name"), checkField(config, "debug", "debugHint"));
  const platformLabel = additional.querySelector("label > span");

  platformLabel.textContent = t("platformName");
  body.append(additional);
}

function renderFeatures(body) {

  const profiles = config.projectors;

  if(scope && !profiles.some(p => deviceId(p) === scope)) {

    scope = "";
  }
  const chooser = select([ [ "", t("all") ], ...profiles.map(p => [ deviceId(p), p.name || p.host ]) ], scope, t("scope"),
    value => { scope = value; render(); }, "featureScope");

  body.append(field("scope", chooser), node("p", t("capabilityHint"), "spj-hint"));
  const engine = new FeatureOptions(catalog.categories, catalog.options, config.options || []);
  const caps = capabilities.get(scope);

  for(const category of catalog.categories) {

    const section = node("section", undefined, "spj-section");

    section.append(node("h2", messages[language].categories[category.name]));

    for(const option of catalog.options[category.name] || []) {

      const required = option.meta?.requires;

      if(caps && required && (Array.isArray(caps[required]) ? !caps[required].length : caps[required] !== true)) {

        continue;
      }
      const key = engine.expandOption(category.name, option.name);
      const copy = messages[language].options[key] || messages.en.options[key];
      const row = node("div", undefined, "spj-option");
      const on = engine.test(key, scope || undefined);

      row.append(node("h3", copy[0]), node("p", copy[1], "spj-hint"));
      const set = (mode, value) => {

        if(mode === "inherit") {

          engine.clearOption({ option: key, ...(scope ? { id: scope } : {}) });
        } else {

          engine.setOption({ enabled: mode === "enabled", option: key, ...(scope ? { id: scope } : {}), ...(option.choices ? { value:
            value ?? engine.value(key, scope || undefined) ?? option.defaultValue } : {}) });
        }
        config.options = engine.configuredOptions;
        stage();
        render();
      };
      const state = !engine.exists(key, scope || undefined) ? "inherit" : on ? "enabled" : "disabled";

      row.append(select([ [ "inherit", t("inherit") ], [ "enabled", t("enabled") ], [ "disabled", t("disabled") ] ], state, copy[0],
        value => set(value), "option-" + key));

      if(Array.isArray(option.choices)) {

        const value = engine.value(key, scope || undefined) ?? option.defaultValue;

        row.append(select(option.choices.map(c => [ String(c.value), messages[language].choices[c.value] || c.label ]), String(value),
          copy[0] + " " + t("effectiveValue"), selectedValue => set("enabled", selectedValue), "value-" + key));
      }
      row.append(node("p", t(on ? "effectiveOn" : "effectiveOff"), "spj-status"));
      section.append(row);
    }

    if(section.children.length > 1) {

      body.append(section);
    }
  }
}

function renderHelp(body) {

  body.classList.add("spj-help");

  for(const key of [ "setupHelp", "pairingHelp", "sensorHelp", "backupHelp" ]) {

    body.append(node("p", t(key)));
  }
  const base = "https://github.com/roninriddle/homebridge-sony-projector-unified";

  for(const [ key, suffix ] of [ [ "guide", language === "zh-CN" ? "/blob/main/README.zh-CN.md" : "#readme" ], [ "automations",
    "/blob/main/docs/RemoteAndAutomations.md" ], [ "troubleshooting", "/blob/main/docs/Troubleshooting.md" ], [ "featureGuide",
    "/blob/main/docs/FeatureOptions.md" ], [ "security", "/blob/main/docs/Security.md" ], [ "report", "/issues/new/choose" ], [ "release", "/releases" ] ]) {

    const link = node("a", t(key));

    link.href = base + suffix;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const p = node("p");

    p.append(link);
    body.append(p);
  }
}

async function save() {

  if(!valid()) {

    showValidation();

    return;
  }
  saving = true;
  stage();
  refreshSaveState();
  try {

    await stageQueue;
    signal.throwIfAborted();

    if(stageFailed) {

      throw new Error("Staging failed");
    }
    await homebridge.savePluginConfig();
    signal.throwIfAborted();
    dirty = false;
    homebridge.toast.success(t("saved"));
  } catch {

    if(!signal.aborted) {

      homebridge.toast.error(t("saveError"));
    }
  } finally {

    saving = false;

    if(!signal.aborted) {

      refreshSaveState();
    }
  }
}

function render() {

  document.documentElement.lang = language;
  app.replaceChildren();
  const header = node("header", undefined, "spj-header");
  const logo = node("img", undefined, "spj-logo");

  logo.src = "./projector.svg";
  logo.alt = t("projector");
  const title = node("div");

  title.append(node("h1", t("title")), node("p", t("intro")));
  header.append(logo, title);
  const chooseLanguage = select([ [ "zh-CN", "简体中文" ], [ "en", "English" ] ], language, t("language"), value => {

    language = value;
    config.uiLanguage = value;
    try {

      globalThis.localStorage.setItem("sony-projector-control.language", value);
    } catch { /* Config remains the durable preference. */ }
    render();
    stage();
  }, "uiLanguage");
  const label = field("language", chooseLanguage);

  label.classList.add("spj-language");
  header.append(label);
  app.append(header);
  const tabs = node("nav", undefined, "spj-tabs");

  tabs.setAttribute("role", "tablist");

  for(const key of [ "settings", "features", "help" ]) {

    const item = button(t(key), () => { tab = key; render(); });

    item.id = "menu-" + key;
    item.setAttribute("role", "tab");
    item.setAttribute("aria-selected", String(tab === key));
    tabs.append(item);
  }
  app.append(tabs);
  const body = node("div");

  body.setAttribute("role", "tabpanel");
  body.id = "page-" + tab;

  if(tab === "settings") {

    renderSettings(body);
  } else if(tab === "features") {

    renderFeatures(body);
  } else {

    renderHelp(body);
  }
  app.append(body);

  if(tab === "settings") {

    renderProbeResult(results.get(selected));
  }
  const footer = node("div", undefined, "spj-footer");
  const saveButton = button(t("save"), save, "spj-primary");

  saveButton.id = "saveSettings";
  const status = node("span", undefined, "spj-status");

  status.id = "saveStatus";
  status.setAttribute("role", "status");
  footer.append(saveButton, status);
  app.append(footer);
  app.setAttribute("aria-busy", "false");
  showValidation();
  refreshSaveState();
  resize();
}
try {

  homebridge.hideSchemaForm();
  const [ current, options ] = await Promise.all([ homebridge.getPluginConfig(), homebridge.request("/getOptions") ]);

  signal.throwIfAborted();
  blocks = globalThis.structuredClone(current.length ? current : [{ name: "Sony Projector Control", options: [], platform:
    "SonyProjectorUnified", projectors: [] }]);
  config = blocks[0];
  config.projectors ??= [];
  catalog = options;
  let savedLanguage;

  try {

    savedLanguage = globalThis.localStorage.getItem("sony-projector-control.language");
  } catch { /* Browser storage can be unavailable. */ }
  language = selectLanguage(config.uiLanguage || savedLanguage, homebridge.server?.env?.lang || globalThis.navigator.language);

  if(!config.projectors.length) {

    config.projectors.push({ autoPowerOn: false, host: "", id: "projector-" + Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)),
      n => n.toString(16).padStart(2, "0")).join(""),
    name: t("projector"), password: "Projector", protocol: "auto", username: "root" });
  }
  render();
} catch {

  if(!signal.aborted) {

    app.replaceChildren(node("p", messages[language || "en"].loadError, "spj-error"));
  }
} finally {

  if(!signal.aborted) {

    homebridge.hideSpinner();
    globalThis.webUiBoot?.ready();
  }
}
