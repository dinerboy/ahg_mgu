# Capabilities — AHG Control Center 1.1.0

The owner's later request enables control testing, superseding the original read-only V1 brief for the operations below. Exact physical vehicle compatibility remains unverified. See CONTROL_TESTING.md for steps and limits.

| Feature | Real source / command | Limits |
|---|---|---|
| RPM | CDS.statusEngineSpeed2.actualValueRPMEngineCrankshaft × 0.25 | Invalid 65535 rejected; stale after 3 seconds |
| Oil / coolant | CDS.statusEngineTemperature; raw − 48 | Invalid 255 rejected; exact firmware needs checking |
| Speed | Vehicle2.statusCarSpeed2.speedVehicleCentreOfGravity / 64 | Invalid 65535 rejected |
| Boost, 12V, HV and hybrid metrics | No verified real source wired | Labelled demo only; unavailable otherwise |
| Fault status | No diagnostic scan | Always not scanned |
| Exhaust flap | Engine Config MG1 adapter; InternalTasu, DME 0x12 | Session armed, compatible positive capability probe; stock support reported upstream on MG1/B48, not this exact car |
| Ambient colour | ComfortFunctionIuK.ambientLightInteriorColour setter and statusAmbientLightInteriorColour read-back | Session armed, slot 1–12; other fields unfilled as upstream; colours vary |
| ASD | Simulation only for stock car | Engine Config real ASD is bootmod3-specific |
| Start-stop memory | Simulation only | No verified stock write found |
| CPU / RAM | Node os module | Emulator reports host, car reports MGU |
| Storage | os.statfs when available | Node 8 may show unavailable |

## Upstream implementations

Source is pinned at idrive7-apps bf4b190f64fe50740657d926b5592070665d2408. Engine Config (`apps/live_adjustments`, manifest 0.9.8) provides controller.js, diaglink.js, adapters.js, real_adapters.js and auto.js. Copies here are prefixed ec_ and local requires renamed accordingly. Stock MG1 commands, adapter matching, response matching, request/acceptance/read-back separation, hold and RPM safeguards are retained. AHG does not call its tuner, map, cooling, burbles or xDrive operations.

Ambient config (`apps/ambient_config/ambient.js`) provides the request struct and colour-slot parser. AHG uses those pure helpers with its own explicit-session controller: no driving-mode follower, automatic colour writes or ambient animations are started. The SDK signals.set/field setter is the existing transport.

## Rendering and lifecycle

The actual kit Recorder supports arcs, polygons, lines, gradients, font atlases and cached layers. The native renderer ignores nested layers, so photographic dial triangle geometry is inlined into each gauge face. Touch/controller targets use the kit's routing and focus system. The 1600×520 logical page maps to the actual MGU display and preserves native HMI areas/popups. Software fallback is slower.

Vehicle requests are serialised. App startup creates no diagnostic link/probes. Arming performs detection and colour-status subscription; a control press is required for actuation. Session disarm attempts OEM return, stops holds, closes colour subscriptions and clears pending colour confirmation. Hide/shutdown disarms. New sessions never replay previous commands. Failure, unknown state and simulation remain distinct. No OEM SDK or native renderer binary is distributed; Store supplies an existing donor SDK.
