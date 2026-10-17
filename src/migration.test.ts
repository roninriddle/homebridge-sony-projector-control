import assert from "node:assert/strict";
import { migrateConfig } from "../scripts/migrate-config.mjs";
import { parseConfig } from "./config.ts";
// Pure offline helper is also used by the distribution CLI.
import { test } from "node:test";

test("Steven migration preserves control choices without carrying bridge pairing identity", () => {

  const source = { _bridge: { username: "TEST" }, enableBrightness: true,
    enableHdrSelector: false, inputs: [{ adcp: "hdmi1", id: 1, name: "Player"
    }], ip: "192.0.2.1", password: "test-only", platform: "SonyProjector", useAuth: true
  };
  const before = JSON.stringify(source);
  const result = migrateConfig(source);

  assert.equal(result.config.projectors[0]?.password, "test-only");
  assert.equal(result.config["_bridge"], undefined);
  assert.ok(result.config.options.includes("Enable.Controls.Brightness.sony-1"));
  assert.ok(!result.config.options.some((option: string) => option.includes("HDR")));
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(parseConfig(result.config).issues, []);
});

test("Kerem and Shivanath configurations can be combined and unknown platforms are rejected", () => {

  const { config } = migrateConfig({ platforms: [
    { companionSwitches: "pictureModes", host: "one", pictureModes: [{ mode: "game" }], platform: "SonyADCPProjector"
    },
    { options: ["Enable.Sensors.Ready"], platform: "SonyProjectors", projectors: [{ host: "two", protocol: "sdcp" }]
    }
  ] });

  assert.equal(config.projectors.length, 2);
  assert.equal(config.projectors[1]?.protocol, "sdcp");
  assert.ok(config.options.includes("Enable.Sensors.Ready"));
  assert.throws(() => migrateConfig({ platform: "Other" }));
});
