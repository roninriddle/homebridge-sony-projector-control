# Sony Projector Unified

A test release combining Sony ADCP and SDCP/PJ Talk control, optional picture controls, independent observed-state Warming/Ready/Cooling automation sensors and optional Matter power.

**0.1.0-test is a prerelease.** VPL-HW69 passed supervised basic power, brightness/contrast and Ready/Cooling checks. VPL-VW598 has read-only identification/capability checks; its control acceptance is pending. Other models and optional functions require verification. See [validation scope](docs/Validation.md) and [中文说明](README.zh-CN.md).

## Install
Download the `.tgz` from [GitHub Releases](https://github.com/roninriddle/homebridge-sony-projector-unified/releases), verify its SHA-256 against `SHA256SUMS`, and install it on the Homebridge host with `npm install -g /absolute/path/homebridge-sony-projector-unified-0.1.0-test.tgz`. This release is distributed through GitHub; it is not published to npm. Back up the existing configuration, stop the old plugin from controlling the same projector, and configure the `SonyProjectorUnified` platform on a child bridge. Pair both the child bridge and its separately published TV in Apple Home.

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
