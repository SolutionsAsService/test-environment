// Hand-authored educational timelines. No parsing, compilation, or execution of source.
export const LIMIT = 200;
export const SOURCE_LIMIT = 12000;
export const PROFILES = Object.freeze({
  uno: Object.freeze({ name: 'Arduino Uno · teaching profile', pin: '13', network: false }),
  esp32: Object.freeze({ name: 'ESP32 · teaching profile', pin: '2', network: true }),
});
const event = (at, type, value) => Object.freeze({ at, type, value });
const examples = [
  {
    id: 'blink', name: '01 · Blink & serial', period: 2000,
    description: 'Setup prints once. LED HIGH at 0 ms, LOW at 1000 ms; repeats every 2000 ms.',
    source: "// Reference only: this preview plays a curated timeline.\n// LED_PIN is selected by the teaching profile (Uno 13 / ESP32 2).\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(LED_PIN, OUTPUT);\n  Serial.println(\"Setup complete\");\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH);\n  Serial.println(\"LED on\");\n  delay(1000);\n  digitalWrite(LED_PIN, LOW);\n  Serial.println(\"LED off\");\n  delay(1000);\n}",
    setup: [event(0, 'serial', 'Setup complete')],
    loop: [event(0, 'gpio', 'HIGH'), event(0, 'serial', 'LED on'), event(1000, 'gpio', 'LOW'), event(1000, 'serial', 'LED off')],
  },
  {
    id: 'setup', name: '02 · Setup runs once', period: null,
    description: 'Prints one line and sets the LED HIGH at 0 ms. Completes immediately; nothing repeats.',
    source: "// Reference only: curated setup-only demonstration.\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(LED_PIN, OUTPUT);\n  Serial.println(\"Hello once\");\n  digitalWrite(LED_PIN, HIGH);\n}\n\nvoid loop() {\n  // No scheduled work.\n}",
    setup: [event(0, 'serial', 'Hello once'), event(0, 'gpio', 'HIGH')], loop: [],
  },
  {
    id: 'dashboard', name: '03 · Display & network story', period: 4000, network: true,
    description: 'ESP32 only. Fictional connection at 1000 ms; two text frames alternate every 2000 ms. No packets or OLED hardware are simulated.',
    source: "// Storyboard notation — NOT compilable Arduino C++.\n// This is a scheduled illustration, not WiFi or OLED emulation.\nsetup:\n  0 ms    serial \"Starting fictional connection\"\n  0 ms    network \"Connecting (demo)\"\n  1000 ms network \"Connected (fictional)\"\n  1000 ms serial \"Demo network ready; no packets sent\"\nrepeat every 4000 ms:\n  0 ms    display \"Embedded Lab | Frame A\"\n  2000 ms display \"Learning by observing | Frame B\"",
    setup: [event(0, 'serial', 'Starting fictional connection'), event(0, 'network', 'Connecting (demo)'), event(1000, 'network', 'Connected (fictional)'), event(1000, 'serial', 'Demo network ready; no packets sent')],
    loop: [event(0, 'display', "Embedded Lab\nFrame A"), event(2000, 'display', "Learning by observing\nFrame B")],
  },
];
export const EXAMPLES = Object.freeze(examples.map(x => Object.freeze({ ...x, setup: Object.freeze(x.setup), loop: Object.freeze(x.loop) })));
export function validateSelection(id, profile, source) {
  const example = EXAMPLES.find(x => x.id === id);
  if (!example) throw new Error('Unknown example. Choose one of the built-in examples.');
  if (!Object.hasOwn(PROFILES, profile)) throw new Error('Unknown teaching profile.');
  if (typeof source !== 'string' || source.length > SOURCE_LIMIT) throw new Error('Reference exceeds the 12,000-character limit.');
  if (source !== example.source) throw new Error('Custom sketches are not supported. Restore the selected example; source text is never interpreted.');
  if (example.network && !PROFILES[profile].network) throw new Error('This network story requires the ESP32 teaching profile. Uno has no network preview.');
  return example;
}
export class Preview {
  constructor() { this.reset(); }
  reset() {
    this.status = 'ready'; this.elapsed = 0; this.serial = []; this.events = [];
    this.gpio = null; this.display = ''; this.network = 'Not used'; this.error = '';
    this.counts = { cycles: 0, serial: 0, gpio: 0, display: 0, network: 0, errors: 0 };
    this.example = null; this.profile = null; this.setupIndex = 0; this.loopIndex = 0;
  }
  start(id, profile, source) {
    if (this.status === 'running') return false;
    this.reset();
    try { this.example = validateSelection(id, profile, source); }
    catch (error) { this.fail(error.message); return false; }
    this.profile = profile; this.status = 'running';
    this.record('lifecycle', 'Preview started from zero');
    this.advance(0);
    return true;
  }
  record(type, message) {
    this.events.push({ at: this.elapsed, type, message });
    if (this.events.length > LIMIT) this.events.shift();
  }
  fail(message) {
    if (this.status === 'error') return;
    this.status = 'error'; this.error = message; this.counts.errors++;
    this.record('error', message);
  }
  stop() {
    if (this.status !== 'running') return;
    this.status = 'stopped'; this.record('lifecycle', 'Stopped; outputs frozen');
  }
  apply(item, at) {
    this.elapsed = at;
    this.counts[item.type]++;
    if (item.type === 'serial') {
      this.serial.push({ at, message: item.value });
      if (this.serial.length > LIMIT) this.serial.shift();
    }
    if (item.type === 'gpio') this.gpio = item.value;
    if (item.type === 'display') this.display = item.value;
    if (item.type === 'network') this.network = item.value;
    this.record(item.type, item.value);
  }
  advance(target) {
    if (this.status !== 'running') return;
    if (!Number.isFinite(target) || target < this.elapsed) { this.fail('Invalid preview clock. Reset and try again.'); return; }
    // Bound catch-up work after a suspended tab. Never fabricate skipped history.
    if (target - this.elapsed > 60000) { this.fail('Preview paused for over 60 seconds. Reset, then Run to restart safely.'); return; }
    const ex = this.example;
    while (true) {
      const setup = ex.setup[this.setupIndex];
      const loop = ex.loop.length ? ex.loop[this.loopIndex % ex.loop.length] : null;
      const loopAt = loop ? Math.floor(this.loopIndex / ex.loop.length) * ex.period + loop.at : Infinity;
      const setupAt = setup ? setup.at : Infinity;
      if (Math.min(setupAt, loopAt) > target) break;
      if (setupAt <= loopAt) { this.apply(setup, setupAt); this.setupIndex++; }
      else { this.apply(loop, loopAt); this.loopIndex++; }
    }
    this.elapsed = target;
    this.counts.cycles = ex.period ? Math.floor(target / ex.period) : 0;
    if (!ex.loop.length && this.setupIndex === ex.setup.length) {
      this.status = 'complete'; this.record('lifecycle', 'Setup-only preview complete');
    }
  }
}
