# Capabilities — AHG Control Center 1.3.0

The owner's later request enables control testing, superseding the original read-only V1 brief for the operations below. Exact physical vehicle compatibility remains unverified. See CONTROL_TESTING.md for steps and limits.

| Feature | Real source / command | Limits |
|---|---|---|
| RPM | CDS.statusEngineSpeed2.actualValueRPMEngineCrankshaft × 0.25 | Invalid 65535 rejected; stale after 3 seconds |
| Oil / coolant | CDS.statusEngineTemperature; raw − 48 | Invalid 255 rejected; exact firmware needs checking |
| Speed | Vehicle2.statusCarSpeed2.speedVehicleCentreOfGravity / 64 | Invalid 65535 rejected |
| Boost | DME fallback when the sport display sends nothing: 22 F470 / F487 / F40B (OBD 01 0B) absolute kPa minus 22 F433 outside air (read-only). Otherwise FES.statusSwitchDriveDynamicSport2.displayBoostPressure (sport display), 0.01 bar / 0.1 psi per the car's pressure unit (Vehicle.statusNewCurrentUnitsStatusExt) | Passive. Scaling marked best-guess upstream (live_data); 255 = no value |
| HV charge | SME 0x07, 22 DDBC, 0.1 % | Read-only (kit/readonly-diag). From upstream edrive, set up on X5 45e; not yet confirmed on G30 530e |
| Electric power / recuperation | SME 22 DDB4 (V, fallbacks DD68/DD66/DDEF) x 22 DD69 (A, signed) | Read-only, 1 s. Positive = driving, negative = recuperation/charging |
| HV voltage / temperature | SME voltage above, or LSCDataSink.statusHighVoltageStorage; Efficiencytainment2.statusBatteryTemperature raw - 50 | Temperature scaling from the X5 45e |
| eDRIVE needle | Efficiencytainment2.statusPowerRelativHybrid | Passive, % of the cluster scale |
| 12 V voltage | DME 22 F442 (or OBD 01 42, IBS 402B/5853, EGS 0x18) | Read-only, every 5 s |
| Drive source, charging, trip energy, electric share | Derived from engine speed, battery power and speed | No EV range: no passive signal; upstream learns it from driving |
| IAT / fuel pressures / timing | DME 0x12: 22 F40F / F477 / OBD 0F (°C + 40); HPFP 22 F423 / F459 / OBD 23 (0.1 bar); LPFP 22 F40A / F422 / OBD 0A / 22; timing 22 F40E / OBD 0E (0.5° − 64) | Read-only; first answering candidate kept. From car_vitals; not yet confirmed on the 530e |
| Load, boost target vs actual | DME 22 5813 / 480C; 22 4AB0 / 580B, or F470 bytes 1 / 3 (OBD 70), absolute kPa minus outside air | Read-only; fast only with Gauges / Health open |
| Engine torque / power | FES.statusActualValueTorque2 (× 0.5 − 1023.5 Nm, ≥ 4095 invalid); power = torque × rpm / 9549; FES.statusVehicleDynamicEngine sport-display % | Passive |
| Misfires | DME OBD 06 MID A2.. test 0C (this driving cycle), else 22 F6A2..; cylinders from MID A0 | Read-only; service 06 is passed only by this app's link ({ monitors: true }) |
| Health check | Statistics of the readings above; JSON report in data/health | Advisory; loose limits |
| Ambient warning light | The same ambient setter as below, slots from settings | Off by setting; 1.5 s minimum between changes; restores the driver's colour |
| Fault status | No diagnostic scan | Always not scanned |
| Exhaust flap | Engine Config MG1 adapter; InternalTasu, DME 0x12 | Ready from startup after a read-only capability probe; stock support reported upstream on MG1/B48, not this exact car |
| Ambient colour | ComfortFunctionIuK.ambientLightInteriorColour setter and statusAmbientLightInteriorColour read-back | Slot 1–12; other fields unfilled as upstream; colours vary |
| ASD | Simulation only for stock car | Engine Config real ASD is bootmod3-specific |
| Start-stop memory | Simulation only | No verified stock write found |
| CPU / RAM | Node os module | Emulator reports host, car reports MGU |
| Storage | os.statfs when available | Node 8 may show unavailable |

## Upstream implementations

Source is pinned at idrive7-apps bf4b190f64fe50740657d926b5592070665d2408. Engine Config (`apps/live_adjustments`, manifest 0.9.8) provides controller.js, diaglink.js, adapters.js, real_adapters.js and auto.js. Copies here are prefixed ec_ and local requires renamed accordingly. Stock MG1 commands, adapter matching, response matching, request/acceptance/read-back separation, hold and RPM safeguards are retained. AHG does not call its tuner, map, cooling, burbles or xDrive operations.

Ambient config (`apps/ambient_config/ambient.js`) provides the request struct and colour-slot parser. AHG uses those pure helpers with its own explicit-session controller: no driving-mode follower, automatic colour writes or ambient animations are started. The SDK signals.set/field setter is the existing transport.

## Rendering and lifecycle

The actual kit Recorder supports arcs, polygons, lines, gradients, font atlases and cached layers. The native renderer ignores nested layers, so photographic dial triangle geometry is inlined into each gauge face. Touch/controller targets use the kit's routing and focus system. The 1600×520 logical page maps to the actual MGU display and preserves native HMI areas/popups. Software fallback is slower.

Vehicle requests are serialised. From 1.2.0 the car build arms itself at startup: it performs read-only DME detection and the colour-status subscription; a control press (or Hold re-sending the pressed mode) is required for actuation. Detection is retried when the diagnostic link comes up and on the next press. Hiding the app keeps the flap state; quitting attempts OEM hand-back. New sessions never replay previous commands. Failure, unknown state and simulation remain distinct. No OEM SDK or native renderer binary is distributed; Store supplies an existing donor SDK.

In 1.1.1, CDS/Vehicle2/FES getters are polled every second. FES.statusFESVehicleDynamicSwitchHMI adds the real driving-mode name using the upstream enum mapping. Subscription shutdown stops polling. Delayed diagnostic availability triggers read-only DME re-detection; Recheck is available, and blocking reasons persist.

## Temperature colour guidance (1.4.1)

The coolant dial now starts amber at 115 C and red at 120 C. The previous 110 C red band was misleading for the owner's steady operating reading. These are app advisory colours, not calibrated BMW warning limits. The Health temperature criteria are unchanged; 108 C oil and 110 C coolant pass that item. Factory warnings take precedence.
