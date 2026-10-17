# Validation scope — 0.2.2-test

This is an early test release, not a claim of universal Sony compatibility.

| Area | Verified | Pending |
|---|---|---|
| Automated software | 178 tests on Node 22.22.2 and 24.19.0; lint, typecheck, build, generated docs and package checks | Long-term unattended stability |
| VPL-HW69, firmware 4.000, ADCP | Apple Home power on/off, observed warm-up/running/cooling/standby, visible brightness and contrast changes with original values restored, Ready/Cooling changes confirmed by a person observing the machine | HDMI, picture modes, aspect, remote keys, independent warming automation and Matter pairing |
| VPL-VW598, firmware 5.003, ADCP | Read-only identification, standby state and advertised capabilities including brightness/contrast and HDR/test patterns | Observed pairing/control cycle, picture/HDR/test-pattern writes and restoration |
| SDCP / PJ Talk | Simulated protocol coverage | Physical-model validation |
| Other Sony models | Capability probing and manual overrides implemented | Model-specific validation |

A device reporting `on` does not guarantee an HDMI picture or immediate availability of picture parameters. HW69 picture settings became readable after the reported running state. Unknown/offline readings are unavailable; they do not prove cooling has ended.

Before migration, back up the original Homebridge configuration and pairing data. Keep a stable projector `id`, and use sufficient fixed Homebridge external ports where routed networking requires them. Disable the old controller for the same projector. Restore original picture settings after supervised testing. Do not perform unattended lamp-projector power cycles.

## Settings interface validation

The 0.2.2-test browser fixture covers password reveal/remasking, numeric port boundaries, current unsaved connection fields, complete Chinese/English settings and feature labels, scoped options, saved language and edit retention after reopening. Connection testing uses read-only `/probe`; fixture tests never address real projectors. Managed-instance upgrade and connection checks are recorded separately from physical acceptance.

The 0.2.2-test regression suite also covers switch semantics, per-device inheritance/reset, the upstream-loader overlay, literal emulator command assignments, and Sony's independent authentication vector. CodeQL alerts and dependency-PR status are verified separately from a successful workflow; protocol triage is documented in [SecurityTriage.md](SecurityTriage.md). This does not expand the physical acceptance described above.
