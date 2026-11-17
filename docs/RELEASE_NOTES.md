AHG Control Center 1.1.1 fixes control status, diagnostic reconnect and live-signal freshness problems found after the first physical-car test.

Download AHG-Control-Center-1.1.1-Store.zip (USB catalog) or ahg_control_center@1.1.1.tgz (OAP app). See docs/INSTALL.md and docs/CONTROL_TESTING.md.

- Preserve flap detection/blocking errors instead of erasing them every 250 ms.
- Re-detect the DME when TASU becomes available after arming. Add Recheck and retry detection on an explicit control press. Reconnection does not replay an old override.
- Poll passive signal getters every second so unchanged values can remain fresh. Stop polling and suppress late callbacks on subscription shutdown.
- Add the upstream passive FES driving-mode field.
- Connect actual TASU/DME and subscription messages to Open Logs; export link status, adapter, blocking reason and bounded probe results with VIN omitted.
- Distinguish controller focus from an accepted request. No filled active flap button before acceptance; show press/tap instructions when no command was sent.

36 automated checks, including the real controller/DiagLink/Diag request-response path with simulated late TASU startup. Physical behavior on this exact car remains to be confirmed after updating. This is a hotfix, not a claim that all original dashboard features are implemented: real boost, voltage and hybrid readers are still absent; stock ASD and start-stop memory still have no supported real provider. No new actuator jobs or bypasses are added.
