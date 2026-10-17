// Offline conversion only. Never installs, pairs or modifies the source file.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const FLAGS = {
  enableBlankScreen: "Controls.PictureMute", enableBrightness: "Controls.Brightness", enableContrast: "Controls.Contrast",
  enablePictureModes: "Picture.Switches", enableHdrSelector: "Controls.HDR", enableTestPatterns: "Controls.TestPatterns",
  enableLampHoursSensor: "Sensors.Hours", enableErrorSensor: "Sensors.Fault", matterPower: "Controls.MatterPower"
};

export function migrateConfig(input) {
  const candidates = Array.isArray(input?.platforms) ? input.platforms : Array.isArray(input) ? input : [input];
  const sources = candidates.filter((entry) => [ "SonyProjector", "SonyADCPProjector", "SonyProjectors", "SonyProjectorUnified" ].includes(entry?.platform));
  if(!sources.length) throw new Error("No supported Sony platform configuration found.");
  const projectors = [];
  const options = [];
  const seen = new Set();
  const warnings = ["Re-pair each new television and rebuild its scenes. Preserve a backup of the old configuration; do not run both controllers on one projector."];
  for(const source of sources) {
    if([ "SonyProjectors", "SonyProjectorUnified" ].includes(source.platform)) {
      for(const entry of source.projectors ?? []) {
        if(seen.has(entry.host)) throw new Error("Duplicate projector host in migration input.");
        seen.add(entry.host);
        projectors.push({ ...entry });
      }
      options.push(...(source.options ?? []));
      continue;
    }
    const host = source.host || source.ip;
    if(typeof host !== "string" || !host.trim()) throw new Error("A source projector has no host/IP.");
    if(seen.has(host)) throw new Error("Duplicate projector host in migration input.");
    seen.add(host);
    const id = "sony-" + String(projectors.length + 1);
    const entry = { id, name: source.name || "Sony Projector", host, protocol: "adcp", autoPowerOn: false,
      pollInterval: source.pollingInterval ?? source.pollInterval ?? 30 };
    const port = source.adcpPort ?? source.port;
    if(port) entry.port = port;
    if(source.password && source.useAuth !== false) entry.password = source.password;
    if(source.inputSource === "pictureModes") entry.inputSource = "pictureModes";
    const capabilities = {};
    for(const [key,list,field] of [
      [ "inputs", source.hdmiInputs ?? source.inputs, source.hdmiInputs ? "input" : "adcp" ],
      [ "pictureModes", source.pictureModes, source.platform === "SonyProjector" ? "code" : "mode" ],
      [ "hdrModes", source.hdrModes, "code" ], [ "testPatterns", source.testPatterns, "code" ]
    ]) {
      if(Array.isArray(list) && list.length) {
        const tokens = list.map((item) => typeof item === "string" ? item : item?.[field]);
        if(!tokens.every((token) => typeof token === "string" && /^[a-z0-9_.]{1,64}$/.test(token))) {
          warnings.push("Skipped invalid " + key + " list for " + entry.name + "; check tokens against the projector.");
        } else capabilities[key] = [...new Set(tokens)];
      }
    }
    if(Object.keys(capabilities).length) entry.capabilities = capabilities;
    for(const [flag,option] of Object.entries(FLAGS)) {
      if(source[flag] === true) options.push("Enable." + option + "." + id);
    }
    const switches = source.companionSwitches === "auto" ? (source.inputSource === "pictureModes" ? "hdmiInputs" : "pictureModes") : source.companionSwitches;
    if(switches === "pictureModes") options.push("Enable.Picture.Switches." + id);
    if(switches === "hdmiInputs") options.push("Enable.Inputs.Switches." + id);
    if(source.enablePolling === false) warnings.push("Polling is enabled in the new plugin because live status and automation sensors require it.");
    projectors.push(entry);
  }
  return { config: { platform: "SonyProjectorUnified", name: "Sony Projector Unified", projectors, options: [...new Set(options)] }, warnings };
}

if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, destination] = process.argv.slice(2);
  if(!source || !destination) throw new Error("Usage: node scripts/migrate-config.mjs old.json new.json");
  const result = migrateConfig(JSON.parse(readFileSync(source, "utf8")));
  // Do not print configuration or credentials. Refuse to overwrite any file.
  writeFileSync(destination, JSON.stringify(result.config, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  for(const warning of result.warnings) process.stderr.write(warning + "\n");
  process.stderr.write("Converted " + result.config.projectors.length + " projector(s). Source unchanged.\n");
}
