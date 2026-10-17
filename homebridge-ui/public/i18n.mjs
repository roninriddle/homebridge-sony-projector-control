/* Plugin-owned interface copy; surrounding Homebridge dialogs follow the host language. */
export const messages = {

  "en": {

    "accessoryLanguage": "Home accessory names",
    "accessoryLanguageHint": "Separate from interface language. Existing custom names are preserved.",
    "adcp": "ADCP",
    "add": "Add projector",
    "additional": "Additional settings",
    "advanced": "Advanced",
    "all": "All projectors (global)",
    "aspects": "Aspect tokens",
    "authError": "Authentication failed. Check the administrator password and Requires Authentication setting.",
    "auto": "Automatic (recommended)",
    "autoPowerHint": "Off by default. Input, picture and remote actions otherwise leave a standby projector off.",
    "autoPowerOn": "Automatically power on and wait",
    "automations": "Remote, scenes and automations",
    "backupHelp": "Back up your configuration and pairing data before migration. Stop the old plugin controlling the same project" +
      "or. Never run unattended lamp-projector power cycles.",
    "blank": "Picture mute",
    "brightness": "Brightness",
    "busyError": "The projector is warming up or cooling down. Wait and test again.",
    "cancelledError": "The connection test was cancelled. Please try again.",
    "capabilityHint": "Test the connection in Settings to discover this model's supported features. Global settings apply to each pro" +
      "jector's capabilities.",
    "categories": {

      "Aspect": "Aspect ratios",
      "Controls": "Additional controls",
      "Device": "Projector",
      "Inputs": "HDMI inputs",
      "Log": "Logging",
      "Picture": "Picture modes",
      "Remote": "Apple TV Remote",
      "Sensors": "Automation sensors"
    },
    "choices": {

      "blank": "Toggle picture mute",
      "enter": "Select",
      "fastforward": "Fast-forward key",
      "menu": "Menu",
      "next": "Next key",
      "none": "Do nothing",
      "playpause": "Play / Pause key",
      "prev": "Previous key",
      "return": "Back",
      "rewind": "Rewind key"
    },
    "community": "SDCP community",
    "communityError": "Connection failed. Check the four-character PJ Talk community string.",
    "configError": "Check the address, port and protocol before testing.",
    "connected": "Connected",
    "contrast": "Contrast",
    "cooling": "Cooling down",
    "debug": "Debug logging",
    "debugHint": "Log protocol traffic for troubleshooting. Passwords are redacted.",
    "disabled": "Disabled",
    "discover": "Detect automatically",
    "effectiveOff": "Currently disabled",
    "effectiveOn": "Currently enabled",
    "effectiveValue": "Current action",
    "enabled": "Enabled",
    "error": "Error",
    "faults": "Fault reporting",
    "featureGuide": "Feature reference",
    "features": "Feature options",
    "firmware": "Firmware",
    "guide": "Setup guide",
    "hdmi": "HDMI inputs",
    "hdrModes": "HDR mode tokens",
    "help": "Help",
    "hidePassword": "Hide password",
    "host": "IP address or hostname",
    "id": "Stable device ID",
    "idHint": "Keep this unchanged to preserve accessory identity, even when the address changes.",
    "inherit": "Use inherited / default setting",
    "inputSource": "TV input picker",
    "inputs": "Input tokens",
    "intro": "Sony ADCP / PJ Talk control, with optional picture controls and automation sensors.",
    "invalid": "Check the highlighted fields before saving or testing.",
    "lampHours": "Light hours",
    "language": "Interface language",
    "lightHours": "Lamp / light hours",
    "loadError": "Could not read plugin settings. Reopen this panel to try again.",
    "model": "Model",
    "name": "Name",
    "networkError": "Connection failed. Check the address, control protocol, network access and Remote Start setting.",
    "noProfiles": "Add a projector in Settings first.",
    "on": "Running",
    "options": {

      "Aspect.Switches": [
        "Aspect-ratio switches",
        "Add one switch per aspect ratio."
      ],
      "Controls.Brightness": [
        "Brightness slider",
        "Adjust picture brightness, not lamp or laser power."
      ],
      "Controls.Contrast": [
        "Contrast slider",
        "Adjust picture contrast."
      ],
      "Controls.HDR": [
        "HDR-mode switches",
        "Select mutually exclusive HDR modes supported by the projector."
      ],
      "Controls.MatterPower": [
        "Matter power",
        "Requires Homebridge 2.3+ and Matter enabled for this child bridge. Shares the existing connection."
      ],
      "Controls.PictureMute": [
        "Picture mute",
        "Blank the picture while leaving the projector powered on."
      ],
      "Controls.TestPatterns": [
        "Test-pattern switches",
        "Select a supported advanced test pattern."
      ],
      "Device": [
        "Show in Apple Home",
        "Make this projector available in HomeKit."
      ],
      "Inputs.Switches": [
        "HDMI switches",
        "Add separate HDMI switches, including when the TV picker shows picture modes."
      ],
      "Log.Commands": [
        "Home commands",
        "Log commands sent from Apple Home."
      ],
      "Log.ExternalChanges": [
        "External changes",
        "Log changes made using the physical remote or other controls."
      ],
      "Picture.Switches": [
        "Picture-mode switches",
        "Add one switch per picture mode for scenes and automations."
      ],
      "Remote": [
        "Enable remote keys",
        "Control arrows, select, back and menu from the Apple TV Remote in Control Center."
      ],
      "Remote.Back": [
        "Back button",
        "Choose the action for Back."
      ],
      "Remote.Info": [
        "Info button",
        "Choose the action for the Info button."
      ],
      "Remote.PlayPause": [
        "Play / Pause button",
        "Choose the action for Play / Pause."
      ],
      "Sensors.Cooling": [
        "Cooling sensor",
        "Active during confirmed cooling. Losing connection is never treated as cooling complete."
      ],
      "Sensors.Fault": [
        "Fault sensor",
        "Report actual device faults; normal no_err does not trigger it."
      ],
      "Sensors.Hours": [
        "Light-hours sensor",
        "Optional sensor uses the lux unit to represent hours. Actual hours are also shown after a connection test."
      ],
      "Sensors.Ready": [
        "Projector Ready sensor",
        "Active when the projector reports running, not proof of HDMI content or picture-parameter readiness."
      ],
      "Sensors.Warming": [
        "Warming sensor",
        "Active only when the projector reports warming up; unavailable offline."
      ]
    },
    "overrides": "Capability overrides",
    "overridesHint": "Usually leave these on automatic detection. Enter only values your projector actually accepts.",
    "pairingHelp": "Run this plugin on a child bridge. In Apple Home, add the child bridge and each separately published TV using " +
      "Add Accessory → More Options.",
    "password": "Administrator password",
    "passwordHint": "Default: Projector. For passwordless ADCP, turn off Requires Authentication in the projector's web settings. T" +
      "he plugin detects authentication automatically.",
    "pictureModes": "Picture modes",
    "platformName": "Platform name",
    "pollInterval": "Poll interval (seconds)",
    "port": "Port",
    "portHint": "Leave blank for the default port. A custom port requires ADCP or SDCP, rather than Automatic.",
    "power": "Power",
    "projector": "Projector",
    "projectors": "Projectors",
    "protocol": "Control protocol",
    "protocolError": "The projector did not return a valid response. Check its control protocol and settings.",
    "readyTimeout": "Readiness timeout (seconds)",
    "release": "Release notes",
    "remote": "Remote keys",
    "remove": "Remove this projector",
    "removeConfirm": "Remove this projector from the configuration? Save to apply.",
    "report": "Report a problem",
    "save": "Save settings",
    "saveError": "Could not save settings. Your edits are kept here; try again.",
    "saved": "Settings saved. Restart the plugin child bridge to apply device changes.",
    "saving": "Saving…",
    "scope": "Apply to",
    "sdcp": "SDCP / PJ Talk",
    "security": "Projector security",
    "sensorHelp": "Ready follows the reported running state; it does not guarantee an HDMI picture. Warming and Cooling use obser" +
      "ved device states. Offline sensors are unavailable.",
    "settings": "Settings",
    "setupHelp": "Enable Remote Start / Network Management and ADCP (or PJ Talk) on the projector, and reserve a fixed IP addres" +
      "s.",
    "showPassword": "Show password",
    "standby": "Standby",
    "supported": "Supported",
    "test": "Test connection",
    "testHint": "Tests the values currently entered below, including unsaved changes. It does not turn on the projector or save" +
      " settings.",
    "testPatterns": "Test-pattern tokens",
    "testing": "Connecting…",
    "title": "Sony Projector Control",
    "tokensHint": "Comma-separated command tokens; leave blank for discovery.",
    "troubleshooting": "Troubleshooting",
    "unknown": "Unknown",
    "unsaved": "Unsaved changes",
    "unsupported": "Not supported",
    "username": "Administrator username",
    "validationCommunity": "SDCP community must contain four printable characters.",
    "validationDuplicate": "Each projector must have a unique address and stable ID.",
    "validationHost": "Enter a valid IP address or hostname.",
    "validationId": "Use 1–64 letters, numbers, underscores or hyphens for the ID.",
    "validationNumber": "Enter a whole number within the indicated range.",
    "validationPort": "Port must be a whole number from 1 to 65535.",
    "validationProtocol": "Select ADCP or SDCP when specifying a custom port.",
    "validationTokens": "Use lowercase command tokens containing letters, digits, underscores or dots.",
    "warming": "Warming up"
  },
  "zh-CN": {

    "accessoryLanguage": "家庭配件名称语言",
    "accessoryLanguageHint": "与界面语言分别设置，已自定义的配件名称会保留。",
    "adcp": "ADCP",
    "add": "添加投影仪",
    "additional": "其他设置",
    "advanced": "高级",
    "all": "全部投影仪（全局）",
    "aspects": "画幅命令值",
    "authError": "认证失败，请核对管理员密码和 Requires Authentication（需要认证）设置。",
    "auto": "自动检测（推荐）",
    "autoPowerHint": "默认关闭。关闭时，选择输入、画面模式或遥控操作不会唤醒待机的投影仪。",
    "autoPowerOn": "自动开机并等待就绪",
    "automations": "遥控、场景与自动化",
    "backupHelp": "迁移前请备份配置和配对数据，并停用旧插件对同一台投影仪的控制。无人观察时不要反复开关灯泡投影仪。",
    "blank": "画面静音",
    "brightness": "亮度",
    "busyError": "投影仪正在预热或冷却，请稍后重试。",
    "cancelledError": "连接测试已取消，请重试。",
    "capabilityHint": "在设置页测试连接后，可按该型号实际能力筛选功能。全局设置会根据各台设备的能力生效。",
    "categories": {

      "Aspect": "画幅",
      "Controls": "附加控制",
      "Device": "投影仪",
      "Inputs": "HDMI 输入",
      "Log": "日志",
      "Picture": "画面模式",
      "Remote": "Apple TV 遥控器",
      "Sensors": "自动化传感器"
    },
    "choices": {

      "blank": "切换画面静音",
      "enter": "确认",
      "fastforward": "快进键",
      "menu": "菜单",
      "next": "下一项",
      "none": "不执行操作",
      "playpause": "播放／暂停键",
      "prev": "上一项",
      "return": "返回",
      "rewind": "快退键"
    },
    "community": "SDCP 群组码",
    "communityError": "连接失败，请核对四位 PJ Talk 群组码。",
    "configError": "请检查地址、端口和控制协议后重试。",
    "connected": "连接成功",
    "contrast": "对比度",
    "cooling": "冷却中",
    "debug": "调试日志",
    "debugHint": "记录诊断用的协议通信，密码会隐藏。",
    "disabled": "停用",
    "discover": "自动检测",
    "effectiveOff": "当前有效：停用",
    "effectiveOn": "当前有效：启用",
    "effectiveValue": "当前动作",
    "enabled": "启用",
    "error": "异常",
    "faults": "故障报告",
    "featureGuide": "完整功能参考",
    "features": "功能选项",
    "firmware": "固件",
    "guide": "安装说明",
    "hdmi": "HDMI 输入",
    "hdrModes": "HDR 模式命令值",
    "help": "帮助",
    "hidePassword": "隐藏密码",
    "host": "IP 地址或主机名",
    "id": "固定设备标识",
    "idHint": "设置后请保持不变；更换地址时也不更改，以保留配件身份。",
    "inherit": "继承全局／使用默认值",
    "inputSource": "电视输入列表",
    "inputs": "输入命令值",
    "intro": "索尼 ADCP／PJ Talk 投影仪控制，可按需启用画面调节和自动化传感器。",
    "invalid": "请检查标出的输入项，再保存或测试。",
    "lampHours": "光源时长",
    "language": "界面语言",
    "lightHours": "灯泡／光源时长",
    "loadError": "无法读取插件设置，请关闭后重新打开此面板。",
    "model": "型号",
    "name": "名称",
    "networkError": "连接失败，请检查地址、控制协议、网络连通性和遥控开机设置。",
    "noProfiles": "请先在设置页添加投影仪。",
    "on": "运行中",
    "options": {

      "Aspect.Switches": [
        "画幅开关",
        "每个画幅单独显示一个开关。"
      ],
      "Controls.Brightness": [
        "亮度滑块",
        "调节图像亮度，不是灯泡或激光功率。"
      ],
      "Controls.Contrast": [
        "对比度滑块",
        "调节图像对比度。"
      ],
      "Controls.HDR": [
        "HDR 模式开关",
        "选择设备支持的互斥 HDR 模式。"
      ],
      "Controls.MatterPower": [
        "Matter 电源",
        "需要 Homebridge 2.3 以上，且本子桥启用 Matter；共用现有设备连接。"
      ],
      "Controls.PictureMute": [
        "画面静音",
        "关闭画面但保持投影仪开机。"
      ],
      "Controls.TestPatterns": [
        "测试图开关",
        "选择设备支持的高级测试图。"
      ],
      "Device": [
        "在 Apple 家庭中显示",
        "将这台投影仪提供给 HomeKit。"
      ],
      "Inputs.Switches": [
        "HDMI 独立开关",
        "分别显示 HDMI 开关；电视输入列表使用画面模式时同样可用。"
      ],
      "Log.Commands": [
        "家庭控制命令",
        "记录从 Apple 家庭发出的控制命令。"
      ],
      "Log.ExternalChanges": [
        "外部操作变化",
        "记录实体遥控器或其他控制端造成的状态变化。"
      ],
      "Picture.Switches": [
        "画面模式开关",
        "每个画面模式单独显示一个开关，供场景和自动化使用。"
      ],
      "Remote": [
        "启用遥控按键",
        "通过控制中心的 Apple TV 遥控器操作方向、确认、返回和菜单。"
      ],
      "Remote.Back": [
        "返回按钮",
        "选择返回按钮执行的动作。"
      ],
      "Remote.Info": [
        "信息按钮",
        "选择信息按钮执行的动作。"
      ],
      "Remote.PlayPause": [
        "播放／暂停按钮",
        "选择播放／暂停按钮执行的动作。"
      ],
      "Sensors.Cooling": [
        "冷却中传感器",
        "确认正在冷却时有效；连接中断不会被当作冷却完成。"
      ],
      "Sensors.Fault": [
        "故障传感器",
        "只报告实际故障，正常的 no_err 不会触发。"
      ],
      "Sensors.Hours": [
        "光源时长传感器",
        "此可选传感器借用照度单位表示小时；连接测试结果也会显示实际时长。"
      ],
      "Sensors.Ready": [
        "投影就绪传感器",
        "设备实际报告运行时有效，不保证 HDMI 有画面或画面参数已可用。"
      ],
      "Sensors.Warming": [
        "预热中传感器",
        "设备实际报告预热时有效，失联时不可用。"
      ]
    },
    "overrides": "手动指定设备能力",
    "overridesHint": "通常使用自动检测；仅填写这台投影仪实际支持的项目。",
    "pairingHelp": "建议使用独立子桥。在 Apple 家庭的“添加配件 → 更多选项”中，分别添加子桥和每台独立发布的电视配件。",
    "password": "管理员密码",
    "passwordHint": "默认密码 Projector。如需 ADCP 免密码控制，请在投影仪网页中关闭 Requires Authentication（需要认证）；插件会自动识别认证状态。",
    "pictureModes": "画面模式",
    "platformName": "平台名称",
    "pollInterval": "状态同步间隔（秒）",
    "port": "端口",
    "portHint": "留空使用默认端口；手动填写端口时，请明确选择 ADCP 或 SDCP，不能使用自动检测。",
    "power": "电源状态",
    "projector": "投影仪",
    "projectors": "投影仪",
    "protocol": "控制协议",
    "protocolError": "投影仪未返回有效响应，请检查控制协议和设备设置。",
    "readyTimeout": "就绪等待上限（秒）",
    "release": "版本说明",
    "remote": "遥控按键",
    "remove": "移除此投影仪",
    "removeConfirm": "从配置中移除此投影仪？保存后生效。",
    "report": "反馈问题",
    "save": "保存设置",
    "saveError": "保存失败，填写内容已保留，请重试。",
    "saved": "设置已保存。设备设置修改后，请重启本插件子桥使其生效。",
    "saving": "正在保存…",
    "scope": "设置范围",
    "sdcp": "SDCP／PJ Talk",
    "security": "投影仪网络安全",
    "sensorHelp": "投影就绪表示机器报告运行，不保证 HDMI 有画面。预热、冷却均以机器实际报告为准；失联时传感器显示不可用。",
    "settings": "设置",
    "setupHelp": "请在投影仪上开启 Remote Start／Network Management（遥控开机／网络管理）和 ADCP（旧型号为 PJ Talk），并为设备保留固定 IP 地址。",
    "showPassword": "显示密码",
    "standby": "待机",
    "supported": "支持",
    "test": "测试连接",
    "testHint": "使用下方当前填写的内容测试，包括尚未保存的修改；不会开机，也不会保存设置。",
    "testPatterns": "测试图命令值",
    "testing": "正在连接…",
    "title": "Sony Projector Control",
    "tokensHint": "多个命令值用英文逗号分隔；留空恢复自动检测。",
    "troubleshooting": "故障排查",
    "unknown": "未知",
    "unsaved": "有尚未保存的修改",
    "unsupported": "不支持",
    "username": "管理员用户名",
    "validationCommunity": "SDCP 群组码须为 4 个可打印字符。",
    "validationDuplicate": "每台投影仪的地址和固定标识必须各自唯一。",
    "validationHost": "请填写有效的 IP 地址或主机名。",
    "validationId": "设备标识须为 1 至 64 位字母、数字、下划线或连字符。",
    "validationNumber": "请填写提示范围内的整数。",
    "validationPort": "端口必须是 1 至 65535 的整数。",
    "validationProtocol": "填写自定义端口时，请选择 ADCP 或 SDCP 协议。",
    "validationTokens": "命令值只能包含小写字母、数字、下划线或点。",
    "warming": "预热中"
  }
};

export const selectLanguage = (saved, hostLanguage = "en") => [ "en", "zh-CN" ].includes(saved) ? saved :
  String(hostLanguage).toLowerCase().startsWith("zh") ? "zh-CN" : "en";
