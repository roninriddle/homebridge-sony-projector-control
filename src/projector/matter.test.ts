import type { API, MatterAccessory } from "homebridge";
import { capturingLog, waitUntil } from "homebridge-plugin-utils/testing";
import type { AccessoryContext } from "./context.ts";
import { MatterPower } from "./matter.ts";
import type { ProjectorController } from "./controller.ts";
import { StateStore } from "./state.ts";
import assert from "node:assert/strict";
import { createFakeApi } from "../fake-api.helpers.ts";
import { test } from "node:test";

test("Matter mirrors observed power and reachability, and sends explicit commands once", async () => {

  const fake = createFakeApi();
  const abort = new AbortController();
  const registered: MatterAccessory[] = [];
  const updates: { cluster: string; value: Record<string, unknown> }[] = [];
  const store = new StateStore();
  const commands: boolean[] = [];
  const controller = {

    identity: {},
    setPower: async (on: boolean) => { commands.push(on); }, store
  } as unknown as ProjectorController;

  Object.assign(fake.api, { matter: {

    clusterNames: { BridgedDeviceBasicInformation: "info", OnOff: "onOff" },
    deviceTypes: { OnOffOutlet: "outlet" },
    registerPlatformAccessories: async (_plugin: string, _platform: string, accessories: MatterAccessory[]) => registered.push(...accessories),
    updateAccessoryState: async (_uuid: string, cluster: string, value: Record<string, unknown>) => updates.push({ cluster, value })
  } as unknown as API["matter"] });
  const context = { api: fake.api, config: { host: "192.0.2.1", id: "theater", name: "影院投影仪测试中文名称非常长"
  }, controller,
  log: capturingLog() } as unknown as AccessoryContext;

  try {

    const power = new MatterPower(context, abort.signal);

    await power.register();
    assert.equal(registered.length, 1);
    assert.ok(Buffer.byteLength(registered[0]!.displayName) <= 32);
    assert.ok(!registered[0]!.serialNumber?.includes("192.0.2.1"));
    store.update({ observedPower: "on", reachable: true });
    await waitUntil(() => updates.some((entry) => entry.value["onOff"] === true), { description: "expected device state", timeoutMs: 1000 });
    const handlers = registered[0]!.handlers!.onOff as unknown as { on: () => Promise<void>; off: () => Promise<void>; toggle: () => Promise<void> };

    await handlers.on();
    await handlers.off();
    await handlers.toggle();
    assert.deepEqual(commands, [ true, false ]);
    const start = updates.length;

    store.update({ reachable: false });
    await waitUntil(() => updates.slice(start).some((entry) => entry.value["reachable"] === false), { description: "expected device state", timeoutMs: 1000 });
    assert.ok(!updates.slice(start).some((entry) => entry.value["onOff"] === false));
  } finally {

    abort.abort();
    fake.cleanup();
  }
});

test("Matter controller errors propagate without pretending the command succeeded", async () => {

  const fake = createFakeApi();
  const abort = new AbortController();
  const registered: MatterAccessory[] = [];

  Object.assign(fake.api, { matter: {

    clusterNames: { BridgedDeviceBasicInformation: "info", OnOff: "onOff" }, deviceTypes: { OnOffOutlet: "outlet" },
    registerPlatformAccessories: async (_p: string, _n: string, list: MatterAccessory[]) => registered.push(...list),
    updateAccessoryState: async () => { /* State not changed. */ }
  } as unknown as API["matter"] });
  const controller = { identity: {}, setPower: async () => { throw new Error("rejected by projector"); }, store: new StateStore()
  } as unknown as ProjectorController;

  try {

    const context = { api: fake.api, config: { id: "test", name: "Test" }, controller, log: capturingLog() } as unknown as AccessoryContext;

    await new MatterPower(context, abort.signal).register();
    const handler = registered[0]!.handlers!.onOff as unknown as { on: () => Promise<void> };

    await assert.rejects(async () => handler.on(), /rejected by projector/);
  } finally { abort.abort(); fake.cleanup(); }
});
