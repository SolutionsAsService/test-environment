import { EXAMPLES, PROFILES, Preview, validateSelection } from './engine.js';

const $ = id => document.getElementById(id);
const model = new Preview();
let timer = null;
let startedAt = 0;
let lastStatus = '';
const selected = () => EXAMPLES.find(x => x.id === $('exampleSelect').value);
const text = (id, value) => {
  const element = $(id);
  const content = String(value);
  if (element.textContent !== content) {
    const scroll = element.scrollTop;
    element.textContent = content; // Never use source or output as markup.
    element.scrollTop = scroll; // Do not pull readers to the newest line.
  }
};
const time = ms => {
  const tenths = Math.floor(ms / 100);
  return String(Math.floor(tenths / 600)).padStart(2, '0') + ':' +
    String(Math.floor(tenths / 10) % 60).padStart(2, '0') + '.' + tenths % 10;
};
function cancelClock() { if (timer !== null) clearInterval(timer); timer = null; }
function selectionError() {
  try { validateSelection($('exampleSelect').value, $('mcuSelect').value, $('sketchEditor').value); return ''; }
  catch (error) { return error.message; }
}
function render() {
  const running = model.status === 'running';
  const problem = model.error || selectionError();
  $('runButton').disabled = running || !!problem;
  $('stopButton').disabled = !running;
  $('resetButton').disabled = model.status === 'ready' && !problem;
  $('exampleSelect').disabled = running;
  $('mcuSelect').disabled = running;
  text('runtimeStatus', model.status);
  $('runtimeStatus').className = 'status-badge ' + model.status;
  text('runtime', time(model.elapsed));
  text('diagnostic', problem);
  $('diagnostic').hidden = !problem;
  $('runButton').setAttribute('aria-describedby', problem ? 'diagnostic' : 'exampleDescription');
  text('gpioPin', 'Teaching LED · pin ' + PROFILES[$('mcuSelect').value].pin);
  text('gpioValue', model.gpio || 'Not set');
  document.querySelector('.gpio-led').classList.toggle('high', model.gpio === 'HIGH');
  text('oledDisplay', model.display || 'No frame yet.\nUse Display & network story.');
  text('networkCapability', PROFILES[$('mcuSelect').value].network ? 'Fictional story available' : 'No network preview');
  text('networkState', model.network);
  text('serialOutput', model.serial.length ? model.serial.map(x => '[' + time(x.at) + '] ' + x.message).join('\n') : 'Run an example to see serial messages.');
  text('eventStream', model.events.length ? model.events.map(x => '[' + time(x.at) + '] ' + x.type.toUpperCase() + ' · ' + x.message).join('\n') : 'No events yet. Choose an example and press Run.');
  for (const [key, value] of Object.entries(model.counts)) text('count-' + key, value);
  if (lastStatus !== model.status) {
    lastStatus = model.status;
    const messages = {
      ready: 'Ready. Choose an example, then Run.', running: 'Preview running. Outputs update below.',
      stopped: 'Stopped. Outputs frozen; Run starts again from zero.',
      complete: 'Complete. Setup ran once; no repeated work.', error: 'Preview stopped. ' + model.error,
    };
    text('announcement', messages[model.status]);
  }
}
function safely(action) {
  try { action(); }
  catch { cancelClock(); model.fail('The preview encountered an unexpected error. Reset and try again.'); }
  render();
}
function loadSelection() {
  cancelClock(); model.reset();
  const example = selected();
  $('sketchEditor').value = example.source;
  text('exampleDescription', example.description);
  render();
  text('announcement', selectionError() || 'Ready. ' + example.name + ' selected.');
}
$('exampleSelect').replaceChildren(...EXAMPLES.map(example => new Option(example.name, example.id)));
$('mcuSelect').replaceChildren(...Object.entries(PROFILES).map(([id, profile]) => new Option(profile.name, id)));
$('exampleSelect').addEventListener('change', () => safely(loadSelection));
$('mcuSelect').addEventListener('change', () => safely(loadSelection));
$('runButton').addEventListener('click', () => safely(() => {
  cancelClock();
  model.start($('exampleSelect').value, $('mcuSelect').value, $('sketchEditor').value);
  startedAt = performance.now();
  if (model.status === 'running') {
    timer = setInterval(() => safely(() => {
      model.advance(performance.now() - startedAt);
      if (model.status !== 'running') cancelClock();
    }), 100);
  }
  render();
  // Keep keyboard focus on the next meaningful control, not a disabled Run.
  if (model.status === 'running') $('stopButton').focus({ preventScroll: true });
}));
$('stopButton').addEventListener('click', () => safely(() => {
  cancelClock();
  model.advance(performance.now() - startedAt);
  model.stop();
  render(); $('runButton').focus({ preventScroll: true });
}));
$('resetButton').addEventListener('click', () => safely(() => {
  loadSelection();
  if (!$('runButton').disabled) $('runButton').focus({ preventScroll: true });
  else $('mcuSelect').focus({ preventScroll: true });
}));
loadSelection();
