# Roadmap

## 0.1.0-test

Unified ADCP/SDCP, optional picture controls, separately named Warming/Ready/Cooling sensors, optional shared Matter power, connection testing and configuration migration are implemented. HW69 basic supervised acceptance is complete; VW598 has read-only preparation. See [Validation](Validation.md) for limits.

## Next validation

- Supervised VW598 pairing, power, brightness/contrast, HDR and test-pattern checks, restoring original values.
- Remaining HW69 inputs, picture modes, aspect, remote keys and Home automations.
- Matter controller pairing and physical SDCP model coverage.
- Long-term stability and model-specific reports before a stable release.

## Later decisions

npm distribution and Homebridge verification are not part of this GitHub test release. SDAP discovery and additional model-specific features remain candidates. Historical upstream design records are retained under `adr/` and `research/`; their original plans are not current release guarantees.
