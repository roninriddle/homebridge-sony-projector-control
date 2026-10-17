/* companion.test.ts: Picture-mode and aspect switches, Picture Mute, and the automation sensors. */
import { after, describe, test } from "node:test";
import { capturingLog, waitUntil } from "homebridge-plugin-utils/testing";
import { featureOptionCategories, featureOptions } from "../options.ts";
import { CompanionAccessory } from "./companion.ts";
import type { FakeAdcpOptions } from "../protocol/fake-adcp.helpers.ts";
import { FeatureOptions } from "homebridge-plugin-utils";
import { ProjectorCache } from "./cache.ts";
import type { ProjectorConfig } from "../config.ts";
import { ProjectorController } from "./controller.ts";
import type { Service } from "homebridge";
import assert from "node:assert/strict";
import { createFakeApi } from "../fake-api.helpers.ts";
import { startFakeAdcp } from "../protocol/fake-adcp.helpers.ts";

const TIMINGS = { authPauseMs: 100, backoffCeilingMs: 50, faultsEveryMs: 0, lightHoursEveryMs: 0, pollMs: 30, standbyPollMs: 30, transitionPollMs: 20 };
const cleanups: (() => unknown)[] = [];

after(async () => Promise.all(cleanups.map(async (cleanup) => cleanup())));

async function rig(configured: string[], fakeOptions: FakeAdcpOptions = {}, overrides: Partial<ProjectorConfig> = {}) {

  const fake = await startFakeAdcp({ transitionMs: 40, ...fakeOptions });
  const fakeApi = createFakeApi();
  const abort = new AbortController();
  const log = capturingLog();
  const options = new FeatureOptions(featureOptionCategories, featureOptions, configured);
  const config: ProjectorConfig = { adcpPort: fake.port, community: "SONY", host: "127.0.0.1", id: "127-0-0-1", name: "Theater", password: "",
    pollIntervalSeconds: 10, protocol: "adcp", sdcpPort: 1, ...overrides };
  const controller = new ProjectorController({ config, isEnabled: (option) => options.test(option, config.id), log, pacingMs: 0, signal: abort.signal,
    timings: TIMINGS });
  const context = { api: fakeApi.api, cache: new ProjectorCache(fakeApi.storagePath, log), config, controller,
    enabled: (option: string) => options.test(option, config.id), log, value: (option: string) => options.value(option, config.id) };
  const accessory = new fakeApi.api.platformAccessory("Theater Controls", fakeApi.api.hap.uuid.generate("companion"));
  const companion = new CompanionAccessory(context, accessory);

  cleanups.push(() => abort.abort(), () => fakeApi.cleanup(), async () => fake.close());
  controller.start();

  const { Characteristic, Service: Services } = fakeApi.api.hap;
  const bySubtype = (subtype: string): Service | undefined => accessory.services.find((service) => service.subtype === subtype);

  return { Characteristic, Services, accessory, bySubtype, companion, context, controller, fake };
}

describe("CompanionAccessory", () => {

  test("is only wanted when at least one extra is enabled", async () => {

    const off = await rig([]);
    const on = await rig(["Enable.Sensors.Ready"]);

    assert.equal(CompanionAccessory.wanted(off.context), false);
    assert.equal(CompanionAccessory.wanted(on.context), true);
  });

  test("picture-mode switches select a mode and behave like radio buttons", async () => {

    const { Characteristic, bySubtype, controller, fake } = await rig(["Enable.Picture.Switches"], { state: { power: "on" } });

    await waitUntil(() => controller.store.get("pictureMode") === "cinema_film1", { description: "mode known", timeoutMs: 2000 });

    const game = bySubtype("picture.game")!;
    const film = bySubtype("picture.cinema_film1")!;

    assert.equal(game.getCharacteristic(Characteristic.ConfiguredName).value, "Game Mode");
    assert.equal(film.getCharacteristic(Characteristic.On).value, true);

    await game.getCharacteristic(Characteristic.On).handleSetRequest(true);

    assert.equal(fake.state.pictureMode, "game");
    assert.equal(game.getCharacteristic(Characteristic.On).value, true);
    assert.equal(film.getCharacteristic(Characteristic.On).value, false);

    // Turning the active mode off is not possible; the switch springs back.
    await game.getCharacteristic(Characteristic.On).handleSetRequest(false);
    await waitUntil(() => game.getCharacteristic(Characteristic.On).value === true, { description: "springs back", timeoutMs: 1000 });
    assert.equal(fake.state.pictureMode, "game");
  });

  test("aspect switches and Picture Mute", async () => {

    const { Characteristic, bySubtype, controller, fake } = await rig([ "Enable.Aspect.Switches", "Enable.Controls.PictureMute" ], { state: { power: "on" } });

    await waitUntil(() => controller.store.get("aspect") === "normal", { description: "aspect known", timeoutMs: 2000 });

    const zoom = bySubtype("aspect.2.35_1_zoom")!;

    assert.equal(zoom.getCharacteristic(Characteristic.ConfiguredName).value, "Aspect 2.35 Zoom");
    await zoom.getCharacteristic(Characteristic.On).handleSetRequest(true);
    await bySubtype("control.pictureMute")!.getCharacteristic(Characteristic.On).handleSetRequest(true);

    assert.equal(fake.state.aspect, "2.35_1_zoom");
    assert.equal(fake.state.blank, "on");
  });

  test("Ready and Cooling sensors follow power, and faults set StatusFault", async () => {

    const { Characteristic, bySubtype, controller, fake } = await rig([ "Enable.Sensors.Ready", "Enable.Sensors.Cooling" ]);
    const ready = bySubtype("sensor.ready")!;
    const cooling = bySubtype("sensor.cooling")!;
    const detected = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;

    await waitUntil(() => controller.store.get("power") === "standby", { description: "standby", timeoutMs: 2000 });
    assert.notEqual(ready.getCharacteristic(Characteristic.OccupancyDetected).value, detected);

    await controller.setPower(true);
    await waitUntil(() => ready.getCharacteristic(Characteristic.OccupancyDetected).value === detected, { description: "ready", timeoutMs: 2000 });

    fake.state.errors = ["err_temp"];
    await waitUntil(() => ready.getCharacteristic(Characteristic.StatusFault).value === Characteristic.StatusFault.GENERAL_FAULT,
      { description: "fault", timeoutMs: 2000 });

    await controller.setPower(false);
    await waitUntil(() => cooling.getCharacteristic(Characteristic.OccupancyDetected).value === detected, { description: "cooling", timeoutMs: 2000 });
    assert.notEqual(ready.getCharacteristic(Characteristic.OccupancyDetected).value, detected);
  });

  test("services for disabled options are removed", async () => {

    const { accessory, bySubtype, context } = await rig(["Enable.Sensors.Ready"]);

    assert.ok(bySubtype("sensor.ready"));

    const disabled = { ...context, enabled: (): boolean => false };

    new CompanionAccessory(disabled, accessory).configure();
    assert.equal(bySubtype("sensor.ready"), undefined);
  });

  test("sensors reject offline reads and never report cooling from a command prediction", async () => {

    const { Characteristic, bySubtype, controller } = await rig([ "Enable.Sensors.Ready", "Enable.Sensors.Cooling", "Enable.Sensors.Warming" ]);

    await waitUntil(() => controller.store.get("observedPower") === "standby", { description: "expected device state", timeoutMs: 2000 });
    const cooling = bySubtype("sensor.cooling")!.getCharacteristic(Characteristic.OccupancyDetected);
    const ready = bySubtype("sensor.ready")!.getCharacteristic(Characteristic.OccupancyDetected);
    const warming = bySubtype("sensor.warming")!.getCharacteristic(Characteristic.OccupancyDetected);

    controller.store.update({ power: "warming" });
    assert.equal(await warming.handleGetRequest(), 0);
    controller.store.update({ power: "cooling" });
    assert.equal(await cooling.handleGetRequest(), 0);
    controller.store.update({ reachable: false });
    await assert.rejects(async () => cooling.handleGetRequest());
    await assert.rejects(async () => ready.handleGetRequest());
    await assert.rejects(async () => warming.handleGetRequest());
    controller.store.update({ observedPower: "unknown", reachable: true });
    await assert.rejects(async () => cooling.handleGetRequest());
  });

  test("remote power transitions and recovery drive three independent sensors", async () => {

    const { Characteristic, bySubtype, controller, fake } = await rig([ "Enable.Sensors.Ready", "Enable.Sensors.Cooling", "Enable.Sensors.Warming" ]);
    const ready = bySubtype("sensor.ready")!.getCharacteristic(Characteristic.OccupancyDetected);
    const cooling = bySubtype("sensor.cooling")!.getCharacteristic(Characteristic.OccupancyDetected);
    const warming = bySubtype("sensor.warming")!.getCharacteristic(Characteristic.OccupancyDetected);

    await waitUntil(() => controller.store.get("observedPower") === "standby", { description: "expected device state", timeoutMs: 2000 });
    assert.equal(await warming.handleGetRequest(), 0);
    fake.state.power = "startup";
    await waitUntil(() => controller.store.get("observedPower") === "warming", { description: "expected device state", timeoutMs: 2000 });
    assert.equal(await ready.handleGetRequest(), 0);
    assert.equal(await warming.handleGetRequest(), 1);
    fake.state.power = "on";
    await waitUntil(() => ready.value === 1, { description: "expected device state", timeoutMs: 2000 });
    assert.equal(await warming.handleGetRequest(), 0);
    fake.state.power = "cooling1";
    await waitUntil(() => cooling.value === 1, { description: "expected device state", timeoutMs: 2000 });
    assert.equal(ready.value, 0);
    controller.store.update({ reachable: false });
    await assert.rejects(async () => cooling.handleGetRequest());
    fake.state.power = "standby";
    await waitUntil(() => controller.store.get("reachable") && (controller.store.get("observedPower") === "standby"),
      { description: "expected device state", timeoutMs: 2000 });
    assert.equal(await cooling.handleGetRequest(), 0);
  });

  test("advanced sliders, HDR and patterns use the shared transport and do not add power commands", async () => {

    const { Characteristic, bySubtype, controller, fake } = await rig([
      "Enable.Controls.Brightness", "Enable.Controls.Contrast", "Enable.Controls.HDR", "Enable.Controls.TestPatterns", "Enable.Sensors.Fault"
    ], { state: { power: "on" } });

    await waitUntil(() => !!bySubtype("advanced.brightness") && !!bySubtype("advanced.hdr.hdr10"), { description: "expected device state", timeoutMs: 2000 });
    await bySubtype("advanced.brightness")!.getCharacteristic(Characteristic.Brightness).handleSetRequest(37);
    await bySubtype("advanced.contrast")!.getCharacteristic(Characteristic.Brightness).handleSetRequest(80);
    await bySubtype("advanced.hdr.hdr10")!.getCharacteristic(Characteristic.On).handleSetRequest(true);
    await bySubtype("advanced.testPattern.cross")!.getCharacteristic(Characteristic.On).handleSetRequest(true);
    assert.equal(fake.state.brightness, 37);
    assert.equal(fake.state.contrast, 80);
    assert.equal(fake.state.hdr, "hdr10");
    assert.equal(fake.state.testPattern, "cross");
    assert.equal(fake.received.filter((line) => line.startsWith("power ")).length, 0);
    await assert.rejects(async () => controller.setLevel("brightness", 150));
    assert.ok(!fake.received.includes("brightness 150"));
    assert.equal(await bySubtype("advanced.fault")!.getCharacteristic(Characteristic.ContactSensorState).handleGetRequest(), 0);
  });

  test("unsupported advanced controls are removed after discovery", async () => {

    const { bySubtype, controller } = await rig(["Enable.Controls.Brightness"], { state: { power: "on" }, unsupported: ["brightness"] });

    await waitUntil(() => controller.capabilities.brightness === false, { description: "expected device state", timeoutMs: 2000 });
    assert.equal(bySubtype("advanced.brightness"), undefined);
  });

  test("auto power is opt-in and waits for observed readiness", async () => {

    const normal = await rig([]);

    await waitUntil(() => normal.controller.store.get("reachable"), { description: "expected device state", timeoutMs: 2000 });
    await assert.rejects(async () => normal.controller.setPictureMode("game"));
    assert.ok(!normal.fake.received.includes("power \"on\""));
    const automatic = await rig([], { transitionMs: 40 }, { autoPowerOn: true, readyTimeoutSeconds: 2 });

    await waitUntil(() => automatic.controller.store.get("reachable"), { description: "expected device state", timeoutMs: 2000 });
    await automatic.controller.setPictureMode("game");
    assert.equal(automatic.controller.store.get("observedPower"), "on");
    assert.equal(automatic.fake.state.pictureMode, "game");
    assert.equal(automatic.fake.received.filter((line) => line === "power \"on\"").length, 1);
  });

  test("power off cancels an in-progress auto power wait", async () => {

    const { controller, fake } = await rig([], { transitionMs: 1000 }, { autoPowerOn: true, readyTimeoutSeconds: 2 });

    await waitUntil(() => controller.store.get("reachable"), { description: "expected device state", timeoutMs: 2000 });
    const pending = assert.rejects(async () => controller.setPictureMode("game"));

    await waitUntil(() => fake.state.power === "startup", { description: "expected device state", timeoutMs: 2000 });
    // The projector refuses off during warm-up, but the user's intent still cancels the pending mode command.
    await assert.rejects(async () => controller.setPower(false));
    await pending;
    assert.ok(!fake.received.includes("picture_mode \"game\""));
  });

  test("HDMI companion switches follow external input changes", async () => {

    const { Characteristic, bySubtype, controller, fake } = await rig(["Enable.Inputs.Switches"], { state: { power: "on" } });

    await waitUntil(() => controller.store.get("input") === "hdmi1", { description: "input known", timeoutMs: 2000 });
    await bySubtype("source.hdmi2")!.getCharacteristic(Characteristic.On).handleSetRequest(true);
    assert.equal(fake.state.input, "hdmi2");
    fake.state.input = "hdmi1";
    await waitUntil(() => bySubtype("source.hdmi1")!.getCharacteristic(Characteristic.On).value === true,
      { description: "external HDMI selection", timeoutMs: 2000 });
    assert.equal(bySubtype("source.hdmi2")!.getCharacteristic(Characteristic.On).value, false);
  });

});
