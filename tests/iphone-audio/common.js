// Shared helpers for the iPhone audio tests.
// Settings come from the page address, so a QR code or a reload can carry them.
// Results are kept in this browser so a run with each setting can be copied together.

const params = new URLSearchParams(location.search);
const RECORDING = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8c/RAVAG-Pausenzeichen.ogg/RAVAG-Pausenzeichen.ogg.mp3';

function setting(name, fallback) {
  return params.get(name) || fallback;
}

function reloadWith(name, value) {
  params.set(name, value);
  location.search = params.toString();
}

// The audio session hint only works if it is set before any audio starts.
const session = (() => {
  const want = setting('session', 'default');
  const supported = 'audioSession' in navigator;
  if (supported && want !== 'default') {
    try { navigator.audioSession.type = want; } catch (e) { /* reported below */ }
  }
  return {
    want,
    supported,
    actual: supported ? navigator.audioSession.type : 'not supported',
  };
})();

// ---------- results ----------

const KEY = 'iphone-audio-tests:' + location.pathname;
let results = [];
try { results = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { results = []; }

function record(line) {
  results.push(new Date().toLocaleTimeString() + '  ' + line);
  try { localStorage.setItem(KEY, JSON.stringify(results)); } catch (e) { /* private mode */ }
  renderResults();
}

function renderResults() {
  const box = document.getElementById('results');
  if (box) box.value = results.join('\n');
}

function clearResults() {
  results = [];
  try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
  renderResults();
}

async function copyResults() {
  const text = [document.title, navigator.userAgent, ...results].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    flash('copyNote', 'Copied. Paste it into the chat.');
  } catch (e) {
    const box = document.getElementById('results');
    box.value = text;
    box.focus();
    box.select();
    flash('copyNote', 'Copy did not work. The text is selected: copy it by hand.');
  }
}

function flash(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ---------- the "what did you hear" buttons ----------

// Puts one button per choice under a step. The choice is recorded with the step's label.
function ask(containerId, label, choices = ['Heard it', 'Silent']) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  for (const choice of choices) {
    const b = document.createElement('button');
    b.className = 'answer';
    b.textContent = choice;
    b.onclick = () => {
      record(label + ' -> ' + choice);
      box.innerHTML = '<span class="done">' + choice + '</span>';
    };
    box.appendChild(b);
  }
}

// ---------- sound ----------

let ctx = null;

function audio() {
  if (!ctx) ctx = new AudioContext();
  ctx.resume();
  return ctx;
}

// a short beep, loud enough to hear across a table
function beep(freq = 660, seconds = 0.8) {
  const c = audio();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.5, c.currentTime + 0.02);
  gain.gain.setValueAtTime(0.5, c.currentTime + seconds - 0.2);
  gain.gain.linearRampToValueAtTime(0, c.currentTime + seconds);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + seconds + 0.05);
  return c.state;
}

// the recording, loaded into Web Audio from Wikimedia Commons (the path example 01 will use)
let recordingBuffer = null;

async function playRecording(seconds = 4) {
  const c = audio();
  if (!recordingBuffer) {
    const response = await fetch(RECORDING);
    recordingBuffer = await c.decodeAudioData(await response.arrayBuffer());
  }
  const src = c.createBufferSource();
  src.buffer = recordingBuffer;
  src.connect(c.destination);
  src.start();
  src.stop(c.currentTime + seconds);
}

// Speaks and reports what the browser says happened.
// A phone can report "started" and still be silent, which is why the buttons ask what you heard.
function speak(text, label) {
  if (!('speechSynthesis' in window)) {
    record(label + ': speech is not available in this browser');
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  let started = false;
  u.onstart = () => { started = true; record(label + ': browser says speech started'); };
  u.onerror = (e) => record(label + ': speech error "' + e.error + '"');
  speechSynthesis.speak(u);
  setTimeout(() => {
    if (!started) record(label + ': speech never started (waited 4 s)');
  }, 4000);
}

// ---------- page furniture ----------

function describeSettings(extra = '') {
  const lines = [
    'Audio session: asked for ' + session.want + ', phone reports ' + session.actual,
  ];
  if (extra) lines.push(extra);
  document.getElementById('settings').textContent = lines.join('. ') + '.';
}

window.addEventListener('DOMContentLoaded', renderResults);
