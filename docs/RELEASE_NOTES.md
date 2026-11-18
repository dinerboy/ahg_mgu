AHG Control Center 1.4.2 - quicker gauges, gauges as Home, cleaner hybrid page, ambient removed.

- Gauges are the Home page now (the old 4-gauge Home is gone). 7 pages: Home, Controls, Hybrid, Drive, Warm-up, Health, System.
- Quicker dials: the DME values on screen are read together, up to 8 identifiers in ONE request every cycle (about 10x a second) instead of one value per request. A DME that refuses combined reads is detected and read one by one again. Values not on screen are read every 5 s, and nothing is read fast while the app is hidden.
- Lighter dials: the small and middle dials use a dial face compiled for their size (2.6k / 6.2k triangle cells instead of 14k each), about 5x less for the renderer on Home. Frames are capped at ~30 per second (the app may use 30 % of one core).
- Stability: a page that hits an unexpected reading shows the error and logs it instead of failing every frame; the 200 ms trip / warm-up timer can no longer end the app on an exception. Unused artwork (car photo, large logo, 1 MB) removed.
- Ambient light removed completely: colour presets, the ambient warning light and the ambient colour setter. The app no longer writes anything to the car's comfort functions.
- Hybrid page: the car illustration is replaced by a power flow diagram - HV battery, e-motor / 8HP and engine, with moving dots while power flows (blue from the battery, green back into it, the accent from the engine) and the power on each.
- Controls page: a flap status row (ECU read-back, DME, engine speed, hold, close guard) where the ambient presets were.

- Retains the coolant advisory colour correction: amber at 115 C, red at 120 C; these are app guidance, not factory overheating thresholds.
- 60 automated checks pass, including combined-read fallback and all seven pages with demo/no-data inputs. SDK-free OAP and USB archive validation completed.
- Crash handling and performance changes have been tested with simulated data; confirmation on the car is still pending.

AHG Control Center 1.4.1 - correct misleading coolant dial colours.

- Steady 110 C coolant is no longer inside the dial's red band.
- Coolant app advisory bands: amber from 115 C, red from 120 C. These are display guidance, not BMW's calibrated overheating thresholds.
- Existing Health CHECK thresholds are unchanged; 108 C oil / 110 C coolant passes the temperature item.
- Gauge face caches include their advisory band settings.
- Factory instrument warnings and a rising temperature still take precedence over app colours.
- 63 automated checks passed; package/archive validation completed.

AHG Control Center 1.4.0 - Claude's latest Gauges, Health and horsepower update.

- New Gauges page with boost target versus actual, eight selectable dials and an engine/electric power split.
- New Health page with misfire monitoring and saved PASS / CHECK / NO DATA reports; results are guidance, not a diagnosis.
- Additional read-only engine values and OBD monitor results, with ambient warning/ready colour support.
- Faster boost scheduling: dedicated read loop, bounded slow reads and back-off for unsupported reads.
- Power displayed in metric horsepower by default, with an hp / kW setting; logs retain kW for compatibility.
- Includes the prior Drive, Hybrid and Warm-up pages and current exhaust/ambient controls.
- App and package version set to 1.4.0 for MGU Store update detection.
- 63 automated checks passed; OAP archive, SDK exclusion, USB catalog hashes and ZIP integrity validated.

AHG Control Center 1.3.0 - Gauges, Garage health check, misfire monitor and ambient warning light.

- New Gauges page: boost target vs actual on one dial (target as an outline needle, actual in the accent, the difference underneath, plus load target / actual), eight dials you choose by tapping them (IAT, HPFP, LPFP, ignition timing, engine load, engine power / torque, electric power, gearbox oil, 12 V, HV battery temp and charge, oil, coolant, RPM, speed, misfires), and a power split bar: engine kW (crank torque x rpm from the sport display signals) next to electric kW (measured battery power).
- New Health page: live misfire monitor (counts per cylinder this driving cycle, from the DME's OBD on-board monitors) and the Garage health check. Run Check reads the engine fast for a few seconds and makes a PASS / CHECK / NO DATA report on misfires, boost target vs actual under load, load target vs actual, fuel pressures, ignition timing, 12 V, HV battery, oil / coolant temperatures, intake air and warm-up behaviour (stalled warm-up, cold over-revs). Reports are saved in the app's data folder (health/, last 20 kept). Limits are loose on purpose: CHECK means have a look, not a diagnosis.
- Misfire warning on every page when a cylinder passes 50 misfires this cycle, or the total passes 500 (setting Misfire warning).
- Ambient warning light (setting, on by default): the warning colour slot (default 2) while you rev a cold engine past the safe limit, a short flash of the ready slot (default 5) when the warm-up completes, then your own colour back. At most one change each 1.5 s; a colour you pick yourself meanwhile is kept. Set the two slots to the red and lime of your car's ambient menu.
- Engine values (all read-only, idrive7-apps car_vitals identifiers): IAT 22 F40F / OBD 0F, HPFP 22 F423 / OBD 23, LPFP 22 F40A / F422, timing OBD 0E, load 22 5813 / 480C, boost target / actual 22 4AB0 / 580B (or F470). They are read every 0.4-0.7 s while Gauges or Health is open and every 5 s otherwise, after boost and in the same one-request-per-cycle scheduler, so boost stays real time.
- The read-only diagnostic link now also passes OBD service 06 (monitor test results, one MID) for the misfire counts - only for this app's link, and still nothing that writes, codes or actuates.
- Power is shown in hp (metric, 1 kW = 1.36 hp, as BMW quotes it) on the Gauges and Hybrid pages; new setting Power unit switches back to kW. Logs and health reports keep kW.
- Side bar has 8 pages (Home, Gauges, Controls, Hybrid, Drive, Warm-up, Health, System); new settings for the Gauges dials, power split scale, ambient warning slots and misfire warning.
- 63 automated checks (new: misfire reader, engine values, health report, misfire alert, ambient warning light, service 06 gate).

AHG Control Center 1.3.0 - versioned release of the latest update.

- Publishes the latest 1.2.0 update as 1.3.0 so MGU Store can recognize a newer app version.
- Includes the DME boost fallback and Warm-up page, plus the existing live gauges, hybrid readers, drive logging, updated branding and exhaust/ambient controls.
- Application behavior is unchanged from the latest 1.2.0 build; the app and package versions are now 1.3.0.
- Install AHG-Control-Center-1.3.0-Store.zip through its USB catalog or use ahg_control_center@1.3.0.tgz through MGU Store.
- 52 automated checks; package validation covers SDK exclusion, catalog hashes and ZIP integrity.

AHG Control Center 1.2.0 - drive logging and UI cleanup.

- New Drive page (real data): live speed/RPM/oil/coolant, this drive's distance, time and maximums, and recent drives. The Hybrid page now appears only in demo mode, because the car has no verified hybrid source yet.
- Drive logging to CSV on the head unit, sampled on a timer so it keeps recording while navigation or another app is shown. Trip distance also counts while the app is hidden (before, it stopped when the app wasn't on screen).
- Home gauges default to RPM/oil/coolant/speed. Saved Boost/12 V choices are reset once, since they always showed NO SIGNAL on the car.
- Ambient presets are only remembered after the request goes through. On the car, the highlight follows the colour slot the car confirms.
- ASD/start-stop toggles are disabled on stock software instead of appearing to work.
- Needle damping uses real frame time, up to 0.5 s; previously it was capped at 0.1 s, which made needles lag about 2.5x at 4 fps.
- Larger text throughout. Flap status wraps instead of being cut off. Messages no longer cover the title. The status bar shows Flap/Mode/Speed/Oil/Trip/Log. The app log and signal viewer are paged. Version strings come from app.json.
- Controls polish: the exhaust photo is now the full hero of the flap card (the line-drawn pipe icon is gone), with a segmented Auto/Open/Closed control, a status chip, colour swatches for ambient presets and plain-English messages.
- Animated exhaust smoke on the hero photo: Open = both tailpipes, Closed = left tailpipe, Auto = a light wisp from both. On the car it follows the DME read-back (22 62FD), not the button press.
- Flap command reviewed: byte-identical to upstream Engine Config (2F 60FD 03 03E8 open, 2F 60FD 03 2328 close, 2F 60FD 00 hand-back to DME 0x12), pinned by tests through the full Controller -> DiagLink path.
- Real data from idrive7-apps: boost gauge from the sport display (passive), HV battery charge / voltage / current -> electric power and recuperation, and 12 V voltage via read-only diagnostic reads (kit/readonly-diag refuses anything but 0x22), HV temperature and eDRIVE needle (passive). Hybrid page is live again, next to Drive (5 pages). Home defaults: Boost, Oil, Coolant, RPM (saved choices reset once).
- Smoke: Open now smokes from both tips.
- After Hours Garage branding from the owner's identity package: primary logo on Home, AHG monogram in the side menu and as the app icon, matte black / off white palette.
- New Accent colour setting: Neon Lime (brand, default), Sport Red, Ice Blue, Night Amber, Violet, Off White. Meaning colours (hot zones, ARMED, REC) stay fixed.
- HV charge / 12 V no longer flicker to stale between their slower reads.
- Car build always ready: no Arm button, demo data or simulation switch on the head unit (simulation is the desktop emulator). Read-only DME detection at startup, retried by itself; nothing is sent until a mode is pressed. Hiding the app no longer hands the flap back; quitting does.
- ASD / start-stop switches removed (never available on stock software). Their row is now Hold Flap Position (default on, reset once) and Close Guard (tap to change the rpm).
- Boost fallback: when the sport display sends no boost (or only a constant 0), boost is read from the DME (read-only OBD/UDS F470 / F487 / F40B charge or manifold pressure minus F433 outside air pressure), as idrive7-apps car_vitals. The first raw sport-display value goes to the app log.
- Exhaust flap confirmed physically opening on a G30 530e (DME accepted 2F 60FD Open).
- Warm-up page (ported from idrive7-apps Warm-Up): oil, coolant and gearbox oil with a "ready in ~X min" from the measured warm-up rate, a 20-minute trend, and a safe rev limit that climbs from the cold limit (3500 rpm) to the redline (6500) as the oil warms. Gearbox oil from the gearbox unit (read-only EGS 22 6000, ZF 8HP) or the car's BasicDataSet signal.
- Cold over-rev warning on every page (flashing border + banner) when the revs pass the safe limit with cold oil; counted per cold start and logged. Advisory only - nothing is sent to the engine.
- Real-time boost: boost is read in its own loop (up to 10x per second); the slower hybrid / 12 V / gearbox reads run one request per cycle, with shorter timeouts, and back off (2 min, doubling to 10 min) when the car never answers them, so they can no longer stall boost.
- 53 automated checks, including drive-log CSV/summary tests.

AHG Control Center 1.1.1 fixes control status, diagnostic reconnect and live-signal freshness problems found after the first physical-car test.

Download AHG-Control-Center-1.1.1-Store.zip (USB catalog) or ahg_control_center@1.1.1.tgz (OAP app). See docs/INSTALL.md and docs/CONTROL_TESTING.md.

- Preserve flap detection/blocking errors instead of erasing them every 250 ms.
- Re-detect the DME when TASU becomes available after arming. Add Recheck and retry detection on an explicit control press. Reconnection does not replay an old override.
- Poll passive signal getters every second so unchanged values can remain fresh. Stop polling and suppress late callbacks on subscription shutdown.
- Add the upstream passive FES driving-mode field.
- Connect actual TASU/DME and subscription messages to Open Logs; export link status, adapter, blocking reason and bounded probe results with VIN omitted.
- Distinguish controller focus from an accepted request. No filled active flap button before acceptance; show press/tap instructions when no command was sent.

36 automated checks, including the real controller/DiagLink/Diag request-response path with simulated late TASU startup. Physical behavior on this exact car remains to be confirmed after updating. This is a hotfix, not a claim that all original dashboard features are implemented: real boost, voltage and hybrid readers are still absent; stock ASD and start-stop memory still have no supported real provider. No new actuator jobs or bypasses are added.
