# 安全扫描研判 / Security scanning decisions

## Sony ADCP challenge authentication

CodeQL `js/insufficient-password-hash` flags the SHA-256 operation in `hashChallenge`. This operation implements Sony's fixed wire authentication and is **not a password-storage KDF**. Sony requires SHA256(random challenge + administrator password) and a 64-character hexadecimal response. Replacing it with Argon2, bcrypt or PBKDF2 would break authenticated projector connections.

Primary specification: [Sony Protocol Manual, section 4-2-3, printed page 13](https://pro.sony/s3/2018/07/03140912/Sony_Protocol-Manual_1st-Edition-Revised-2.pdf#page=14). The parser tests include Sony's independent known-answer vector. The fake projector uses this same protocol helper rather than duplicating hashing code; transport tests also cover successful/failed authentication and trace redaction.

The password-storage finding on this specific operation is classified as a false positive, with this documented reason in the GitHub alert. This does not claim the ADCP protocol provides modern password-storage or encrypted-transport guarantees. Credentials, hashes and pairing data must stay out of public logs; use a trusted projector network. The general CodeQL rule remains enabled.

## Other findings addressed in 0.2.2-test

- Five English-copy concatenation warnings: source lines split only at word boundaries, preserving the exact displayed messages.
- Inline-loader parser note: after the upstream UI generator, an idempotent native-page overlay removes the obsolete `webUi.mjs` capability diagnostic. The boot monitor, manifest loading and import map remain. New builds and tests validate the overlay.
- Fake ADCP command assignment: brightness and contrast now write literal property names after allowlist validation. The emulator listens only on loopback, is excluded from the installed package, and has malformed-command regression coverage.
- Dependency review: the repository dependency graph and vulnerability alerts are enabled. All security workflows remain enabled.
- CodeQL action versions move together; Dependabot GitHub Actions updates are grouped so init/analyze cannot be proposed as incompatible independent upgrades again.

GitHub workflow success means the scanner completed. Open findings are checked separately; this document does not replace that readback.
