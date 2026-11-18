AHG Control Center 1.2.0 - drive logging and UI cleanup.

- New Drive page (real data): live speed/RPM/oil/coolant, this drive's distance, time and maximums, and recent drives. The Hybrid page now appears only in demo mode, because the car has no verified hybrid source yet.
- Drive logging to CSV on the head unit, sampled on a timer so it keeps recording while navigation or another app is shown. Trip distance also counts while the app is hidden (before, it stopped when the app wasn't on screen).
- Home gauges default to RPM/oil/coolant/speed. Saved Boost/12 V choices are reset once, since they always showed NO SIGNAL on the car.
- Ambient presets are only remembered after the request goes through. On the car, the highlight follows the colour slot the car confirms.
- ASD/start-stop toggles are disabled on stock software instead of appearing to work.
- Needle damping uses real frame time, up to 0.5 s; previously it was capped at 0.1 s, which made needles lag about 2.5x at 4 fps.
- Larger text throughout. Flap status wraps instead of being cut off. Messages no longer cover the title. The status bar shows Flap/Mode/Speed/Oil/Trip/Log. The app log and signal viewer are paged. Version strings come from app.json.
- Controls polish: the exhaust photo is now the full hero of the flap card (the line-drawn pipe icon is gone), with a segmented Auto/Open/Closed control, a status chip, colour swatches for ambient presets and plain-English messages.
- 38 automated checks, including drive-log CSV/summary tests.

AHG Control Center 1.1.1 fixes control status, diagnostic reconnect and live-signal freshness problems found after the first physical-car test.

Download AHG-Control-Center-1.1.1-Store.zip (USB catalog) or ahg_control_center@1.1.1.tgz (OAP app). See docs/INSTALL.md and docs/CONTROL_TESTING.md.

- Preserve flap detection/blocking errors instead of erasing them every 250 ms.
- Re-detect the DME when TASU becomes available after arming. Add Recheck and retry detection on an explicit control press. Reconnection does not replay an old override.
- Poll passive signal getters every second so unchanged values can remain fresh. Stop polling and suppress late callbacks on subscription shutdown.
- Add the upstream passive FES driving-mode field.
- Connect actual TASU/DME and subscription messages to Open Logs; export link status, adapter, blocking reason and bounded probe results with VIN omitted.
- Distinguish controller focus from an accepted request. No filled active flap button before acceptance; show press/tap instructions when no command was sent.

36 automated checks, including the real controller/DiagLink/Diag request-response path with simulated late TASU startup. Physical behavior on this exact car remains to be confirmed after updating. This is a hotfix, not a claim that all original dashboard features are implemented: real boost, voltage and hybrid readers are still absent; stock ASD and start-stop memory still have no supported real provider. No new actuator jobs or bypasses are added.
