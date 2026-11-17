AHG Control Center 1.0.0 is the first emulator-verified native MGU Store package for ID7. Vehicle validation is pending, so this is a prerelease.

Download **AHG-Control-Center-1.0.0-Store.zip** for a ready USB catalog, or **ahg_control_center@1.0.0.tgz** for the OAP app archive. Installation instructions are in `docs/INSTALL.md` in the repository. The ZIP is not itself an OAP package.

Includes four functional pages, photographic metal gauge faces, independently animated needles, car/exhaust artwork, native touch/controller targets, local settings and diagnostic export. Demo is labeled; on-car default is read-only with no synthetic fallback. RPM, speed and oil/coolant temperatures subscribe to known optional interfaces. Other vehicle data remains unavailable without a verified source.

Exhaust flap, ASD, start-stop memory and vehicle ambient control are disabled. Engine Config's existing flap implementation is referenced, but exact G30 530e adapter compatibility is not established. This release does not flash, configure SSH or obtain keys. No OEM SDK or renderer binary is bundled. MGU Store uses an existing stock BMW donor SDK.

Tested in the upstream WASM/GPU emulator on Windows, plus Node unit, renderer recording and Node 8 syntax tests. Not yet tested on a physical vehicle. The UI follows the supplied reference's composition but adapts it to native MGU dimensions and reserved HMI areas.
