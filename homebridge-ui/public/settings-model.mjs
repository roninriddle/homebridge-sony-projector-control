/* Pure settings/probe preparation, shared by browser UI and regression tests. */
export const HOST_PATTERN = "^[A-Za-z0-9](?:[A-Za-z0-9.:-]{0,251}[A-Za-z0-9])?$";
export const ID_PATTERN = "^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$";
export const stableId = (p) => (typeof p.id === "string") && new RegExp(ID_PATTERN).test(p.id) ? p.id.toLowerCase() : String(p.host ||
  "").trim().toLowerCase().replace(/[.=]/g, "-");
export function validateProjector(p) {

  const errors = {};

  if(!new RegExp(HOST_PATTERN).test(String(p.host || "").trim())) {

    errors.host = "validationHost";
  }

  if((p.port !== undefined) && (p.port !== "")) {

    if(!Number.isInteger(Number(p.port)) || (Number(p.port) < 1) || (Number(p.port) > 65535)) {

      errors.port = "validationPort";
    } else if(![ "adcp", "sdcp" ].includes(p.protocol)) {

      errors.protocol = "validationProtocol";
    }
  }

  for(const [ key, min, max ] of [ [ "pollInterval", 3, 300 ], [ "readyTimeout", 10, 300 ] ]) {

    if((p[key] !== undefined) && (p[key] !== "") && (!Number.isInteger(Number(p[key])) || (Number(p[key]) < min) || (Number(p[key]) > max))) {

      errors[key] = "validationNumber";
    }
  }

  if(p.id && !new RegExp(ID_PATTERN).test(p.id)) {

    errors.id = "validationId";
  }

  if((p.community !== undefined) && !/^[\x20-\x7e]{4}$/.test(p.community)) {

    errors.community = "validationCommunity";
  }

  for(const key of [ "inputs", "pictureModes", "aspects", "hdrModes", "testPatterns" ]) {

    if(p.capabilities?.[key] && (!Array.isArray(p.capabilities[key]) || p.capabilities[key].some(v => !/^[a-z0-9_.]+$/.test(v)))) {

      errors["capabilities." + key] = "validationTokens";
    }
  }

  return errors;
}
export function validateSettings(config) {

  const hosts = new Set();
  const ids = new Set();

  return (config.projectors || []).map(p => {

    const errors = validateProjector(p);
    const host = String(p.host || "").trim().toLowerCase();
    const id = stableId(p);

    if(hosts.has(host) || ids.has(id)) {

      errors.host = "validationDuplicate";
    }
    hosts.add(host);
    ids.add(id);

    return errors;
  });
}
// A probe sees the current edit, not a snapshot of the saved connection. Empty passwords remain empty.
export function probeSettings(projector) {

  const errors = validateProjector(projector);

  if(Object.keys(errors).length) {

    return { errors };
  }
  const settings = globalThis.structuredClone(projector);

  settings.host = settings.host.trim();
  settings.username = String(settings.username || "").trim() || "root";
  settings.password ??= "Projector";

  for(const key of [ "port", "pollInterval", "readyTimeout" ]) {

    if((settings[key] === "") || (settings[key] === undefined)) {

      delete settings[key];
    } else {

      settings[key] = Number(settings[key]);
    }
  }

  return { settings };
}
export function probeErrorKey(code) {

  if(String(code).startsWith("SPJ-AUTH-")) { return "authError"; }

  if(String(code).startsWith("SPJ-NET-")) { return "networkError"; }

  if(code === "SPJ-CONFIG") { return "configError"; }

  if(code === "SPJ-COMMUNITY") { return "communityError"; }

  if(code === "SPJ-BUSY") { return "busyError"; }

  if(code === "SPJ-ABORTED") { return "cancelledError"; }

  return "protocolError";
}
