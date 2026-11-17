# Codex Build Brief — AHG Control Center (BMW MGU / iDrive 7)

You are my senior embedded UI/software engineer. **Implement the project**, not just a plan. Create a polished, testable, installable custom MGU Store app for my BMW G30 530e (iDrive 7 / MGU) called **AHG Control Center**, branded **After Hours Garage**.

## 0. References — inspect before coding

Read the current contents, examples, licensing, build tooling, rendering APIs and compatibility requirements of these repositories. Do not guess undocumented APIs or copy an entire repository blindly:

1. App SDK, rendering, emulator, packaging: https://github.com/cauliflowermossgrape/idrive7-apps
2. MGU Store packaging and adding sources: https://github.com/robertnisipeanu/mgu-store
3. Example custom apps: https://github.com/arefahmad/idrive7-apps
4. Optional compatibility/examples: https://github.com/bimmer-lab/apps

Specific upstream documents to examine if they still exist:
- `idrive7-apps/README.md`
- `idrive7-apps/docs/emulator.md`
- `idrive7-apps/kit/renderd/README.md`
- MGU Store publishing and catalog documentation

**Critical:** Do not assume this is a normal web app. Choose the actual MGU-compatible app structure and graphics/input APIs from the existing SDK, including `app.json`, `main.js`, and the kit runtime if current upstream requires them. Do not invent a React/WebView browser or use unsupported DOM/CSS features. If using any canvas/graphics wrappers, validate they exist in the real runtime. Match the actual Node runtime and available graphics renderer. The app should be usable with both touch and rotary iDrive controller where SDK support exists.

The visual target is the accompanying **AHG Control Center four-page mockup**. If I provide the image in the repository, use it as the reference. Do not hard-code it as an app background: build real widgets and independently animated needles. Preserve the mockup's visual character but improve fit/readability on the actual MGU screen.

## 1. Product goal and scope

Create one fast, reliable in-car app that combines:
- Realistic, circular analog instrument gauges with **physical-looking moving needles**
- A read-only live vehicle telemetry dashboard
- A dedicated **Exhaust Flap** control panel designed for future verified integration
- Hybrid-specific information for a 530e
- MGU system status and developer diagnostics

The app must remain valuable and operational even when certain signals or commands are unavailable. **Never present simulated readings as live vehicle measurements.** The app's initial default on a desktop emulator can be DEMO, clearly labeled; on-car unknown telemetry is **Unavailable**, not made up.

### V1 functional deliverable
Produce the complete four-page UI, genuine analog gauge animation, mock telemetry for emulator testing, persistent user settings, signal health/staleness handling, real read-only signals only where the upstream SDK demonstrably supports them, packaging/install instructions, tests and screenshots.

### V2 feature-gated work
Prepare extensible hooks for exhaust flap, Active Sound Design (ASD), ambient lighting controls and other vehicle actions, **but do not send vehicle commands or implement speculative CAN/SOME-IP writes**. Mark unavailable options `Not supported` until a separate verified, vehicle-specific capability and explicit testing plan exists. Do not claim the vehicle has hardware or feature capabilities without verification.

## 2. Screen layout / visual spec

Design for the actual SDK-reported usable iDrive display area, including any HMI sidebar/header reservations. Do not assume the full physical resolution is app-owned. Detect or configure appropriate logical resolution, scaling and safe areas. Follow upstream renderer limitations. Keep primary information glanceable with generous spacing.

### Theme
- Matte near-black `#07090C`, charcoal `#12161C`, layered near-black instrument faces
- Crisp off-white numerals and ticks; muted silver text
- Restrained deep red `#D51E28` for active accents/warnings; blue `#3E94CF` for cold/EV; green only for healthy status
- Brushed-metal / metallic bezel shading, tasteful inner shadows, subtle circular textures, realistic glass highlight
- An **AHG / AFTER HOURS GARAGE** wordmark, coded as text/vector or owned asset; do not use a third-party BMW logo without checking permitted use. No dependency on downloading unlicensed assets.
- Strong contrast, no overdone glow, no tiny labels; no web-style pill overload
- 60fps-capable animation where supported; automatically reduce update frequency when hidden

### Global frame
- Compact top bar: AHG Control Center / BMW 530e / optional time and connection indication
- Left vertical menu with **Home**, **Controls**, **Hybrid**, **System**
- Clearly highlighted active navigation item
- Compatible touch targets and iDrive controller focus state
- A consistent bottom status strip (where space allows)
- Never overlap native BMW HMI navigation or hide essential vehicle alerts

### HOME — analog gauges
Four gauges as in the visual reference:
- **Boost** — large primary analog dial, bar, configurable scale and verified source
- **Oil Temp** — large primary analog dial in °C
- **Coolant Temp** — smaller analog dial in °C
- **Voltage** — smaller dial in V (explicitly label 12V system when that is the actual source; do not conflate HV battery and 12V battery)

Show dynamic numeric readout below/inside each dial. Provide user-editable gauge slots for verified available signals (RPM, speed, throttle, intake temp, manifold absolute pressure, transmission temperature, etc.). Each gauge must include:
- A true round face; variable major/minor ticks; label positions calculated mathematically
- Needle with tapered geometry, center hub and damped movement
- Configurable units, min/max, colored warning zones
- Smooth value transitions with no overshoot beyond dial bounds
- Initial needle sweep only in *demo mode or an explicit visual self-test*, never mistaken for live actual readings
- Null/unavailable/stale state: disabled needle, `--`, distinct `No signal` or `Stale` indicator
- Accurate units: distinguish manifold absolute pressure from boost gauge pressure, and compute boost only if atmospheric pressure is available and correctly sourced; no invented boost value
- Configurable update rate, UI animations independent from sensor refresh rate

Footer: flap status (only verified if available), drive mode, EV/hybrid state, battery %, EV range and fault status — each must gracefully hide or show unavailable if not supported.

### CONTROLS — daily utility panel
Top hero card: **Exhaust Flap**, positions **Auto / Open / Closed** with a tasteful exhaust illustration or vector icon. Large clearly differentiated buttons.
- Provide separate `desired`, `pending`, `acknowledged`, `actual`, and `error` states
- Default to **Unsupported** and disabled unless a confirmed safe provider is installed
- Never show a successful state change just because a UI button was tapped
- If future controls are supported, show confirmation/status and restore OEM automatic behavior after provider failure; don't bypass existing safety logic
- No automatic commands at startup or when changing pages

Secondary cards:
- ASD On/Off — optional and feature-gated
- Start/stop preference — **UI-only placeholder**, not a promise that ECU coding is possible
- Ambient profiles: Comfort, Sport, Night, Custom — local UI/theme presets in V1; changing OEM vehicle ambient hardware only with verified adapter in future
- Refresh readings, Reset Trip Session, App Display Mode (auto/dark), Open Logs
- Service restart should live in System > Developer options, never a prominent button, to avoid accidental head-unit disruptions

### HYBRID — 530e energy overview
- Prominent battery radial meter, capacity or percentage only if actually available
- EV / combustion / hybrid drive-source card
- EV range
- Electric power and recuperation, with correct signed values and units
- Fuel consumption and energy consumption, labeled as current / trip / historical so figures are not ambiguous
- A simple **530e silhouette/energy-flow vector illustration**, NOT a fake precise component diagram
- Trip: km, consumption, electric distance share, energy used where accessible
- Charging: plugged/charging/idle, charge start/end/duration/energy if available; only display measured or calculated values whose underlying readings exist
- Explicit no-data presentation if MGU SDK does not expose a signal

### SYSTEM — MGU and signal diagnostics
- Vehicle communication state, genuine supported sensor availability, data age
- CPU / RAM / storage readouts from available OS sources, where permissions permit
- App version, source/provider versions, last app launch, uptime
- Service connectivity with honest statuses, not generic green lights
- Safe developer controls: signal viewer, export logs, copy diagnostic report, config settings
- Read-only fault overview **only if a verified diagnostic reader exists**; don't claim `No faults` when faults haven't actually been scanned
- No network server binding or SSH changes by default

## 3. Architecture

Use a small, modular codebase adapted to the real upstream kit. Suggested conceptual modules (adjust paths for upstream conventions):

```text
apps/ahg-control-center/
  app.json                  # SDK-compliant manifest
  main.js                   # SDK-compliant entrypoint
  icon.png
  README.md
  src/
    app/                    # startup, navigation, feature gating
    views/                  # home, controls, hybrid, system
    ui/                     # gauge, needle, text, card, status bar, focus management
    theme/                  # colors, typography, layout tokens
    telemetry/              # interface, mock provider, supported MGU provider
    controls/               # capability model, noop/unsupported provider
    diagnostics/            # system metrics and logs
    settings/               # schema, storage, validation, migration
    util/                   # numerical math, animation, units, timing
  test/
    unit/
    emulator/
```

Core interfaces, in JS pseudotypes:

```js
// Every signal includes provenance and freshness.
SignalReading = {
  key: 'oil_temp_c',
  value: 98.5,                  // null if unavailable
  unit: '°C',
  timestampMs: 0,
  source: 'mgu' | 'mock' | 'derived',
  quality: 'live' | 'stale' | 'unsupported' | 'error',
};

VehicleTelemetryProvider = {
  start(), stop(),
  capabilities(),
  subscribe(callback),         // emits individual readings/batches
};

VehicleControlProvider = {
  capabilities(),              // explicit verified support flags
  getState(controlId),
  request(controlId, desired),  // default rejects unsupported
};
```

Use mock and real providers through the same interfaces. Log source, timestamp, protocol and conversion assumptions for each implemented real signal. Avoid global mutable state where practicable. Include reconnect/backoff, graceful shutdown and provider cleanup.

## 4. Gauge engineering

Implement a high-quality reusable gauge renderer independent of telemetry source:
- Parameterizable dial geometry: center, radius, start/end angles, min/max, units, major/minor intervals and colored zones
- Needle face rendering in supported canvas / GPU primitives; needle is a real rotated visual object
- Delta-time-based damped interpolation (`dt` clamped), smooth at irregular frame rates; wrap up animation and no heavy allocations every frame
- Highlight the latest exact numerical reading; gauge rotation must never misrepresent the value
- Font/vector assets embedded in project only if licensing allows
- Cache static tick/face geometry; redraw dynamic needle/numerics efficiently
- Test geometry for negative/positive and nonzero minimum scales, null data and extreme values
- Animate mock provider with physically plausible transitions rather than random jitter

Deliver gauge unit tests for value/angle conversion, clamping, stale readings, formatted values and animation convergence.

## 5. Real BMW MGU integration — evidence required

Before implementing ANY integration, inspect upstream source and provide `docs/CAPABILITIES.md` with:
1. Exact available vehicle-signal APIs and data names
2. Which sensors are actually supported on the target G30 530e and which are unverified
3. Unit conversions and relevant library/file references
4. Compatibility requirements including SDK build, head-unit version and renderer
5. Gaps requiring vehicle-side validation

Do **not** guess signal identifiers, command addresses, BMW proprietary API behavior, ECU IDs or CAN/SOME-IP payloads. No blind probing, raw bus writes, disabled protections or coding/flashing. Do not tamper with head-unit service configuration, app installation security, vehicle diagnostics, or the car's safety systems. Exhaust flap control must be behind an *inactive* capability abstraction until verified safe integration exists. The user can later supply vehicle-specific details for an isolated follow-up implementation.

When building for car installation: preserve installed MGU Store, Android Auto and existing apps. Do not perform global resets, auto-remount/modify system partitions or update other software as a side effect. Provide a documented uninstall/rollback method. Never embed secrets or SSH keys.

## 6. Build, packaging and user workflow

Follow **the current actual workflow** from the cited app kit and MGU Store. Prefer upstream-supported `mgu-repo.json` (or current source format), app manifest and build commands. If required, rely on a legitimately extracted SDK from an owner's own car rather than redistributing proprietary OEM files.

Document:
- Local prerequisites, versions and reproducible setup
- Desktop emulator launch with mock input, mouse touch and keyboard/controller mapping
- How to build a compatible MGU app bundle
- How to add a custom source to MGU Store and install **only this app**
- How to deploy/update for test safely, plus uninstallation
- Build verification and failures; include exact commands **only after validating them against upstream**

Create a demo video/gif or emulator screenshots if possible. Screenshots should show all 4 pages and a gauge needle in multiple positions.

## 7. Quality, accessibility and reliability

- No visual overflow; respect actual MGU safe area
- Smooth transitions and highly legible text in daylight/darkness
- Support iDrive knob and touchscreen if supported by real SDK, with visible focus
- Minimal interaction while moving; glanceable info; avoid distracting animations/long menus
- Explicit loss-of-signal and application-disconnection indicators
- No fake `Connected`, `No faults`, or `Flap open` claims
- No system shutdown/reboot controls exposed by default
- No network dependency for the core gauge UI
- No silent write/control requests
- Tests, lint/checks compatible with upstream, and clean logs

## 8. Execution instructions for Codex

**Do the work in the repository.** Do not stop at a design explanation.

1. Inspect linked upstream repositories and this project's existing files. Report chosen SDK, version and any constraints.
2. Write `docs/CAPABILITIES.md` with evidence and an honest feature matrix.
3. Scaffold the real MGU-compatible app and deterministic desktop mock provider.
4. Implement the shared theme, nav and all four pages.
5. Implement realistic gauge faces, tickmarks, warning arcs, needle geometry, animation and digital readouts.
6. Implement controls as genuine capability-gated stateful UI with unsupported fallback; **no speculative vehicle writes**.
7. Implement hybrid and system pages, including actual system stats only when permitted and available.
8. Add settings persistence, telemetry aging and error states.
9. Add unit tests, emulator smoke tests and screenshots; fix bugs.
10. Package using verified upstream tools; document installation/update/rollback.
11. Produce a clear final summary: built features, tested commands/results, supported real signals, unsupported features, remaining vehicle-side validation, and exact next step for me.

### Acceptance criteria
- App launches in the upstream emulator and navigates without errors
- Four screens resemble the provided design but are fully drawn interactive UI, not screenshot backgrounds
- Needle angles track the correct values on all four gauges and remain smooth
- Readings are labeled as `DEMO`, `LIVE`, `STALE`, or unavailable as applicable
- Unsupported flap/ASD/ambient control cannot silently actuate a vehicle
- UI does not claim unverified faults, charge metrics or hybrid telemetry are real
- Packaging and optional custom MGU Store source match upstream specs
- All changes stay confined to this app; no disruptive modifications to the existing head unit

Start by inspecting repositories and then implement incrementally. Make sensible choices without requesting confirmation for minor design details. When an external prerequisite (such as the car-specific extracted OEM SDK or a real signal mapping) is not available, complete all emulator/mock features, document the blocker precisely and do **not** fake the result.
