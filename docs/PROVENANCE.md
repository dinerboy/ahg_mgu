# Provenance and licenses

`upstream-lock.json` pins all inspected repositories. The existing MIT-licensed idrive7-apps `kit/` is included with `kit/UPSTREAM-LICENSE.txt`. `kit/renderd/` contains its separate GPL license and corresponding source; no renderer binary is shipped in the OAP app. Preserve the third-party notices. AHG-owned source is MIT licensed. No BMW proprietary `oap-sdk` is included.

Local toolkit patches: SDK-free Store packaging and ID7/license metadata; Windows emulator named pipes and Python selection; explicit preview-only emulator builds and emulator provenance; named-pipe detection in renderer transport. Roboto replaces the baked UI font atlases; font source and Apache license are included in `art/fonts/` and `kit/runtime/fonts/Roboto-LICENSE`. Rebuild fonts with `tools/bake-ahg-fonts.py` (Pillow/fonttools/brotli required).

The user supplied `docs/design-reference.png` and `docs/BUILD_BRIEF.md` as design context. The app is implemented with independent widgets rather than using that screen as a background. Custom AHG lettering is vector geometry. BMW text denotes the selected vehicle profile; this project is unofficial and not affiliated with BMW.

Three illustrative raster assets were generated with Codex's built-in image generation mode, using the supplied screenshot as a style/composition reference, and copied into `art/`. These are generated assets, not OEM photographs or actual sensor diagrams. The generation briefs were:

- `art/dial-face.png`: photorealistic circular automotive analog instrument face, brushed/polished silver bezel and black dial, transparent background, no ticks, text, numbers, needle or hub; face-on view for independent programmatic overlays.
- `art/530e-cutout.png`: photorealistic dark-blue G30-style plug-in hybrid sedan, side/front-side view facing left, transparent background, no text or prominent logos, cinematic studio lighting, suitable for a dark hybrid dashboard.
- `art/exhaust-hero.png`: photographic dark glossy rear bumper, red LED taillight and twin chrome exhaust tips on the right, black negative space on the left, no labels or UI.

`tools/compile-art.js` compiles these original PNGs to adaptive shaded triangle cells, the same native renderer technique used by upstream Engine Config's exhaust image. Compiled payloads are committed so Store builds require no image tools or network. Needles, numbers, switches and navigation are code, not painted into the images.


## 1.1.0 control integration

Engine Config controller.js, diaglink.js, adapters.js, real_adapters.js and auto.js are copied as ec_*.js; only local import names are changed. Ambient config ambient.js is copied as ec_ambient.js; AHG uses its request/slotOf helpers, not its automatic follower. Both come from the pinned MIT idrive7-apps commit. AHG controls.js adds the stock-car session, simulation isolation, serialization and ambient status tracking. No undocumented stock ASD or start-stop write is invented. See CONTROL_TESTING.md.


## 1.1.1 local patches

The copied ec_diaglink.js now records bounded read outcomes and logs failures; VIN read payloads are omitted from the exported probe list. Diagnostic request bytes and adapter matching are unchanged. kit/runtime/signals.js now clears polling intervals and suppresses callbacks after shutdown. AHG enables the existing pollMs getter option for steady signal freshness and subscribes to the same passive FES driving-mode field used by Engine Config. Controls now watch late availability without replaying commands.
