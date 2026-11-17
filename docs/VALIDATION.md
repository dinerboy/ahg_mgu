# Validation — 1.1.0

Validated on Windows using the actual upstream WASM/native mgu-render/1 emulator at 1920×720. All four pages are recorded by automated tests; the Controls page was exercised through real touch routing. Open, Closed and Auto/OEM select independently; ASD/start-stop toggles and ambient preset slots respond in simulation. Screenshots are direct emulator exports. The emulator always forces simulation, even when Vehicle is selected.

Automated checks cover: passive signal decoding, invalid/stale signals, source provenance, derived boost, damping/trip gaps/settings; all four page targets; Node 8 syntax; no startup probes, session arming, no real writes in demo/emulator, unsupported DME refusal, stock ASD/start-stop refusal, exact existing MG1 request bytes, fresh-RPM close guards, above-limit OEM and hysteresis, RPM-loss OEM latch, disarm/OEM return, colour request struct, independent colour status confirmation, rate limiting and setter failures. Packaging checks verify OAP/RHMI metadata, SDK exclusion, catalog hashes and ZIP integrity.

Outstanding: physical ID7 installation, donor SDK compatibility, exact 530e DME acceptance and flap movement, real ambient slots/colours, physical input behavior, transport-loss/forced-kill behavior and prolonged hardware operation. ECU read-back is not proof of physical position. No car was actuated, flashed or installed during desktop validation.

Observed desktop rendering was around 35–42 fps active with background throttling. This is not a vehicle performance certification. GitHub Actions could not start for the first release because GitHub reported an account billing lock; local verification is the release evidence.
