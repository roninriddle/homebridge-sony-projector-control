/* Each optional function is a named accessory with one primary service.
 * The same projector controller serves every accessory; there is no additional polling.
 */
import { Categories, setAccessoryName, setServiceName } from "homebridge-plugin-utils";
import { PLATFORM_NAME, PLUGIN_NAME, UUID_NAMESPACE } from "../settings.ts";
import { aspectLabel, inputLabel, pictureModeLabel } from "../protocol/labels.ts";
import type { AccessoryContext } from "./context.ts";
import { CompanionAccessory } from "./companion.ts";
import { Option } from "../options.ts";
import type { PlatformAccessory } from "homebridge";

interface FunctionDescription {

  category: Categories;
  label: string;
  option: string;
  subtype: string;
}

function functionsFor({ config, controller, enabled }: AccessoryContext): FunctionDescription[] {

  const caps = controller.capabilities;
  const chinese = config.language === "zh-CN";
  const functions: FunctionDescription[] = [];
  const add = (option: string, subtype: string, english: string, translated: string, category: Categories): void => {

    if(enabled(option)) { functions.push({ category, label: chinese ? translated : english, option, subtype }); }
  };

  add(Option.SENSOR_WARMING, "sensor.warming", "Projector Warming", "预热中", Categories.SENSOR);
  add(Option.SENSOR_READY, "sensor.ready", "Projector Ready", "投影就绪", Categories.SENSOR);
  add(Option.SENSOR_COOLING, "sensor.cooling", "Projector Cooling", "冷却中", Categories.SENSOR);

  if(caps.blank) { add(Option.PICTURE_MUTE, "control.pictureMute", "Picture Mute", "画面静音", Categories.SWITCH); }

  if(caps.brightness) { add(Option.BRIGHTNESS, "advanced.brightness", "Picture Brightness", "亮度", Categories.LIGHTBULB); }

  if(caps.contrast) { add(Option.CONTRAST, "advanced.contrast", "Picture Contrast", "对比度", Categories.LIGHTBULB); }

  if(caps.faults) { add(Option.SENSOR_FAULT, "advanced.fault", "Projector Fault", "故障", Categories.SENSOR); }

  if(caps.lightHours) { add(Option.SENSOR_HOURS, "advanced.hours", "Lamp Hours", "灯泡时长", Categories.SENSOR); }

  for(const token of caps.inputs) { add(Option.INPUT_SWITCHES, "source." + token, inputLabel(token), inputLabel(token), Categories.SWITCH); }

  for(const token of caps.pictureModes) {

    add(Option.PICTURE_SWITCHES, "picture." + token, pictureModeLabel(token) + " Mode", pictureModeLabel(token) + " 模式", Categories.SWITCH);
  }

  for(const token of caps.aspects) {

    const label = aspectLabel(token).replace(":1", "");

    add(Option.ASPECT_SWITCHES, "aspect." + token, "Aspect " + label, "画幅 " + label, Categories.SWITCH);
  }

  for(const token of caps.hdrModes ?? []) { add(Option.HDR_SWITCHES, "advanced.hdr." + token, "HDR " + token, "HDR " + token, Categories.SWITCH); }

  for(const token of caps.testPatterns ?? []) {

    add(Option.TEST_SWITCHES, "advanced.testPattern." + token, "Test Pattern " + token, "测试图 " + token, Categories.SWITCH);
  }

  return functions;
}

export class CompanionAccessories {

  readonly #context: AccessoryContext;
  readonly #cached: Map<string, PlatformAccessory>;
  readonly #live = new Map<string, PlatformAccessory>();
  readonly #keep: Set<string>;

  constructor(context: AccessoryContext, cached: Map<string, PlatformAccessory>, keep: Set<string>) {

    this.#context = context;
    this.#cached = cached;
    this.#keep = keep;
    this.#sync();
    context.controller.onLearned(() => this.#sync());
  }

  #sync(): void {

    const { api, config, controller } = this.#context;
    const { Characteristic, Service, uuid } = api.hap;
    const wanted = new Set<string>();

    for(const description of functionsFor(this.#context)) {

      const id = uuid.generate(UUID_NAMESPACE + ":" + config.id + ":function:" + description.subtype);
      const existing = this.#live.get(id) ?? this.#cached.get(id);
      const defaultName = config.name + " " + description.label;
      const accessory = existing ?? new api.platformAccessory(defaultName, id, description.category);

      if(!this.#live.has(id)) {

        new CompanionAccessory({ ...this.#context, enabled: (option): boolean => (option === description.option) && this.#context.enabled(option),
          serviceSubtype: description.subtype }, accessory);
      }
      const service = accessory.services.find((candidate) => candidate.subtype === description.subtype);

      if(!service) { continue; }
      const name = typeof accessory.context["customName"] === "string" ? accessory.context["customName"] : defaultName;

      setAccessoryName(accessory, name);
      setServiceName(service, name);
      service.setPrimaryService(true);
      const rename = (value: unknown): void => {

        if((typeof value === "string") && value.trim()) {

          accessory.context["customName"] = value;
          setAccessoryName(accessory, value);
          setServiceName(service, value);
          api.updatePlatformAccessories([accessory]);
        }
      };

      if(service.testCharacteristic(Characteristic.ConfiguredName)) { service.getCharacteristic(Characteristic.ConfiguredName).onSet(rename); }
      const info = accessory.getService(Service.AccessoryInformation) ?? accessory.addService(Service.AccessoryInformation);

      info.getCharacteristic(Characteristic.ConfiguredName).onSet(rename);
      info.setCharacteristic(Characteristic.Manufacturer, "Sony")
        .setCharacteristic(Characteristic.Model, controller.identity.model ?? "Projector")
        .setCharacteristic(Characteristic.SerialNumber, config.id + ":" + description.subtype);

      if(controller.identity.firmware) { info.setCharacteristic(Characteristic.FirmwareRevision, controller.identity.firmware); }

      if(existing) { api.updatePlatformAccessories([accessory]); } else { api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]); }
      this.#live.set(id, accessory);
      this.#keep.add(id);
      wanted.add(id);
    }

    for(const [ id, accessory ] of this.#live) {

      if(!wanted.has(id)) {

        api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.#live.delete(id);
        this.#cached.delete(id);
        this.#keep.delete(id);
      }
    }
  }
}
