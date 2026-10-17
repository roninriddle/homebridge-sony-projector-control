/* Optional HomeKit mappings. All command traffic uses the shared controller.
 * Picture-level sliders are not projector power switches or laser-output controls.
 */
import type { CharacteristicValue, PlatformAccessory } from "homebridge";
import { HAPStatus, acquireService, notResponding, validService } from "homebridge-plugin-utils";
import type { AccessoryContext } from "./context.ts";
import { Option } from "../options.ts";
import { runFromHomeKit } from "./context.ts";

export const ADVANCED_OPTIONS = [ Option.BRIGHTNESS, Option.CONTRAST, Option.HDR_SWITCHES, Option.TEST_SWITCHES, Option.SENSOR_FAULT, Option.SENSOR_HOURS ];

export class AdvancedControls {

  readonly #context: AccessoryContext;
  readonly #accessory: PlatformAccessory;

  constructor(context: AccessoryContext, accessory: PlatformAccessory) {

    this.#context = context;
    this.#accessory = accessory;
    context.controller.store.onChange(() => this.#refresh());
  }

  public configure(): void {

    const { api, controller, enabled } = this.#context;
    const { Service, Characteristic } = api.hap;

    for(const [ key, option ] of [ [ "brightness", Option.BRIGHTNESS ], [ "contrast", Option.CONTRAST ] ] as const) {

      const subtype = "advanced." + key;

      if(!validService(this.#accessory, Service.Lightbulb, enabled(option) && (controller.capabilities[key] === true), subtype)) { continue; }
      const service = acquireService(this.#accessory, Service.Lightbulb, key === "brightness" ? "Picture Brightness" : "Picture Contrast", subtype);
      const current = (): number => controller.store.get(key) ?? 0;

      service.getCharacteristic(Characteristic.Brightness)
        .onGet(this.#available(current, () => (controller.store.get(key) === null) && !this.#idle()))
        .onSet(async (value: CharacteristicValue) => runFromHomeKit(api, async () => controller.setLevel(key, Number(value)),
          () => service.getCharacteristic(Characteristic.Brightness).updateValue(current())));
      // HomeKit requires On for a Lightbulb. It is only a display companion;
      // tapping it must never unexpectedly switch off a lamp-based projector.
      service.getCharacteristic(Characteristic.On).onGet(this.#available(() => controller.store.get("power") === "on"))
        .onSet(() => { setTimeout(() => this.#refresh(), 50); });
    }

    for(const [ key, option, choices ] of [
      [ "hdr", Option.HDR_SWITCHES, controller.capabilities.hdrModes ?? [] ],
      [ "testPattern", Option.TEST_SWITCHES, controller.capabilities.testPatterns ?? [] ]
    ] as const) {

      const prefix = "advanced." + key + ".";
      const tokens = enabled(option) ? choices.filter((token) => !this.#context.serviceSubtype || (this.#context.serviceSubtype === prefix + token)) : [];

      for(const service of this.#accessory.services.filter((candidate) => candidate.subtype?.startsWith(prefix))) {

        if(!tokens.includes((service.subtype ?? "").slice(prefix.length))) { this.#accessory.removeService(service); }
      }

      for(const token of tokens) {

        const service = acquireService(this.#accessory, Service.Switch, (key === "hdr" ? "HDR " : "Test Pattern ") + token.replaceAll("_", " "), prefix + token);
        const current = (): boolean => (controller.store.get("power") === "on") && (controller.store.get(key) === token);

        service.getCharacteristic(Characteristic.On).onGet(this.#available(current, () => controller.store.get(key) === null))
          .onSet(async (value: CharacteristicValue) => {

            if(!value) {

              setTimeout(() => this.#refresh(), 50);

              return;
            }
            await runFromHomeKit(api, async () => controller.setSelector(key, token), () => service.getCharacteristic(Characteristic.On).updateValue(current()));
          });
      }
    }

    if(validService(this.#accessory, Service.ContactSensor, enabled(Option.SENSOR_FAULT) && controller.capabilities.faults, "advanced.fault")) {

      acquireService(this.#accessory, Service.ContactSensor, "Projector Fault", "advanced.fault")
        .getCharacteristic(Characteristic.ContactSensorState).onGet(this.#available(() => controller.store.get("faults").length ? 1 : 0,
          () => !controller.store.get("faultsKnown")));
    }

    if(validService(this.#accessory, Service.LightSensor, enabled(Option.SENSOR_HOURS) && controller.capabilities.lightHours, "advanced.hours")) {

      acquireService(this.#accessory, Service.LightSensor, "Lamp Hours", "advanced.hours")
        .getCharacteristic(Characteristic.CurrentAmbientLightLevel).onGet(this.#available(
          () => Math.max(0.0001, Math.min(100000, controller.store.get("lightHours") ?? 0)), () => controller.store.get("lightHours") === null));
    }
    this.#refresh();
  }

  #idle(): boolean {

    return [ "standby", "warming", "cooling" ].includes(this.#context.controller.store.get("observedPower"));
  }

  #available(read: () => CharacteristicValue, unknown: () => boolean = () => false): () => CharacteristicValue {

    const { api, controller } = this.#context;

    return notResponding({ errorClass: api.hap.HapStatusError, unavailable: () => !controller.store.get("reachable") || unknown() })(read);
  }

  #refresh(): void {

    const { api, controller } = this.#context;
    const { Characteristic, Service } = api.hap;
    const store = controller.store;
    const failure = new api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    const live = store.get("reachable");

    for(const key of [ "brightness", "contrast" ] as const) {

      const service = this.#accessory.getServiceById(Service.Lightbulb, "advanced." + key);

      service?.getCharacteristic(Characteristic.On).updateValue(live ? store.get("power") === "on" : failure);
      const level = store.get(key);

      service?.getCharacteristic(Characteristic.Brightness).updateValue(live && ((level !== null) || this.#idle()) ? level ?? 0 : failure);
    }

    for(const key of [ "hdr", "testPattern" ] as const) {

      const prefix = "advanced." + key + ".";

      for(const service of this.#accessory.services.filter((candidate) => candidate.subtype?.startsWith(prefix))) {

        const current = (store.get("power") === "on") && ((service.subtype ?? "").slice(prefix.length) === store.get(key));

        service.getCharacteristic(Characteristic.On).updateValue(live && (store.get(key) !== null) ? current : failure);
      }
    }
    this.#accessory.getServiceById(Service.ContactSensor, "advanced.fault")
      ?.getCharacteristic(Characteristic.ContactSensorState).updateValue(live && store.get("faultsKnown") ? (store.get("faults").length ? 1 : 0) : failure);
    const hours = store.get("lightHours");

    this.#accessory.getServiceById(Service.LightSensor, "advanced.hours")
      ?.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(live && (hours !== null) ? Math.max(0.0001, Math.min(100000, hours)) : failure);
  }
}
