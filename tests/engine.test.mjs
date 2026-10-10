import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Preview, EXAMPLES, LIMIT, SOURCE_LIMIT, validateSelection } from '../engine.js';
const start = (id='blink',profile='uno') => { const p=new Preview(); assert.equal(p.start(id,profile,EXAMPLES.find(x=>x.id===id).source),true); return p; };
test('only exact selected built-in references accepted', () => {
  for (const ex of EXAMPLES) assert.equal(validateSelection(ex.id,ex.network?'esp32':'uno',ex.source),ex);
  for (const source of ['', 'nonsense', '// Serial.println("COMMENT");', 'void setup(){Serial.println("SETUP");}void loop(){}', 'void loop(){if(false){Serial.println("FALSE");}}', 'void loop(){digitalWrite(2,HIGH);delay(1000);digitalWrite(2,LOW);}', EXAMPLES[0].source+'\n', EXAMPLES[0].source.replace('1000','5'), EXAMPLES[0].source+'\n// comment']) {
    const p=new Preview(); assert.equal(p.start('blink','uno',source),false);
    assert.equal(p.status,'error'); assert.match(p.error,/Custom sketches/);
    assert.equal(p.serial.length,0); assert.equal(p.gpio,null); assert.equal(p.counts.errors,1);
    p.advance(1000); p.advance(2000); assert.equal(p.events.length,1);
  }
  assert.throws(()=>validateSelection('missing','uno',''),/Unknown example/);
  assert.throws(()=>validateSelection('blink','toString',EXAMPLES[0].source),/Unknown teaching/);
  assert.throws(()=>validateSelection('blink','uno','a'.repeat(SOURCE_LIMIT+1)),/12,000/);
});
test('blink honors boundaries, setup once, exact timestamps and cycle counts', () => {
  const p=start(); assert.equal(p.gpio,'HIGH'); assert.equal(p.serial.length,2);
  p.advance(999); assert.equal(p.gpio,'HIGH'); assert.equal(p.serial.length,2);
  p.advance(1000); assert.equal(p.gpio,'LOW'); assert.equal(p.serial.at(-1).at,1000);
  p.advance(1999); assert.equal(p.counts.cycles,0);
  p.advance(2000); assert.equal(p.gpio,'HIGH'); assert.equal(p.counts.cycles,1);
  p.advance(2000); assert.equal(p.counts.gpio,3);
  p.advance(5999); assert.equal(p.serial.filter(x=>x.message==='Setup complete').length,1);
  assert.deepEqual(p.serial.map(x=>x.at),[0,0,1000,2000,3000,4000,5000]);
});
test('setup-only completes once with no timer work', () => {
  const p=start('setup'); assert.equal(p.status,'complete'); p.advance(50000);
  assert.equal(p.elapsed,0); assert.equal(p.serial.length,1); assert.equal(p.counts.gpio,1);
});
test('stop is idempotent and freezes; run always restarts cleanly', () => {
  const p=start(); p.advance(1500); p.stop(); const snapshot=JSON.stringify(p);
  p.stop(); p.advance(4000); assert.equal(JSON.stringify(p),snapshot);
  p.start('blink','uno',EXAMPLES[0].source); assert.equal(p.elapsed,0); assert.equal(p.serial.length,2); assert.equal(p.counts.cycles,0);
  assert.equal(p.start('setup','uno',EXAMPLES[1].source),false); assert.equal(p.example.id,'blink');
});
test('reset clears every output, counter and diagnostic, including while running', () => {
  const p=start('dashboard','esp32'); p.advance(2200); p.reset();
  assert.equal(p.status,'ready'); assert.equal(p.elapsed,0); assert.deepEqual(p.events,[]); assert.deepEqual(p.serial,[]);
  assert.equal(p.display,''); assert.equal(p.gpio,null); assert.equal(p.network,'Not used'); assert.equal(p.error,'');
  assert.ok(Object.values(p.counts).every(x=>x===0));
});
test('network story is explicitly gated and failures recorded only once', () => {
  const p=new Preview(); p.start('dashboard','uno',EXAMPLES[2].source);
  for(let i=0;i<10;i++) p.advance(i*100);
  assert.equal(p.events.length,1); assert.equal(p.counts.errors,1); assert.equal(p.network,'Not used');
  p.start('dashboard','esp32',EXAMPLES[2].source); assert.equal(p.network,'Connecting (demo)');
  p.advance(999); assert.equal(p.network,'Connecting (demo)'); p.advance(1000); assert.equal(p.network,'Connected (fictional)');
  p.advance(2000); assert.match(p.display,/Frame B/); p.advance(4000); assert.match(p.display,/Frame A/); assert.equal(p.counts.network,2);
});
test('long runs bound logs while retaining total counts and chronological events', () => {
  const p=start(); for(let t=1000;t<=500000;t+=1000) p.advance(t);
  assert.equal(p.serial.length,LIMIT); assert.equal(p.events.length,LIMIT);
  assert.equal(p.counts.serial,502); assert.equal(p.counts.gpio,501); assert.equal(p.counts.cycles,250);
  assert.ok(p.events.every((e,i)=>i===0||e.at>=p.events[i-1].at));
});
test('invalid clock and suspension fail safely once', () => {
  for(const t of [NaN,Infinity,-1,60001]) { const p=start(); p.advance(t); assert.equal(p.status,'error'); p.advance(t); assert.equal(p.counts.errors,1); }
});
test('output rendering is text-only; no source evaluation or injected markup', async () => {
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|new Function/);
  assert.match(app,/element\.textContent = content/);
  assert.doesNotMatch(app,/scrollIntoView|scrollHeight/);
});
