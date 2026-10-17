# Sony Projector Control · 索尼投影仪控制

<img src="homebridge-ui/public/projector.svg" width="96" alt="投影仪图标">

GitHub 预发布版 **0.2.2-test**，尚未发布到 npm。支持 ADCP、SDCP/PJ Talk；功能按每台投影仪实际能力显示。

HW69 已完成有人观察的开关机、亮度／对比度和就绪／冷却基础验收；VW598 已完成只读型号与能力查询，控制验收待完成。其他机型及高级功能须分别验证，详见[验证范围](docs/Validation.md)。

## 设置界面

- 页面右上角切换“简体中文／English”，覆盖设置、功能选项、帮助、状态与错误提示；点击“保存设置”保留选择。周边 Homebridge 对话框使用 Homebridge 自身的语言。
- 管理员密码默认隐藏，点击“显示密码／隐藏密码”切换；重新打开页面或切换投影仪后恢复隐藏。
- 在“设置”中填写 IP、用户名和密码后，点击同一表单内的“测试连接”。测试使用尚未保存的当前内容，包括高级页填写的协议和端口；只查询型号、固件、状态和能力，不保存、不自动开机。
- “高级 → 端口”为数字输入框，范围 1–65535；留空使用默认值，手动指定端口时须明确选择 ADCP 或 SDCP。
- “界面语言”与“家庭配件名称语言”分别设置；界面切换不改现有配对、自定义名称或设备标识。
- 投影仪图标用于设置页与本说明。Homebridge 插件列表的图标来自官方插件目录，并不读取插件内的自定义图标文件。

显示名称改为 **Sony Projector Control**，包名改为 `homebridge-sony-projector-control`，平台仍是 `SonyProjectorUnified`。从旧版本迁移时先备份并更新缓存关联；，保留固定 ID、桥身份与发现名称，无需重新配对。

## 安装与配对

1. 备份原配置。停用原插件对目标投影仪的控制，保留原插件及其恢复资料。
2. 从 [GitHub Releases](https://github.com/roninriddle/homebridge-sony-projector-control/releases) 下载安装包，核对 `SHA256SUMS`，在对应 Homebridge 主机运行 `npm install -g /完整路径/homebridge-sony-projector-control-0.2.2-test.tgz`。
3. 添加 `SonyProjectorUnified` 平台，建议使用独立子桥。不要同时运行两套插件控制同一投影仪。
4. 用户名默认 `root`、密码默认 `Projector`，可修改并测试连接。用户名是网页管理账号；ADCP 仅用密码认证。
5. 如需免密码控制，在投影仪网页的 ADCP 设置中关闭 **Requires Authentication**。插件识别无认证模式；它不会替你修改机器认证设置。
6. 固定投影仪地址，开启网络待机／遥控开机。保存后重启本插件子桥。
7. 在 Apple 家庭“添加配件 → 更多选项”分别添加电视；控制开关和传感器属于子桥，也要配对子桥。

## 推荐基础配置

```json
{
  "platform": "SonyProjectorUnified",
  "name": "Sony Projector Control",
  "projectors": [{
    "id": "theater-projector",
    "name": "影院投影仪",
    "language": "zh-CN",
    "host": "192.0.2.10",
    "username": "root",
    "password": "Projector",
    "protocol": "auto",
    "pollInterval": 10,
    "autoPowerOn": false
  }],
  "options": ["Enable.Sensors.Warming", "Enable.Sensors.Ready", "Enable.Sensors.Cooling"]
}
```

`id` 一经设置应保持不变；修改 IP 时不更换它。若未设置，兼容性回退为由地址生成身份。

`language: "zh-CN"` 预设中文功能名称；默认 `en` 使用英文。高级功能各自作为有明确名称的独立桥接配件显示，例如“HW69 亮度”“HW69 预热中”“HW69 冷却中”，避免多个功能只显示通用的“灯／人体感应器”。它们共用同一个投影仪连接和轮询，重启后保留通过名称特征写入的自定义名称。由 test.1 升级时旧的组合 Controls 配件会被这些独立配件替换，请重建关联自动化。

## 预热与冷却自动化

- **Projector Warming（预热中）**：机器实际报告预热时有效，与待机、投影就绪区分。
- **Projector Ready（投影就绪）**：机器实际报告 `on` 时有效；预热时无效。不是 HDMI 有信号或画面稳定的证明。
- **Projector Cooling（冷却中）**：机器实际报告冷却时有效，确认待机后无效。
- 三者均为独立占用传感器，可用于家庭自动化。断网、认证失败、未知状态时显示无响应，不把失联当作冷却完成。
- 实体遥控器开关机同样会同步。
- 开关机命令被接受后的预测状态不触发传感器，传感器等待真实查询。

## 按需开启功能

在 Feature Options 选择全局或单台投影仪的功能。详见 [完整选项](docs/FeatureOptions.md)。

| 功能 | 选项 |
|---|---|
| HDMI 独立开关 | Enable.Inputs.Switches |
| 画面模式开关 | Enable.Picture.Switches |
| 画幅开关 | Enable.Aspect.Switches |
| 画面静音 | Enable.Controls.PictureMute |
| 亮度／对比度滑块 | Enable.Controls.Brightness / Enable.Controls.Contrast |
| HDR／测试图 | Enable.Controls.HDR / Enable.Controls.TestPatterns |
| 故障／灯泡时长 | Enable.Sensors.Fault / Enable.Sensors.Hours |
| Matter 电源 | Enable.Controls.MatterPower |

亮度是图像亮度，不是灯泡／激光功率。灯泡形状的亮度／对比度控件只调数值，点击其开关不会关闭投影仪。时长优先在设置页查看；可选 HomeKit 时长传感器借用照度单位，数值表示小时而不是实际照度。

电视输入列表可设 `inputSource: "pictureModes"`；此时可开启 HDMI 独立开关。只列出常用画面模式时，实体遥控器选到列表外模式可能无法显示准确名称。

## 可选自动开机

`autoPowerOn: true` 会在选择输入／模式或发送遥控操作前开机并等待实际就绪，默认关闭。`readyTimeout` 默认 120 秒、范围 10–300 秒。等待期间发出关机请求或关闭子桥，会取消尚未执行的操作。等待较长时，家庭 App 可能先显示响应较慢。

## Matter

需要 Homebridge 2.3+ 并在本插件子桥启用 Matter，只额外暴露电源。与电视共用通信和状态，不添加另一个轮询器。Apple 家庭已有 HomeKit 电视时，重复添加 Matter 电源会出现另一张电源卡片。

## 能力覆盖

优先自动查询；旧固件无法报告选项时，可在单台配置的 `capabilities` 中指定 `inputs`、`pictureModes`、`aspects`、`hdrModes`、`testPatterns` 列表或亮度／对比度等支持标记。填写机器实际接受的命令值，不强行给 HW 机型开启 HDR。

## 旧配置转换

```sh
node scripts/migrate-config.mjs old-config.json new-platform.json
```

转换器只读取旧配置，拒绝覆盖目标文件，输出权限为仅当前用户读写。支持三个上游的平台配置；不复制旧子桥配对身份。输出可能包含你的密码，请勿上传或加入版本控制。转换后复核名称、模式命令和选项，再配对新配件、重建自动化。

## 验收与恢复

测试包括认证／免认证、待机唤醒、完整预热冷却、HDMI、实体遥控器同步、网络故障恢复和子桥重启。模拟通过、只读连接成功、现场功能通过分别记录。未验证的机型和 Matter 控制器均不声称实机兼容。

恢复时先停止新插件子桥，再恢复旧配置并启用原插件。不得删除原配对数据或备份来试图修复连接。

电视是单独发布的 HomeKit 配件，有自己的通信端口。跨网段测试时，建议在该 Homebridge 实例的完整配置顶层设置固定 `ports` 范围；范围须有足够空闲端口容纳所有外部配件。该设置属于 Homebridge，不放在插件 `projectors` 中。插件会保存电视初次广播的名称，之后调整配置名称或家庭内显示名称不改变这一发现入口。

## 0.2.2-test 使用说明

功能页按模块收起；展开后点击功能名称可查看说明。Apple TV 遥控器停用时，下属按键选项隐藏，已有选择保留，重新启用后恢复。界面语言默认跟随 Homebridge，手动选择后保存。

移除投影仪采用页面内二次确认，随后点击保存。保存遇到缺失或重复地址，会定位有问题的投影仪并显示提示；移除全部投影仪后允许保存空列表。

待机时亮度、对比度显示关闭，使用最后一次实际读取并保存的数值；首次没有读数时使用 0。此时不会读取实时画面，也不会发送参数或开机指令。连接故障仍显示未响应。

Homebridge UI 5.29.0 的插件卡片图标仅来自官方目录。对于本地私有安装，可手动运行 `node scripts/install-homebridge-ui-icon.mjs <homebridge-config-ui-x绝对路径>`，脚本只增加本插件图标，并在原文件旁保存 `.before-sony-projector-control` 备份。重启 Homebridge UI 后生效。恢复时把备份复制回原文件；UI 升级会覆盖此适配，其他版本脚本会拒绝修改。

## 滑动开关与默认设置

功能选项的启用／停用使用 iOS 样式开关：绿色为启用，灰色为停用。点击开关会为当前设置范围保存明确选择；点击旁边「恢复默认」可回到全局继承或插件默认值。下方文字显示当前有效状态与继承来源。遥控动作等有多个值的选项仍用下拉菜单；窄屏下控件自动换行，避免文字被截断。Apple TV 遥控器主开关关闭后，下属设置收起；再打开时恢复原来的选择。最后点击「保存设置」。
