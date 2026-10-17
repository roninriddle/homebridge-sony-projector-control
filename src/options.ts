/* options.ts: The feature options catalog.
 *
 * This one catalog drives the settings UI's feature options editor, the generated docs/FeatureOptions.md and runtime behaviour, so the three cannot drift apart.
 * Options are written in config.json as `Enable.<Category>.<Option>` or `Disable.<Category>.<Option>`, optionally scoped to one projector by appending its id,
 * for example `Enable.Picture.Switches.192-168-8-50`. Value options use `Enable.<Category>.<Option>=<value>`.
 */
import type { FeatureCategoryEntry, FeatureOptionChoice, FeatureOptionEntry } from "homebridge-plugin-utils";

// What a remote button can be mapped to. Values are ADCP key names, plus two actions that are not keys.
const REMOTE_ACTIONS: FeatureOptionChoice[] = [

  { label: "Menu", value: "menu" },
  { label: "Back (return)", value: "return" },
  { label: "Select (enter)", value: "enter" },
  { label: "Toggle picture mute (blank screen)", value: "blank" },
  { label: "Play/Pause key", value: "playpause" },
  { label: "Rewind key", value: "rewind" },
  { label: "Fast-forward key", value: "fastforward" },
  { label: "Next key", value: "next" },
  { label: "Previous key", value: "prev" },
  { label: "Do nothing", value: "none" }
];

export const featureOptionCategories: FeatureCategoryEntry<OptionMeta>[] = [

  { description: "Projector options.", name: "Device" },
  { description: "Apple TV Remote options (Control Center > Remote).", meta: { requires: "remote" }, name: "Remote" },
  { description: "Picture mode options.", name: "Picture" },
  { description: "HDMI input switch options / HDMI 独立开关.", name: "Inputs" },
  { description: "Aspect ratio options.", name: "Aspect" },
  { description: "Additional controls.", name: "Controls" },
  { description: "Sensors for Home automations.", name: "Sensors" },
  { description: "Logging options.", name: "Log" }
];

export const featureOptions: Record<string, FeatureOptionEntry<OptionMeta>[]> = {

  Aspect: [

    { default: false, description: "Add a switch per aspect ratio (Normal, 2.35:1 Zoom, ...) for scenes and automations. Turning one on selects that aspect.",
      name: "Switches" }
  ],
  Controls: [

    { default: false, description: "Picture brightness slider / 图像亮度滑块（不是光源功率）.", meta: { requires: "brightness" }, name: "Brightness" },
    { default: false, description: "Picture contrast slider / 图像对比度滑块.", meta: { requires: "contrast" }, name: "Contrast" },
    { default: false, description: "Exclusive HDR mode switches / HDR 模式开关.", meta: { requires: "hdrModes" }, name: "HDR" },
    { default: false, description: "Advanced test pattern switches / 测试图开关.", meta: { requires: "testPatterns" }, name: "TestPatterns" },
    { default: false, description: "Expose projector power to Matter (Homebridge 2.3+ and Matter child bridge required).", name: "MatterPower" },
    { default: false, description: "Add a Picture Mute switch that blanks the image without turning the projector off.", meta: { requires: "blank" },
      name: "PictureMute" }
  ],
  Device: [

    { default: true, description: "Make this projector available in HomeKit.", name: "" }
  ],

  Inputs: [
    { default: false, description: "HDMI companion switches, including when the TV picker shows picture modes / HDMI 独立开关.", name: "Switches" }
  ],
  Log: [

    { default: true, description: "Log commands sent from HomeKit (power, input, picture mode, ...).", name: "Commands" },
    { default: true, description: "Log changes made outside HomeKit, such as with the projector's IR remote.", name: "ExternalChanges" }
  ],
  Picture: [

    { default: false, description: "Add a switch per picture mode (Cinema Film 1, Reference, Game, ...) for scenes and automations. Turning one on selects that mode.",
      name: "Switches" }
  ],
  Remote: [

    { default: true, description: "Control the projector from the Apple TV Remote in Control Center: arrows, select, back and menu.", name: "" },
    { choices: REMOTE_ACTIONS, default: true, defaultValue: "blank", description: "What the Play/Pause button does.", group: "", name: "PlayPause" },
    { choices: REMOTE_ACTIONS, default: true, defaultValue: "menu", description: "What the Info (i) button does.", group: "", name: "Info" },
    { choices: REMOTE_ACTIONS, default: true, defaultValue: "return", description: "What the Back button does.", group: "", name: "Back" }
  ],
  Sensors: [

    { default: false, description: "Fault contact sensor / 故障传感器（正常的 no_err 不触发）.", meta: { requires: "faults" }, name: "Fault" },
    { default: false, description: "Optional lamp hours sensor mapped to lux; true hours are also in settings / 灯泡时长借用照度显示.",
      meta: { requires: "lightHours" }, name: "Hours" },
    { default: false, description: "投影就绪 / Projector Ready: observed running state after warm-up; HDMI picture is not guaranteed. Unavailable offline.",
      name: "Ready" },
    { default: false, description: "冷却中 / Projector Cooling: confirmed cooling state. Loss of connection is never treated as cooling complete.",
      name: "Cooling" },
    { default: false, description: "预热中 / Projector Warming: confirmed warm-up state, distinct from standby and ready. Unavailable offline.",
      name: "Warming" }
  ]
};

// `meta.requires` names a capability (see Capabilities in protocol/types.ts). The settings UI hides an option or category when the selected projector lacks it.
export interface OptionMeta {

  requires?: "blank" | "brightness" | "contrast" | "faults" | "hdrModes" | "lightHours" | "remote" | "testPatterns";
}

// Typed names for every option the code reads, so a typo is a compile error instead of a silently ignored option.
export const Option = {

  ASPECT_SWITCHES: "Aspect.Switches",
  BRIGHTNESS: "Controls.Brightness",
  CONTRAST: "Controls.Contrast",
  DEVICE: "Device",
  HDR_SWITCHES: "Controls.HDR",
  INPUT_SWITCHES: "Inputs.Switches",
  LOG_COMMANDS: "Log.Commands",
  LOG_EXTERNAL: "Log.ExternalChanges",
  MATTER_POWER: "Controls.MatterPower",
  PICTURE_MUTE: "Controls.PictureMute",
  PICTURE_SWITCHES: "Picture.Switches",
  REMOTE: "Remote",
  REMOTE_BACK: "Remote.Back",
  REMOTE_INFO: "Remote.Info",
  REMOTE_PLAY_PAUSE: "Remote.PlayPause",
  SENSOR_COOLING: "Sensors.Cooling", SENSOR_FAULT: "Sensors.Fault",
  SENSOR_HOURS: "Sensors.Hours",
  SENSOR_READY: "Sensors.Ready",
  SENSOR_WARMING: "Sensors.Warming",
  TEST_SWITCHES: "Controls.TestPatterns"
} as const;

export type OptionName = typeof Option[keyof typeof Option];
