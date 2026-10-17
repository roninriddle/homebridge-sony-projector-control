# 0.2.2-test

- 启用／停用改为 iOS 风格滑动开关，保留继承来源及恢复默认；窄屏动作选择自动换行。
- 修复英文文案拼接、生成加载器扫描解析与测试模拟器动态赋值告警；增加官方协议认证测试向量与安全研判。
- 统一 CodeQL 初始化／分析版本，合入五条依赖升级并将后续 Actions 更新分组；启用仓库依赖图谱和漏洞告警。

# 0.2.1-test

- 修复内嵌页面移除、无效配置导致保存无提示的问题，允许空列表持久化。
- 正式包名 Sony Projector Control，保留旧配对 UUID 与平台别名兼容；提供 Homebridge UI 5.29 图标适配。
- 待机滑块显示关闭及最后实测数值，重启后保留，离线仍不可用。
- 功能模块折叠，遥控器停用后隐藏下属设置。
- 跟随 Homebridge 语言，补齐中文帮助与 README。

# Sony Projector Control changelog

## 0.2.0-test (2026-10-17)

- Rename the display name to Sony Projector Control; retain package/platform identifiers and pairing continuity.
- Add an original SVG projector icon to Settings and README, plus a Chinese introduction in the main GitHub README.
- Add complete Simplified Chinese / English plugin settings, feature descriptions, help, validation and connection status, with an independently saved interface preference.
- Add masked administrator-password reveal/hide and reset masking on navigation.
- Move Test connection into Settings; use the current unsaved address, credentials, explicit protocol and numeric port without saving or powering on.
- Replace Advanced port sliders with bounded integer inputs; reject invalid or ambiguous custom ports before probing.
- Preserve hidden/unknown configuration, feature scopes and Homebridge pairing metadata while staging edits.

## 0.1.0-test (2026-10-17)

- First public GitHub prerelease, combining the local test.1–test.3 work below.
- Unified ADCP/SDCP, optional advanced controls and Matter power, configurable identities and connection testing.
- Independently named Warming, Ready and Cooling sensors driven by observed device state.
- Stable external TV discovery names, configurable Chinese/English accessory labels and offline migration from three upstream configurations.
- HW69 basic physical acceptance passed; VW598 read-only preparation passed, physical control acceptance pending. See docs/Validation.md.
- GitHub release assets only; no npm publication.

# Earlier local test builds

## 0.1.0-test.3 (2026-10-17)

- Persist the external TV discovery name independently of its editable Home name and device configuration name, preserving discovery across restarts.
- Document stable Homebridge external port allocation for routed-network testing.

## 0.1.0-test.2 (2026-10-17)

- Publish optional functions as individually named accessories with a primary service and English/Chinese labels. Preserve custom names over restart.
- Add an independent observed-state Warming automation sensor alongside Ready and Cooling.
- Match settings UI device IDs to runtime normalization so mixed-case IDs keep per-device options.

## 0.1.0-test.1 (2026-10-16)

- Unified optional controls, stable configured identities and offline migration.
- Ready/Cooling sensors based on observed power; atomic observations and offline/unknown read errors.
- Optional auto-power-and-wait with cancellation; Matter power using the existing controller.
- Editable root/Projector defaults and read-only connection test panel.
- Hardware acceptance is pending; upstream history follows.

# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/).

## Upstream 0.1.0 (2026-09-27)

First release.

- Dynamic platform plugin for Homebridge 1.8+ and 2.x, Node.js 22.20+, 24 and 26.
- ADCP transport with SHA-256 challenge-response authentication, line framing, command pacing and capability discovery (`--info`).
- SDCP / PJ Talk transport for older projectors, with protocol auto-detection.
- Television accessory per projector: power, HDMI inputs (names and visibility remembered), Apple TV Remote keys, "View TV Settings" opens the menu.
- Optional companion accessory: picture-mode and aspect-ratio switches, Picture Mute, "Projector Ready" and "Projector Cooling" occupancy sensors, fault status.
- Feature options (global and per projector) with a UniFi Protect-style settings UI, first-run connection test and projector info panel.
- Coded errors (`SPJ-*`) with fixes in the log, de-duplicated failure logging with recovery messages, and a troubleshooting guide by code.
- No Response in HomeKit while a projector is unreachable; failed commands are reported to HomeKit as failed; no unhandled promise rejections.
