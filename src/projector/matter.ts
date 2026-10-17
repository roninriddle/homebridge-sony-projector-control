/* Optional Matter power outlet. Design adapted from Kerem Erkan's MIT-licensed
 * matter-power.ts; see NOTICE.md. Shares the existing controller and poll loop.
 */
import { PLATFORM_NAME, PLUGIN_NAME } from "../settings.ts";
import type { AccessoryContext } from "./context.ts";
import type { MatterAccessory } from "homebridge";

export class MatterPower {

  public readonly uuid: string;
  readonly #context: AccessoryContext;
  readonly #signal: AbortSignal;
  #registered = false;
  #inHandler = 0;
  #syncing = false;
  #dirty = false;
  #syncTask: Promise<void> | null = null;

  constructor(context: AccessoryContext, signal: AbortSignal) {

    this.#context = context;
    this.#signal = signal;
    this.uuid = context.api.hap.uuid.generate(PLUGIN_NAME + ":" + context.config.id + ":matter-power");
    context.controller.store.onChange(() => this.sync());
  }

  public async register(): Promise<void> {

    const { api, config, controller, log } = this.#context;
    const matter = api.matter;

    if(!matter || this.#signal.aborted) { return; }
    let label = config.name + " Power";

    while(Buffer.byteLength(label) > 32) { label = Array.from(label).slice(0, -1).join(""); }
    const serial = controller.identity.serial;
    const accessory: MatterAccessory = {

      UUID: this.uuid,

      clusters: { bridgedDeviceBasicInformation: { reachable: false }, onOff: { onOff: false }
      },
      context: {},
      deviceType: matter.deviceTypes.OnOffOutlet,
      displayName: label,
      handlers: { onOff: {

        off: async () => this.#power(false),

        on: async () => this.#power(true),
        // Homebridge translates Toggle into on/off; sending here would double it.
        toggle: async () => { /* Resolved by Homebridge. */ }
      } },
      manufacturer: "Sony",
      model: "Projector Power",
      serialNumber: serial && (Buffer.byteLength(serial) <= 32) ? serial : this.uuid.replaceAll("-", "")
    };

    for(let attempt = 0; (attempt < 5) && !this.#stopped(); attempt++) {

      try {

        // eslint-disable-next-line no-await-in-loop
        await matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.#registered = true;
        this.sync();

        return;
      } catch(error) {

        if(attempt === 4) {

          log.error("Matter power registration failed: %s", String(error));

          return;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => {

          const done = (): void => { clearTimeout(timer); this.#signal.removeEventListener("abort", done); resolve(); };
          const timer = setTimeout(done, 1000);

          this.#signal.addEventListener("abort", done, { once: true });
        });
      }
    }
  }

  #stopped(): boolean {

    return this.#signal.aborted;
  }

  async #power(on: boolean): Promise<void> {

    this.#inHandler++;
    try {

      // Let an already-started state update finish before entering a command
      // handler. Homebridge forbids external updates during handler execution.
      await this.#syncTask;

      if(this.#signal.aborted) { throw new Error("Homebridge is shutting down."); }
      await this.#context.controller.setPower(on);
    } finally {

      this.#inHandler--;
      // Homebridge commits the handler result first; reconcile on the next turn.
      setTimeout(() => this.sync(), 0);
    }
  }

  public sync(): void {

    this.#dirty = true;

    if(!this.#registered || this.#syncing || this.#inHandler || this.#signal.aborted) { return; }
    this.#syncing = true;
    this.#syncTask = this.#flush().catch((error: unknown) => this.#context.log.debug("Matter power sync failed: %s", String(error)))
      .finally(() => {

        this.#syncing = false;
        this.#syncTask = null;

        // A store update can arrive after the loop exits but before finally.
        if(this.#dirty) { this.sync(); }
      });
  }

  async #flush(): Promise<void> {

    const { api, controller } = this.#context;
    const matter = api.matter;

    if(!matter) { return; }

    while(this.#dirty && !this.#inHandler && !this.#signal.aborted) {

      this.#dirty = false;
      const power = controller.store.get("observedPower");
      const reachable = controller.store.get("reachable") && (power !== "unknown");

      // eslint-disable-next-line no-await-in-loop
      await matter.updateAccessoryState(this.uuid, matter.clusterNames.BridgedDeviceBasicInformation, { reachable });

      if(reachable) {

        // eslint-disable-next-line no-await-in-loop
        await matter.updateAccessoryState(this.uuid, matter.clusterNames.OnOff, { onOff: (power === "on") || (power === "warming") });
      }
    }
  }
}
