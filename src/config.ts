/* config.ts: Turn the raw platform config into validated projector settings.
 *
 * Parsing never throws. A bad entry is skipped or corrected, and each problem becomes a sentence in `issues` that the platform logs, so a typo in config.json
 * produces a clear message instead of a crash loop.
 */
import type { Capabilities, ProtocolPreference } from "./protocol/types.ts";
import { DEFAULTS, LIMITS } from "./settings.ts";
import { sanitizeName, scopeSafeId, validateName } from "homebridge-plugin-utils";

export interface ProjectorConfig {

  autoPowerOn?: boolean;
  capabilityOverrides?: Partial<Capabilities>;
  adcpPort: number;
  community: string;
  host: string;

  // Explicit stable id is recommended; the host is the backwards-compatible fallback.
  id: string;
  inputSource?: "hdmi" | "pictureModes";
  language?: "en" | "zh-CN";
  name: string;
  password: string;
  pollIntervalSeconds: number;
  protocol: ProtocolPreference;
  readyTimeoutSeconds?: number;
  sdcpPort: number;
  username?: string;
}

export interface ParsedConfig {

  debug: boolean;
  issues: string[];
  options: string[];
  projectors: ProjectorConfig[];
}

const PROTOCOLS = new Set<string>([ "adcp", "auto", "sdcp" ]);

// Hostnames, IPv4 and bracket-free IPv6 addresses.
const HOST = /^[A-Za-z0-9](?:[A-Za-z0-9.:-]{0,251}[A-Za-z0-9])?$/;

function isRecord(value: unknown): value is Record<string, unknown> {

  return (typeof value === "object") && (value !== null) && !Array.isArray(value);
}

function parseProjector(raw: unknown, index: number, issues: string[]): ProjectorConfig | null {

  const label = "Projector #" + String(index + 1);

  if(!isRecord(raw)) {

    issues.push(label + " is not a settings object and was skipped.");

    return null;
  }

  const rawName = (typeof raw["name"] === "string") ? raw["name"] : "";
  const described = rawName.trim() ? label + " (" + rawName.trim() + ")" : label;
  const host = (typeof raw["host"] === "string") ? raw["host"].trim() : "";

  if(!host) {

    issues.push(described + " has no host (IP address or hostname) and was skipped.");

    return null;
  }

  if(!HOST.test(host)) {

    issues.push(described + ": " + JSON.stringify(host) + " is not a valid IP address or hostname. The projector was skipped.");

    return null;
  }

  const sanitized = sanitizeName(rawName);
  const name = validateName(sanitized) ? sanitized : "Projector";

  let protocol: ProtocolPreference = "auto";

  if(raw["protocol"] !== undefined) {

    if((typeof raw["protocol"] === "string") && PROTOCOLS.has(raw["protocol"])) {

      protocol = raw["protocol"] as ProtocolPreference;
    } else {

      issues.push(described + ": protocol " + JSON.stringify(raw["protocol"]) + " is not one of auto, adcp or sdcp. Using auto.");
    }
  }

  let adcpPort: number = DEFAULTS.adcpPort;
  let sdcpPort: number = DEFAULTS.sdcpPort;

  if(raw["port"] !== undefined) {

    const port = raw["port"];

    if(!Number.isInteger(port) || ((port as number) < 1) || ((port as number) > 65535)) {

      issues.push(described + ": port " + JSON.stringify(port) + " is not a valid TCP port. Using the protocol's default port.");
    } else if(protocol === "auto") {

      issues.push(described + ": a custom port needs an explicit protocol (adcp or sdcp). Using the default ports.");
    } else if(protocol === "adcp") {

      adcpPort = port as number;
    } else {

      sdcpPort = port as number;
    }
  }

  let community: string = DEFAULTS.community;

  if(raw["community"] !== undefined) {

    if((typeof raw["community"] === "string") && /^[\x20-\x7e]{4}$/.test(raw["community"])) {

      community = raw["community"];
    } else {

      issues.push(described + ": the SDCP community must be exactly 4 letters or digits. Using SONY.");
    }
  }

  let pollIntervalSeconds: number = DEFAULTS.pollIntervalSeconds;

  if(raw["pollInterval"] !== undefined) {

    const requested = Number(raw["pollInterval"]);

    pollIntervalSeconds = Number.isFinite(requested) ? Math.min(LIMITS.maxPollIntervalSeconds, Math.max(LIMITS.minPollIntervalSeconds, Math.round(requested))) :
      DEFAULTS.pollIntervalSeconds;

    if(pollIntervalSeconds !== requested) {

      issues.push(described + ": poll interval " + JSON.stringify(raw["pollInterval"]) + " is outside " + String(LIMITS.minPollIntervalSeconds) + "-" +
        String(LIMITS.maxPollIntervalSeconds) + " seconds. Using " + String(pollIntervalSeconds) + ".");
    }
  }

  let id = scopeSafeId(host.toLowerCase());

  if(raw["id"] !== undefined) {

    if((typeof raw["id"] === "string") && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(raw["id"])) {

      id = raw["id"].toLowerCase();
    } else {

      issues.push(described + ": id must contain 1-64 letters, digits, underscores or hyphens. Using host identity.");
    }
  }
  const extra: Partial<ProjectorConfig> = {};

  if(raw["autoPowerOn"] === true) { extra.autoPowerOn = true; }

  if(raw["language"] === "zh-CN") { extra.language = "zh-CN"; }

  if(raw["inputSource"] === "pictureModes") { extra.inputSource = "pictureModes"; }

  if(raw["readyTimeout"] !== undefined) {

    const requested = Number(raw["readyTimeout"]);

    extra.readyTimeoutSeconds = Number.isFinite(requested) ? Math.min(300, Math.max(10, Math.round(requested))) : 120;
  }

  if(isRecord(raw["capabilities"])) {

    const overrides: Partial<Capabilities> = {};

    for(const key of [ "inputs", "pictureModes", "aspects", "hdrModes", "testPatterns" ] as const) {

      const values = raw["capabilities"][key];

      if(Array.isArray(values) && values.every((token) => (typeof token === "string") && /^[a-z0-9_.]+$/.test(token))) {

        overrides[key] = [...new Set(values as string[])];
      } else if(values !== undefined) {

        issues.push(described + ": invalid capability list " + key + " was ignored.");
      }
    }

    for(const key of [ "brightness", "contrast", "blank", "faults", "lightHours", "remote" ] as const) {

      if(typeof raw["capabilities"][key] === "boolean") { overrides[key] = raw["capabilities"][key]; }
    }
    extra.capabilityOverrides = overrides;
  }

  return {

    adcpPort, community, host, id, name, password: (typeof raw["password"] === "string") ? raw["password"] : "Projector",
    pollIntervalSeconds, protocol, sdcpPort, username: (typeof raw["username"] === "string") && raw["username"].trim() ? raw["username"].trim() : "root", ...extra
  };
}

export function parseConfig(raw: unknown): ParsedConfig {

  const config = isRecord(raw) ? raw : {};
  const issues: string[] = [];
  const projectors: ProjectorConfig[] = [];
  const seen = new Set<string>();
  const hosts = new Set<string>();
  const entries = Array.isArray(config["projectors"]) ? config["projectors"] as unknown[] : [];

  entries.forEach((entry, index) => {

    const projector = parseProjector(entry, index, issues);

    if(!projector) {

      return;
    }

    if(seen.has(projector.id) || hosts.has(projector.host.toLowerCase())) {

      issues.push("Projector #" + String(index + 1) + " (" + projector.host + ") is configured more than once. Only the first entry is used.");

      return;
    }

    seen.add(projector.id);
    hosts.add(projector.host.toLowerCase());
    projectors.push(projector);
  });

  const options = Array.isArray(config["options"]) ? (config["options"] as unknown[]).filter((option): option is string => typeof option === "string") : [];

  return { debug: config["debug"] === true, issues, options, projectors };
}
