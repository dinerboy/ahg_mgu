AHG Control Center 1.1.0 adds control testing for the stock 530e setup. Physical vehicle validation remains pending, so this is a prerelease.

Download **AHG-Control-Center-1.1.0-Store.zip** for the USB catalog, or **ahg_control_center@1.1.0.tgz** for the OAP package. Read docs/CONTROL_TESTING.md and docs/INSTALL.md first.

- Real Engine Config MG1 exhaust Open / Closed / Auto (OEM), behind a per-session Arm button and compatible DME capability probe.
- Fresh real RPM close guard, RPM-loss OEM return, optional 15-second hold (default off), and OEM hand-back attempted on disarm/hide/shutdown.
- Real ambient-colour slots via the upstream ComfortFunctionIuK setter, configurable per preset, with rate limiting and independent status read-back.
- All control groups interactive in explicitly labelled simulation. Emulator/demo always prevents vehicle writes.
- Stock ASD and start-stop memory remain simulation-only: no supported stock write is present in the referenced implementations. The UI reports the reason in vehicle mode.
- Local diagnostics include command state. No flashing, tuning, xDrive or SSH operations are invoked.

Desktop unit and native emulator tests pass. No proprietary SDK is included; MGU Store supplies its existing BMW donor SDK. GitHub-hosted CI was unavailable due to the account's billing lock; use the locally built release assets.
