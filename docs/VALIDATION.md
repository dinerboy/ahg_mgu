# Validation

Validated on Windows with the actual toolkit emulator and native `mgu-render/1` WASM renderer at 1920×720. Screenshots in `screenshots/` are direct emulator exports. Home, Controls, Hybrid and System were reviewed. Touch opened Signal Viewer and exported local diagnostics. Emulated controller rotation/press opened the native settings sheet; BACK returned to the app picker and the app reopened successfully. Demo-off Home showed unavailable readings and no active needles. Desktop observation was approximately 35–42 fps active, with 1 fps background throttling; this is not a 60 fps vehicle certification.

`npm test` covers signal decoding/invalid sentinels, source provenance, stale detection, derived boost, bounded damping, trip gaps, settings validation, unsupported controls, all four page recordings with demo/no data, safe input target bounds, and Node 8 syntax. The package script checks OAP entry point, RHMI data, compatibility metadata, optional read-only permissions and absence of OEM SDK files.

An emulator rendering issue was resolved by inlining dial triangle geometry into each cached gauge face. The upstream native renderer intentionally ignores nested layer instructions. Car/exhaust artwork uses supported top-level cached layers. The software fallback uses the kit's rasterizer and is slower.

Outstanding: installation on physical ID7, donor SDK compatibility, exact firmware signal availability/units, real touch/controller behavior, startup memory/performance and endurance on the head unit. No vehicle flashing, diagnostic actuator requests or vehicle installation was performed during desktop validation.
