# AHG Control Center capabilities

This app targets iDrive 7 MGU and the existing idrive7-apps kit pinned in
`upstream-lock.json`. No G30 530e or car-extracted OEM SDK was available on this PC.
An upstream-supported SDK-free Store package is prepared; the Store supplies
`oap-sdk` from an owner's installed BMW donor app. Emulator evidence is not vehicle validation.

## Read-only API evidence

| Reading | Verified upstream API and conversion | AHG status |
|---|---|---|
| Engine RPM | `CDS.statusEngineSpeed2.actualValueRPMEngineCrankshaft`, raw × 0.25; 65535 invalid | Passive getter/subscription; target vehicle unverified |
| Coolant °C | `CDS.statusEngineTemperature.temperatureEngineDrive`, raw − 48; 255 invalid | Passive getter/subscription; target vehicle unverified |
| Oil °C | `CDS.statusEngineTemperature.temperatureEngineOilDrive`, raw − 48; 255 invalid | Passive getter/subscription; target vehicle unverified |
| Speed km/h | `Vehicle2.statusCarSpeed2.speedVehicleCentreOfGravity`, raw / 64; 65535 invalid | Passive getter/subscription; target vehicle unverified |
| Boost | Upstream M Vitals uses FES/diagnostic sources with vehicle-specific assumptions | Unavailable on car in V1; no absolute-pressure substitution |
| 12 V voltage | Upstream eDrive uses additional diagnostic readers | Unavailable on car in V1; never inferred from HV charge |
| HV battery, EV range, electric power, charging | Upstream eDrive has diagnostic/variant-dependent readers; a 12 V CDS charge field is **not** HV SOC | Demo only; unavailable on car |
| Drive mode, flap position, ASD, faults | Not subscribed by this app; fault reader not installed | Unknown / not scanned; never shown healthy by default |
| CPU/RAM/storage | Node `os` and `/proc`/`fs.statfs` when supported | Actual local OS metrics, separate from vehicle telemetry |

Evidence: pinned `kit/runtime/car.js` SCALE/SIGNALS/watch handlers,
`apps/car_vitals/main.js` temperature/RPM subscriptions and its app manifest,
`apps/edrive/main.js` statusBattery2 (12 V) and `battery12.js`, `live.js`.
References: https://github.com/cauliflowermossgrape/idrive7-apps,
https://github.com/arefahmad/idrive7-apps (read-only app patterns),
https://github.com/bimmer-lab/apps (kit rendering patterns).

Only the two optional CDS / Vehicle2 proxies are requested, with `rs` access.
There are no diagnostic method permissions, setters, bus writes, scan requests,
network listeners, service changes, or SSH operations in the app. Missing or
invalid values remain unavailable. Successful samples expire after 3 seconds.
Subscriptions are released on provider change and shutdown; failed setup retries
with bounded backoff. Data from the emulator is always labeled DEMO/EMULATOR.
The on-car demo setting defaults to Off with no automatic fallback.

## Rendering and controls

### Engine Config exhaust integration reference

The existing upstream app `apps/live_adjustments/app.json` is **Engine Config
0.9.8**. It has real exhaust-flap control, including MG1 electric-flap and
BM3/MHD adapters (`real_adapters.js`, `adapters.js`), diagnostic transport
(`diaglink.js`), requested/accepted/confirmed state management (`controller.js`),
and hold / live-RPM guards (`auto.js`). Its README reports testing on an MG1 car
and a G20 320i B48. That establishes an existing implementation; it does not
establish compatibility with the owner's exact G30 530e DME, tuning software or
physical exhaust hardware. Read-back is not the same as a physical position
sensor, and some adapters only acknowledge acceptance.

AHG records this reference in `controls.js` but does not load its actuator
modules, request InternalTasu permissions or run a capability probe in V1.
The UI says the integration is not enabled in V1. A later vehicle-specific
integration should reuse that controller and its OEM-return, timeout, RPM-loss
and arming semantics after reviewing the exact adapter and target. Do not copy
Engine Config's unrelated tuning, cooling or xDrive controls into this app.

The kit's `Recorder` supports arcs, filled polygons, lines, gradient cards,
font atlases and cached layers (`kit/runtime/record.js`). Native touch targets
and controller focus use `Recorder.target`, `ctx.onTab` and kit `Display`.
1600×520 is the SDK's logical page. The kit maps it to renderer READY dimensions,
reserves the native HOME/BACK column and status corner, and hides its surface
for HMI popups. App content stays inside the kit's visible x=12..1588,
y=38..520 area. Software rendering is a slower fallback, not 60 fps.

Exhaust flap, ASD and start/stop are inactive capability-gated controls. Desired,
pending, acknowledged, actual and error are distinct fields. The default
provider rejects every vehicle request and never reports success on a tap.
Ambient presets change this app's local accent only. No OEM auto-restore is
attempted without a separately verified provider; V1 sends no commands at all.

## Runtime and packaging

App JavaScript uses Node 8-compatible syntax and builtins. Tests run on desktop
Node; a Node 8 parse check is included in validation. The existing GPU renderer
is recommended for smooth animation and in-page focus. It is not bundled,
installed, updated or reconfigured by this app. Renderer-unavailable operation
uses the kit's supported PNG fallback and HMI bar buttons. Source-package/USB
instructions follow mgu-store `docs/publishing.md`. Compatibility on the owner's
exact firmware and donor SDK remains to be tested on the vehicle.
