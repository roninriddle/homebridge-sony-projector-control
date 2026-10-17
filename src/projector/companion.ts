/* companion.ts: A bridged accessory holding everything that is not the TV tile.
 *
 * HomeKit's Television service has no place for picture modes, aspect ratios or sensors, and the Home app ignores custom characteristics. So they live here as
 * standard services that Home automations, scenes and Shortcuts can all use:
 *
 *   - picture-mode and aspect switches, which behave like radio buttons (turning one on selects it; the active one cannot be turned off)
 *   - a Picture Mute switch
 *   - independent "Projector Warming", "Projector Ready" and "Projector Cooling" occupancy sensors for observed power phases
 *
 * Every group is off by default and enabled with feature options. When none are enabled, the platform does not create this accessory at all.
 */
import { ADVANCED_OPTIONS, AdvancedControls } from "./advanced.ts";
import type { CharacteristicValue, PlatformAccessory, Service } from "homebridge";
import { HAPStatus, acquireService, notResponding, validService } from "homebridge-plugin-utils";
import { aspectLabel, inputLabel, pictureModeLabel } from "../protocol/labels.ts";
import type { AccessoryContext } from "./context.ts";
import { Option } from "../options.ts";
import { Subtype } from "../settings.ts";
import { runFromHomeKit } from "./context.ts";

type Group = "aspect" | "input" | "picture";

export class CompanionAccessory {

  public readonly accessory: PlatformAccessory;

  readonly #context: AccessoryContext;
  readonly #advanced: AdvancedControls;
  #listening = false;

  constructor(context: AccessoryContext, accessory: PlatformAccessory) {

    this.#context = context;
    this.accessory = accessory;
    this.#advanced = new AdvancedControls(context, accessory);
    this.configure();
  }

  public static wanted({ enabled }: Pick<AccessoryContext, "enabled">): boolean {

    return [ ...ADVANCED_OPTIONS, Option.ASPECT_SWITCHES, Option.INPUT_SWITCHES, Option.PICTURE_MUTE, Option.PICTURE_SWITCHES,
      Option.SENSOR_COOLING, Option.SENSOR_READY, Option.SENSOR_WARMING ]
      .some((option) => enabled(option));
  }

  // Bring the services in line with the current feature options and capabilities. Safe to call repeatedly.
  public configure(): void {

    const { api, config, controller, enabled } = this.#context;
    const { Characteristic, Service: Services } = api.hap;
    const capabilities = controller.capabilities;

    this.accessory.getService(Services.AccessoryInformation)?.setCharacteristic(Characteristic.Manufacturer, "Sony")
      .setCharacteristic(Characteristic.Model, (controller.identity.model ?? "Projector") + " Controls")
      .setCharacteristic(Characteristic.SerialNumber, (controller.identity.serial ?? config.id) + "-controls");

    this.#configureGroup("picture", enabled(Option.PICTURE_SWITCHES) ? capabilities.pictureModes : []);
    this.#configureGroup("input", enabled(Option.INPUT_SWITCHES) ? capabilities.inputs : []);
    this.#configureGroup("aspect", enabled(Option.ASPECT_SWITCHES) ? capabilities.aspects : []);
    this.#configurePictureMute(enabled(Option.PICTURE_MUTE) && capabilities.blank);
    this.#configureSensor(Subtype.ready, "Projector Ready", enabled(Option.SENSOR_READY), () => controller.store.get("observedPower") === "on");
    this.#configureSensor(Subtype.cooling, "Projector Cooling", enabled(Option.SENSOR_COOLING), () => controller.store.get("observedPower") === "cooling");
    this.#configureSensor(Subtype.warming, "Projector Warming", enabled(Option.SENSOR_WARMING), () => controller.store.get("observedPower") === "warming");
    this.#advanced.configure();

    if(!this.#listening) {

      this.#listening = true;
      controller.store.onChange((key) => this.#refresh(key));
      controller.onLearned(() => this.configure());
    }
  }

  #available(read: () => boolean): () => boolean {

    const { api, controller } = this.#context;

    return notResponding({ errorClass: api.hap.HapStatusError, unavailable: () => !controller.store.get("reachable") })(read);
  }

  #servicesIn(group: Group): Service[] {

    const prefix = group === "input" ? "source." : (group === "picture" ? Subtype.pictureMode("") : Subtype.aspect(""));

    return this.accessory.services.filter((service) => service.subtype?.startsWith(prefix));
  }

  #configureGroup(group: Group, choices: readonly string[]): void {

    const { api, controller } = this.#context;
    const { Characteristic, Service: Services } = api.hap;
    const subtype = (token: string): string => group === "input" ? "source." + token : (group === "picture") ? Subtype.pictureMode(token) : Subtype.aspect(token);
    const tokens = choices.filter((token) => !this.#context.serviceSubtype || (this.#context.serviceSubtype === subtype(token)));
    const wanted = new Set(tokens.map(subtype));

    for(const service of this.#servicesIn(group).filter((candidate) => !wanted.has(candidate.subtype ?? ""))) {

      this.accessory.removeService(service);
    }

    for(const token of tokens) {

      // HomeKit names cannot contain ':', so "2.35:1 Zoom" becomes "2.35 Zoom" here. Logs keep the full label.
      const name = group === "input" ? inputLabel(token) : (group === "picture") ? pictureModeLabel(token) + " Mode" :
        "Aspect " + aspectLabel(token).replace(":1", "");
      const key = group === "input" ? "input" : group === "picture" ? "pictureMode" : "aspect";
      const current = (): boolean => (controller.store.get("power") === "on") && (controller.store.get(key) === token);

      // Handlers are attached on every configure, not only when the service is created: a service restored from Homebridge's accessory cache has none.
      const service = acquireService(this.accessory, Services.Switch, name, subtype(token));

      service.getCharacteristic(Characteristic.On)
        .onGet(this.#available(current))
        .onSet(async (value: CharacteristicValue) => {

          const resync = (): void => {

            service.updateCharacteristic(Characteristic.On, current());
          };

          // A mode cannot be turned off, only replaced by another one.
          if(!value) {

            setTimeout(resync, 50);

            return;
          }

          await runFromHomeKit(api, async () => group === "input" ? controller.setInput(token) :
            (group === "picture") ? controller.setPictureMode(token) : controller.setAspect(token), resync);
        });
    }

    this.#refresh(group === "input" ? "input" : group === "picture" ? "pictureMode" : "aspect");
  }

  #configurePictureMute(wanted: boolean): void {

    const { api, controller } = this.#context;
    const { Characteristic, Service: Services } = api.hap;

    if(!validService(this.accessory, Services.Switch, wanted, Subtype.pictureMute)) {

      return;
    }

    const current = (): boolean => controller.store.get("blank") ?? false;

    const service = acquireService(this.accessory, Services.Switch, "Picture Mute", Subtype.pictureMute);

    service.getCharacteristic(Characteristic.On)
      .onGet(this.#available(current))
      .onSet(async (value: CharacteristicValue) => runFromHomeKit(api, async () => controller.setBlank(Boolean(value)),
        () => service.updateCharacteristic(Characteristic.On, current())));
  }

  #configureSensor(subtype: string, name: string, wanted: boolean, detected: () => boolean): void {

    const { api } = this.#context;
    const { Characteristic, Service: Services } = api.hap;

    if(!validService(this.accessory, Services.OccupancySensor, wanted, subtype)) {

      return;
    }

    const read = notResponding({ errorClass: api.hap.HapStatusError,
      unavailable: () => !this.#context.controller.store.get("reachable") || (this.#context.controller.store.get("observedPower") === "unknown") });

    acquireService(this.accessory, Services.OccupancySensor, name, subtype).getCharacteristic(Characteristic.OccupancyDetected)
      .onGet(read(() => this.#occupancy(detected())));

    this.#refresh("observedPower");
    this.#refresh("reachable");
  }

  #occupancy(detected: boolean): number {

    const { OccupancyDetected } = this.#context.api.hap.Characteristic;

    return detected ? OccupancyDetected.OCCUPANCY_DETECTED : OccupancyDetected.OCCUPANCY_NOT_DETECTED;
  }

  // Push the current state to every service that depends on the changed field.
  #refresh(key: string): void {

    const { api, controller } = this.#context;
    const { Characteristic } = api.hap;
    const store = controller.store;
    const power = store.get("power");

    if((key === "power") || (key === "pictureMode") || (key === "reachable")) {

      for(const service of this.#servicesIn("picture")) {

        service.updateCharacteristic(Characteristic.On, (power === "on") && (service.subtype === Subtype.pictureMode(store.get("pictureMode") ?? "")));
      }
    }

    if((key === "power") || (key === "aspect") || (key === "reachable")) {

      for(const service of this.#servicesIn("aspect")) {

        service.updateCharacteristic(Characteristic.On, (power === "on") && (service.subtype === Subtype.aspect(store.get("aspect") ?? "")));
      }
    }

    if((key === "power") || (key === "input") || (key === "reachable")) {

      for(const service of this.#servicesIn("input")) {

        service.updateCharacteristic(Characteristic.On, (power === "on") && (service.subtype === "source." + (store.get("input") ?? "")));
      }
    }

    if(key === "blank") {

      this.accessory.getServiceById(api.hap.Service.Switch, Subtype.pictureMute)?.updateCharacteristic(Characteristic.On, store.get("blank") ?? false);
    }

    const ready = this.accessory.getServiceById(api.hap.Service.OccupancySensor, Subtype.ready);
    const cooling = this.accessory.getServiceById(api.hap.Service.OccupancySensor, Subtype.cooling);
    const warming = this.accessory.getServiceById(api.hap.Service.OccupancySensor, Subtype.warming);

    if((key === "observedPower") || ((key === "reachable") && store.get("reachable"))) {

      if(store.get("reachable") && (store.get("observedPower") !== "unknown")) {

        ready?.updateCharacteristic(Characteristic.OccupancyDetected, this.#occupancy(store.get("observedPower") === "on"));
        cooling?.updateCharacteristic(Characteristic.OccupancyDetected, this.#occupancy(store.get("observedPower") === "cooling"));
        warming?.updateCharacteristic(Characteristic.OccupancyDetected, this.#occupancy(store.get("observedPower") === "warming"));
      }
    }

    if(key === "faults") {

      for(const sensor of [ ready, cooling, warming ]) {

        sensor?.updateCharacteristic(Characteristic.StatusFault, store.get("faults").length ? Characteristic.StatusFault.GENERAL_FAULT :
          Characteristic.StatusFault.NO_FAULT);
      }
    }

    if((key === "reachable") || (key === "observedPower")) {

      const sensorLive = store.get("reachable") && (store.get("observedPower") !== "unknown");

      for(const sensor of [ ready, cooling, warming ]) {

        sensor?.updateCharacteristic(Characteristic.StatusActive, sensorLive);

        if(!sensorLive) { sensor?.updateCharacteristic(Characteristic.OccupancyDetected, new api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE)); }
      }

      if(!store.get("reachable")) {

        const failure = new api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);

        // Retain the last observation, but never advertise it as a live sensor value.
        ready?.updateCharacteristic(Characteristic.OccupancyDetected, failure);
        cooling?.updateCharacteristic(Characteristic.OccupancyDetected, failure);

        const mute = this.accessory.getServiceById(api.hap.Service.Switch, Subtype.pictureMute);

        [ ...this.#servicesIn("picture"), ...this.#servicesIn("aspect"), ...this.#servicesIn("input"), ...(mute ? [mute] : []) ]
          .forEach((service) => service.updateCharacteristic(Characteristic.On, failure));
      }
    }
  }
}
