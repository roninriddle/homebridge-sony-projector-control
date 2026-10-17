/* platform.ts: The Homebridge dynamic platform. Lifecycle only; everything projector-specific lives in src/projector and src/protocol.
 *
 * Startup order follows Homebridge's contract: configureAccessory() is called for each cached accessory first, and only collects it. Real work starts at
 * didFinishLaunching. On shutdown one AbortController is aborted, which stops every poll loop and closes every connection.
 */
import type { API, DynamicPlatformPlugin, Logging, MatterAccessory, PlatformAccessory, PlatformConfig } from "homebridge";
import { APIEvent, FeatureOptions } from "homebridge-plugin-utils";
import { Option, featureOptionCategories, featureOptions } from "./options.ts";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.ts";
import type { AccessoryContext } from "./projector/context.ts";
import { CompanionAccessories } from "./projector/accessories.ts";
import { CompanionAccessory } from "./projector/companion.ts";
import { ErrorCode } from "./protocol/errors.ts";
import { MatterPower } from "./projector/matter.ts";
import { ProjectorCache } from "./projector/cache.ts";
import type { ProjectorConfig } from "./config.ts";
import { ProjectorController } from "./projector/controller.ts";
import { TelevisionAccessory } from "./projector/tv.ts";
import { describeError } from "./lib/reporter.ts";
import { parseConfig } from "./config.ts";
import { projectorLog } from "./lib/log.ts";

export class SonyProjectorsPlatform implements DynamicPlatformPlugin {

  readonly #abort = new AbortController();
  readonly #api: API;
  readonly #cached = new Map<string, PlatformAccessory>();
  readonly #cachedMatter = new Map<string, MatterAccessory>();
  readonly #matterKeep = new Set<string>();
  readonly #config: PlatformConfig;
  readonly #log: Logging;

  constructor(log: Logging, config: PlatformConfig, api: API) {

    this.#api = api;
    this.#config = config;
    this.#log = log;

    api.on(APIEvent.DID_FINISH_LAUNCHING, () => {

      try {

        this.#launch();
      } catch(error) {

        this.#log.error("Unable to start: %s", describeError(error));
      }
    });

    api.on(APIEvent.SHUTDOWN, () => this.#abort.abort());
  }

  public configureAccessory(accessory: PlatformAccessory): void {

    this.#cached.set(accessory.UUID, accessory);
  }

  public configureMatterAccessory(accessory: MatterAccessory): void {

    this.#cachedMatter.set(accessory.UUID, accessory);
  }

  #launch(): void {

    const parsed = parseConfig(this.#config);
    const options = new FeatureOptions(featureOptionCategories, featureOptions, parsed.options);
    const keep = new Set<string>();
    const external: PlatformAccessory[] = [];

    for(const issue of parsed.issues) {

      this.#log.warn("[%s] %s", ErrorCode.CONFIG, issue);
    }

    if(!parsed.projectors.length) {

      this.#log.info("No projectors are configured yet. Add one in the plugin settings to get started.");
      this.#removeStale(keep);
      this.#removeStaleMatter();

      return;
    }

    const cache = new ProjectorCache(this.#api.user.storagePath(), this.#log);

    cache.retain(parsed.projectors.map((projector) => projector.id));

    for(const config of parsed.projectors) {

      try {

        this.#setUpProjector(config, options, cache, external, keep, parsed.debug);
      } catch(error) {

        // One projector failing to set up must not take the others down with it.
        this.#log.error("Unable to set up %s (%s): %s", config.name, config.host, describeError(error));
      }
    }

    if(external.length) {

      this.#api.publishExternalAccessories(PLUGIN_NAME, external);
    }

    this.#removeStale(keep);
    this.#removeStaleMatter();
  }

  // Set up one projector: its controller, TV accessory and, when wanted, its companion accessory.
  #setUpProjector(config: ProjectorConfig, options: FeatureOptions, cache: ProjectorCache, external: PlatformAccessory[], keep: Set<string>,
    debug: boolean): void {

    if(!options.test(Option.DEVICE, config.id)) {

      this.#log.info("%s (%s) is hidden from HomeKit by a feature option.", config.name, config.host);

      return;
    }

    const log = projectorLog(this.#log, () => config.name, () => debug);
    const controller = new ProjectorController({ config, initial: cache.get(config.id), isEnabled: (option): boolean => options.test(option, config.id), log,
      signal: this.#abort.signal });

    controller.store.onChange((key, value) => {

      if(((key === "brightness") || (key === "contrast")) && (typeof value === "number")) { cache.update(config.id, { [key]: value }); }
    });
    controller.onLearned(() => cache.update(config.id, { capabilities: controller.capabilities, identity: controller.identity, protocol: controller.protocol }));

    const context: AccessoryContext = { api: this.#api, cache, config, controller, enabled: (option) => options.test(option, config.id), log,
      value: (option) => options.value(option, config.id) };

    external.push(new TelevisionAccessory(context).accessory);

    if(CompanionAccessory.wanted(context)) {

      new CompanionAccessories(context, this.#cached, keep);
    }

    if(context.enabled(Option.MATTER_POWER)) {

      if((typeof this.#api.isMatterEnabled !== "function") || !this.#api.isMatterEnabled() || !this.#api.matter) {

        log.warn("Matter power needs Matter enabled on this plugin's child bridge.");
      } else if(!this.#api.versionGreaterOrEqual("2.3.0")) {

        log.warn("Matter power requires Homebridge 2.3.0 or newer.");
      } else {

        const power = new MatterPower(context, this.#abort.signal);

        this.#matterKeep.add(power.uuid);
        void power.register().catch((error: unknown) => log.error("Matter setup failed: %s", describeError(error)));
      }
    }

    controller.start();
  }

  #removeStale(keep: Set<string>): void {

    const stale = [...this.#cached.values()].filter((accessory) => !keep.has(accessory.UUID));

    if(stale.length) {

      this.#log.info("Removing %d accessor%s that %s no longer configured.", stale.length, (stale.length === 1) ? "y" : "ies", (stale.length === 1) ? "is" : "are");
      this.#api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, stale);

      for(const accessory of stale) { this.#cached.delete(accessory.UUID); }
    }
  }

  #removeStaleMatter(): void {

    const stale = [...this.#cachedMatter.values()].filter((accessory) => !this.#matterKeep.has(accessory.UUID));

    if(stale.length && this.#api.matter) {

      void this.#api.matter.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, stale)
        .catch((error: unknown) => this.#log.warn("Unable to remove stale Matter power accessories: %s", describeError(error)));
    }
  }
}
