> **1.3.0:** same control behavior as the latest 1.2.0 update; published with a higher version for MGU Store updates.

> **1.2.0:** there is no Arm button or demo mode in the car any more: the controls are ready from startup, Hold defaults On, and hiding the app keeps the flap state (quitting hands back to the DME). Simulation is the desktop emulator (`npm run emulator`). The steps below describe 1.1.x and are kept for reference.

# Control testing — 1.1.0

This build adds real stock-car exhaust and ambient-colour providers, using the pinned upstream code. It is emulator verified; the owner's physical G30 530e has not been tested. The earlier read-only brief described 1.0.0; the owner's later instruction authorizes these controls.

| Control | Emulator / simulation | Stock car, session armed |
|---|---|---|
| Auto / Open / Closed | Simulated state | Auto returns OEM control; Open/Closed use Engine Config's compatible MG1 adapter |
| ASD | Working simulated toggle | Unavailable: upstream ASD write requires bootmod3 |
| Start-stop memory | Working simulated toggle | Unavailable: no verified stock write found in the referenced code |
| Ambient presets | Simulated colour slot and app accent | Sends configured BMW colour slot; status must confirm the selected slot |
| Refresh, logs, reset session, display mode, settings, export | Functional app actions | Same local app actions |

## On the car

1. Install/update 1.1.0 through MGU Store. The package now declares the same InternalTasu diagnostic method permission used by Engine Config and the ambient colour setter used by Ambient config. A Store reinstall may be needed to apply changed interface permissions.
2. While parked, open Settings: **Synthetic demo data → Off**, **Control testing mode → Vehicle**. Return to Controls and press **Arm session**. This enables one session and performs read-only DME/flap detection. It does not itself actuate the flap or change a colour. A compatible response is required; an unsupported car is never silently simulated.
3. Press **Open**, **Closed**, or **Auto**. Auto means OEM hand-back, not driving-mode following. Inspect acceptance and ECU read-back separately; read-back may be commanded duty, not a physical-position sensor. Physical position remains Unknown.
4. Closed requires a fresh, real RPM signal. Above the configured limit (default 4000 RPM), OEM is requested; Close resumes below the limit minus 500 RPM. If RPM is lost/stale, manual Close becomes OEM and must be explicitly selected again. Demo RPM never satisfies this guard.
5. **Hold flap override** defaults Off. The DME normally times out its override in roughly 20 seconds, according to upstream. Optional Hold repeats every 15 seconds while armed. It stops when disarmed or the main page is hidden.
6. Ambient preset buttons send slots 1–12 configured under **Comfort/Sport/Night/Custom ambient colour slot**. Defaults are 1/2/3/4; actual colours vary by car and coding. Names are app presets, not guaranteed BMW colours. Changes are limited to one per 1.5 seconds. The UI shows the observed slot; a successful setter does not itself confirm the light changed. Missing matching status is reported after five seconds.
7. Press **Disarm / OEM** when finished. Leaving the main app surface (including opening native settings) also attempts OEM hand-back and disarms. Arming is not saved across restarts. A crash, forced process kill or lost diagnostic connection can prevent hand-back; the app cannot guarantee delivery. Ambient colour remains at the last selected slot and is not automatically restored.

## Desktop / simulation

The emulator always forces simulation, even if Vehicle is selected. On the car, selecting Simulation or turning synthetic demo on also forces simulation. All four control groups are interactive and explicitly labelled. Simulated changes are never forwarded to a vehicle and are cleared when switching testing mode.

Stock ASD and start-stop requests display their unsupported reason rather than sending tune-only commands or speculative ECU coding. These two switches cannot be made into real stock-car controls by removing a UI lock.

## Scope

Only MG1 exhaust flap and ambient colour-slot writes are exposed. No ECU flashing, security access, map switching, xDrive changes, firmware patching or SSH changes are invoked. Copied upstream modules retain unrelated helper definitions, but AHG does not call their tuning methods. The live RPM feed remains the existing passive SDK signal. Start with visual checks and use local diagnostic export to record requests and responses; do not publish a vehicle's diagnostic report without reviewing its contents.


## 1.1.1 troubleshooting

If the flap is unavailable after arming, its blocking reason stays on the Controls page. Press Recheck after the ignition/diagnostic link is available. DME detection is read-only; select a mode again to send a command. A red outline is controller focus; press the controller or tap the button. A filled button now indicates an accepted request, not proof of flap movement.

Open Logs now includes real transport and detection messages. Export Diagnostics includes link readiness, adapter, blocking reason and recent DID probe outcomes (VIN omitted). If the car still refuses the flap, that report is needed to distinguish missing interface permissions, an unavailable diagnostic provider, a negative ECU response and an unsupported DME. Missing boost, voltage and hybrid readings are still unimplemented readers, separate from control connectivity.
