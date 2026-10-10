# Milestone verification — October 9, 2026

## Starting state and scope

- Repository main started at e63f59561affdb261947397c53f42e4774c358f0. Fresh clone; no pre-existing local changes.
- Public deployment app.js byte-matched baseline SHA-256 e18fcb92ff93ddddbe4067376158a06c1ddb8242622cfc11b1ccb573f16a9214.
- Authorization: implement an honest functioning educational-preview milestone and push main after verification; no backend/compiler installation, paid service, account, domain, or host configuration changes.
- Fixed timeline playback was selected instead of a homegrown C++ parser. No claims of arbitrary firmware execution remain.

## Baseline reproductions

An isolated Node vm harness loaded the original app.js with inert DOM initialization and timers, then exercised its actual functions:

1. A commented Serial.println("COMMENT") produced two serial lines on two simulateLoop calls.
2. A setup-only Serial.println("SETUP") also produced two lines on those calls.
3. if(false) around a println still emitted two lines.
4. HIGH; delay(1000); LOW ended LOW on each tick; two calls produced four writes, with no elapsed delay.
5. UI.editor.value = "nonsense" followed by runSketch set running true.

These were reproduced before replacing the regex runner. Regression coverage now rejects all those arbitrary source strings without output, rather than pretending to interpret them. Exact built-in source is a catalog identity check only.

## Gates

- Node built-in engine suite: 9 tests passing. Exact acceptance/rejection (including comments, control flow, whitespace and delay modifications), source limits, unknown IDs/profiles, setup-once, timestamps/boundaries, stop/restart/reset, profile gating/errors once, bounded logs, chronological order, clock fault handling and safe rendering.
- Static build: four assets copied successfully; no dependencies installed.
- Real Chromium 153.0.8010.12 with chromiumSandbox:true: desktop 1440×1000, tablet 768×1024, mobile 375×812, narrow mobile 320×740.
- All examples and Run/Stop/Reset exercised with actual browser timers. Keyboard Enter/Tab and focus, native labels, read-only reference, disabled states, live-region restraint, 44px controls, consistent GPIO/stat/network markup, no horizontal overflow, no page/console errors, and only four same-origin asset requests.
- Local fault injection: unsupported HTML-like source rejected, error occurs once, reset recovers; output text escapes markup and preserves scroll offset while history updates.
- Desktop/mobile full-page screenshots inspected: coherent panel hierarchy, no overlapping badges/controls, readable responsive stacking, elapsed clock retained on mobile. Screenshots retained locally in ignored artifacts/.
- Fresh independent read-only review ran all 9 tests and found two fixable issues: implicit live semantics on output clock and inconsistent suspension recovery instruction. Clock now uses role=timer with aria-live=off; diagnostic now says Reset, then Run. Browser regressions cover both fixes and recovery.

This is automated semantic/keyboard coverage plus visual inspection, not a formal WCAG certification or real screen-reader/device audit.

## Storage and environment

Staging is minimal in the existing Linux-native ext4 workspace at /home/openclaw/.openclaw/workspace/test-environment. findmnt confirmed /mnt/d is only an ordinary directory on the same ext4 root, not a D: mount; no verified E: mount was available. No claim of relocation to D/E. Existing browser and Playwright were reused. Three missing Ubuntu runtime libraries (1.96 MB download, 7.1 MB extracted cache) were unpacked locally in ignored .browser-libs/; no system installation, global configuration, browser/toolchain download, or distro move. Shared GM command admission failed with executed:false; subsequent commands used the authorized native execution fallback.

## Deployment is a separate gate

Commit/push proof and live-asset hashes must be checked separately after landing. Existing public host: test-environment2.shadw.app. A stale deployment is not success even when main is pushed. The release report records the final remote SHA and deployed outcome; this file intentionally does not claim a future deployment happened.
