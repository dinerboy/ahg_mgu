# Install AHG Control Center 1.4.0

Target: BMW MGU iDrive 7 (ID7), not ID8. This is an OAP app package, not firmware and not a Windows executable. Vehicle operation has not yet been validated on the owner's exact G30 530e firmware. Keep existing apps and their configuration in place.

## USB package

1. Download `AHG-Control-Center-1.4.0-Store.zip` from the GitHub release and extract it.
2. Copy its `mgu-repo/AHG-Control-Center` directory to a USB stick, preserving the `catalog.json` and adjacent `.tgz` files. The stick should contain `mgu-repo/AHG-Control-Center/catalog.json`.
3. Connect the stick to an already configured MGU Store installation. Select the USB folder source, locate **AHG Control Center**, and install it through Store.
4. Launch the AHG tile. Start with the vehicle stationary. The car build uses real data and read-only control detection from startup. No Arm button is required; a control press is required to actuate. Unknown values are expected where a signal is unsupported.
5. To remove it, use MGU Store → Installed → AHG Control Center → Remove. No other app is part of this package.

The ZIP is only a transport container; do not feed the ZIP directly to an OAP package installer. The `.tgz` inside is the installable OAP package. The catalog contains its exact size and SHA-256 digest. `SHA256SUMS.txt` covers both downloadable archives.

## GitHub source

Add `https://github.com/dinerboy/ahg_mgu` as a source in MGU Store. Choose Tags (`v1.4.0`) or the `main` branch to build the app using `mgu-repo.json`; this needs the upstream `mgu-python` tool (Python 3.12). Choose Releases to install the prebuilt `.tgz` asset instead. If a Store version does not offer prereleases, use the USB package or Tags source.

MGU Store generates the missing `oap-sdk` module from a compatible stock BMW donor already on the head unit. No OEM SDK is included here. If donor discovery, permissions, deployment or renderer setup fails, resolve that in the existing Store/toolkit; this app does not bypass it. The upstream GPU renderer is recommended. Its slower software fallback remains available with native page/settings buttons.

## Initial checks

Confirm navigation, settings and BACK/HOME first. Compare RPM/speed/temperatures to trusted existing instruments; unsupported values must remain unavailable. Do not treat demo values as measurements. Flap Open/Closed/Auto (OEM) and ambient preset buttons can send supported vehicle commands after compatible DME detection. Stock ASD and start-stop controls are not provided. Review `CAPABILITIES.md` before evaluating vehicle signals.

This release neither enables/disables SSH nor flashes a car. Those earlier requested Windows installer functions are separate.

Control testing instructions: [CONTROL_TESTING.md](CONTROL_TESTING.md). Update through Store; reinstall if the new diagnostic and colour permissions require it. Existing settings may be retained. Simulation remains a desktop-emulator feature.
