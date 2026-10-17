# Sony Projector Unified changelog

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
