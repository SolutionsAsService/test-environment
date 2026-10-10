# Embedded Lab — educational preview

A working, dependency-free browser learning lab, **not a compiler, Arduino interpreter, MCU emulator, or firmware test service**. Pick a built-in example, run it, and inspect serial text, a logical LED, text frames, a fictional network story, counters, and timestamped events.

## Quick start

Node.js 20+; no package installation required:

~~~sh
npm run dev       # http://127.0.0.1:4173 (loopback only)
npm test          # deterministic engine regressions; Node built-in test runner
npm run build     # copies four static browser assets to dist/
~~~

Serve via HTTP, not file:// (native ES modules). PORT can override 4173. No runtime npm packages, backend, accounts, telemetry, uploaded code, or external browser requests.

## Supported contract

**Only the three curated examples run.** The reference viewer is read-only and prefilled. The runner verifies the exact selected reference and profile, then plays independent, hand-authored data. Matching source is an identity/integrity check, **not parsing or evidence of C++ fidelity**. Even whitespace/comment edits and otherwise-valid custom C++ are rejected. Maximum reference length: 12,000 characters. There is no eval, dynamic code generation, sketch regex interpreter, compiler, or arbitrary execution.

| Example | Profiles | Observable schedule |
| --- | --- | --- |
| Blink & serial | Uno / ESP32 | Setup serial once at 0 ms. LED HIGH + serial at 0 ms; LOW + serial at 1000 ms; repeats every 2000 ms. |
| Setup runs once | Uno / ESP32 | One serial line and LED HIGH at 0 ms; immediately completes. No repeated work. |
| Display & network story | ESP32 only | Fictional connecting at 0 ms, connected at 1000 ms; text frame A at 0 ms, B at 2000 ms, repeating every 4000 ms. Network setup does not repeat. |

Profiles label a **teaching LED** (Uno pin 13 / ESP32 pin 2) and gate the fictional network story. They are not board models or claims about every physical board's onboard LED. Blink/setup references illustrate Arduino-shaped operations; LED_PIN is symbolic, not a self-contained build target. The third reference explicitly uses non-compilable storyboard notation.

Not supported: custom firmware/C++, variables, conditionals, loops as source semantics, libraries, memory/CPU models, instruction-accurate timing, interrupts, ADC/PWM, sensors, electrical behavior, hardware input, graphics libraries, pixel-accurate OLED, actual Wi-Fi/IP/RSSI/packets, or device flashing. Removed ESP8266/S3/Nano target choices were not implementations.

## Lifecycle and timing

- **Run** starts clean at zero: clears all outputs, events, counters, and diagnostics. While running, Run and selections are disabled; Stop and Reset remain available.
- **Stop** freezes clock and outputs. Run restarts; there is deliberately no resume.
- **Reset**, example changes, and profile changes clear state and reload the reference. Reset works while running. Invalid example/profile combinations show one persistent diagnostic and disable Run, rather than spamming errors.
- After a runtime error, Reset then Run. Setup-only completes immediately; there is no useless timer afterward.
- A monotonic browser clock samples every 100 ms. Events carry scheduled timestamps and apply chronologically. Browser scheduling can delay what you see; this is not hardware real-time behavior. A clock gap over 60 seconds produces one error and stops instead of unbounded catch-up.
- Last 200 serial lines and events are retained; counters are run totals. Completed cycles count full timeline periods, not CPU loop iterations. GPIO writes count writes, not electrical edges.
- Histories do not auto-scroll. Stop for stable reading. Text uses textContent, never HTML. Live announcements are restricted to lifecycle/selection changes; the elapsed clock explicitly has live announcements off.

## Architecture and existing-solution decision

- engine.js: frozen catalog, exact-reference validation, deterministic clock/state machine; no DOM or timers.
- app.js: one timer, native controls, lifecycle focus management, text-only rendering.
- index.html / styles.css: semantic panels, labels, keyboard access, responsive layout, visible focus, readable badges, reduced-motion support.
- scripts/: Node built-ins only; allowlisted loopback development server and asset-copy build.
- tests/: engine regressions and optional real-browser acceptance tests.

Existing options considered: AVR8js (github.com/wokwi/avr8js) and Wokwi's hosted simulator (docs.wokwi.com). AVR8js supplies an AVR CPU core requiring precompiled firmware and peripheral integration; using a hosted simulator adds a separate platform. Neither is silently approximated here. For the explicitly bounded educational milestone, fixed timeline data avoids both a custom language and unimplemented emulation claims. A later real-firmware milestone should evaluate an existing emulator with isolated compilation rather than revive regex execution.

## Browser acceptance tests

Optional: point to an **existing** Playwright/playwright-core installation and Chromium. This repository downloads no browser or toolchain. The launcher requires Chromium sandboxing.

~~~sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core \
CHROMIUM_PATH=/absolute/path/to/chrome \
npm run test:browser
~~~

Playwright can alternatively resolve by its normal module name. Set LD_LIBRARY_PATH only if the isolated browser needs locally staged system libraries; do not disable the sandbox.

The test starts its own loopback server and checks 1440px desktop, 768px tablet, 375px mobile, and 320px narrow mobile: all examples, lifecycle, keyboard Enter/Tab and focus, labels/read-only reference, disabled controls, restrained announcements, panels, frozen clock, no horizontal overflow, 44px controls, no page errors/external requests. Local-only fault injection checks unsupported-source rejection, HTML escaping, and history scroll preservation. Screenshots go into ignored artifacts/.

Set TEST_URL to a deployment URL to run deployed acceptance checks (local fault injection is skipped).

## Static deployment

- Framework preset: **static / none**.
- Build command: npm run build; no dependency install needed.
- Publish/output directory: dist.
- Alternatively serve index.html, styles.css, app.js, and engine.js together from repository root.
- Serve JavaScript with a JavaScript MIME type; preserve relative module paths. No SPA rewrite needed.
- No secrets, backend, custom domains, or account/host changes required.
- No CI workflow added. Tests are local release gates; existing repository credentials lacked workflow scope and no escalation was requested.

### Release checklist

1. Fetch and inspect origin/main; preserve newer work. Never force-push.
2. npm test && npm run build; check script syntax and diff whitespace.
3. Run sandboxed browser acceptance and inspect desktop/mobile screenshots. Automated checks do not replace assistive-technology testing.
4. Review the diff; exclude .gm/, browser libraries, artifacts/, and dist/.
5. Commit using truthful per-command identity; push main only after gates pass.
6. Verify remote SHA and clean tree. Separately compare deployed asset hashes and run deployed browser checks. Push success is **not** deployment proof.

See docs/verification.md for recorded baseline failures and release checks.

## Next milestones (not implemented)

- More reviewed timelines and explicitly bounded parameters.
- Screen-reader and human usability testing beyond automated semantics/keyboard checks.
- A separately designed real-firmware/emulator integration with isolated compilation and board-specific conformance tests. Preview output never verifies firmware correctness.
