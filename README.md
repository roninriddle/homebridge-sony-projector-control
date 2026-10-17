# Sony Projector Control

<img src="homebridge-ui/public/projector.svg" width="96" alt="Projector icon">

A test release combining Sony ADCP and SDCP/PJ Talk control, optional picture controls, independent observed-state Warming/Ready/Cooling automation sensors and optional Matter power.

**0.2.0-test is a prerelease.** VPL-HW69 passed supervised basic power, brightness/contrast and Ready/Cooling checks. VPL-VW598 has read-only identification/capability checks; its control acceptance is pending. Other models and optional functions require verification. See [validation scope](docs/Validation.md) and [中文说明](README.zh-CN.md).

## 中文介绍

索尼投影仪综合控制插件，支持 ADCP 和 SDCP／PJ Talk。可在插件设置页切换**简体中文／English**，管理员密码支持点击显示和隐藏；填写 IP 后，直接点击“测试连接”即可只读核验当前表单，无需先保存。

默认提供电视基础控制，高级亮度／对比度、画面模式、HDR 等按实际机型能力启用。独立的**预热中、投影就绪、冷却中**传感器可用于家庭自动化。界面语言与家庭配件名称语言分别设置，更新保留现有身份和配对。

完整配置、安装和迁移步骤见[中文说明](README.zh-CN.md)。此为 `0.2.0-test` 测试版：HW69 基础实机验收已通过，VW598 仅完成只读连接和能力核验，实际控制仍待验收。

## Settings in 0.2.0-test

- Switch the complete plugin interface between Simplified Chinese and English; the saved preference is separate from Home accessory names.
- Reveal or hide the administrator password. It starts masked each time the page or projector is opened.
- Use **Test connection** inside Settings with the current unsaved address, credentials, protocol and port. Testing never saves or powers on the projector.
- Enter Advanced ports as numbers (1–65535). A custom port requires an explicit ADCP/SDCP protocol.
- Sony Projector Control is the display name. The package name and platform alias remain unchanged so existing pairing identities survive an upgrade.

## Install
Download the `.tgz` from [GitHub Releases](https://github.com/roninriddle/homebridge-sony-projector-unified/releases), verify its SHA-256 against `SHA256SUMS`, and install it on the Homebridge host with `npm install -g /absolute/path/homebridge-sony-projector-unified-0.2.0-test.tgz`. This release is distributed through GitHub; it is not published to npm. Back up the existing configuration, stop the old plugin from controlling the same projector, and configure the `SonyProjectorUnified` platform on a child bridge. Pair both the child bridge and its separately published TV in Apple Home.

## Defaults
- Administrator username `root`, password `Projector`, both editable. ADCP uses only the password, not the username.
- To use passwordless control, turn off **Requires Authentication** in the projector ADCP web settings. No-auth mode is automatically detected; the plugin never changes this projector setting.
- TV power, HDMI and remote are available by default. Extra controls and sensors are opt-in.
- Input/mode/remote actions do not turn on the projector unless `autoPowerOn: true`.
- A stable explicit `id` preserves identity across address changes. Keep it unchanged.
- Optional functions are individually named bridged accessories, sharing one connection and poller. `language: "zh-CN"` uses Chinese names; the default is English.

## Capabilities
ADCP and SDCP detection; HDMI or picture modes in the TV picker; optional HDMI, picture-mode, aspect, HDR and test-pattern switches; brightness/contrast sliders; picture mute; errors and lamp hours; Warming/Ready/Cooling occupancy sensors; Matter power on Homebridge 2.3+ with Matter enabled. Availability depends on protocol and actual device capabilities.

Warming means confirmed warm-up, distinct from standby. Ready means the projector reports running, not proof of a valid HDMI picture. Cooling is never cleared merely because the connection fails. Offline and unknown sensor reads return No Response.

## Development
```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build-docs
npm run check-docs
npm pack
```

Use Node 22.20+, 24 or 26 (supported major versions only). Homebridge 1.8+ / 2.x; Matter requires 2.3+. Simulated protocol coverage does not prove model-specific hardware compatibility.

## Upstream
Derived from [Shivanath](https://github.com/shivanathd/homebridge-sony-projectors), with [Steven](https://github.com/steven-ward/Homebridge-Sony-ADCP-Projector-Plugin) advanced-control coverage and [Kerem](https://github.com/keremerkan/homebridge-sony-adcp) Matter/control ideas. MIT notices are preserved in LICENSE and NOTICE.md.
