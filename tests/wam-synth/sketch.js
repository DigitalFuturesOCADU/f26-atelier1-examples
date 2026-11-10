// Test · Web Audio Modules Synth
// Does a Web Audio Module (WAM) synth play on a phone with p5-phone?
// The synth is Synth-101, a one-voice analog-style synth from the WAM examples.
// It loads from the WAM demo server at mainline.i3s.unice.fr.
//
// A short pattern of notes plays on its own once the sound is on.
// Tilt the phone left and right: the filter opens and closes.
// Tilt it towards you and away: the resonance goes up and down.
// Tap the screen to stop and start the notes.
// On a laptop the mouse does the tilting: left and right, up and down.
//
// The list at the top says how far it got. If something fails, it says where.

// ask the phone to treat this page like a music player, so silent mode may not mute it.
if ('audioSession' in navigator) navigator.audioSession.type = 'playback';

// the browser's own sound system. The synth plays through it.
// p5-phone loaded first, so its tap starts this one too.
let audio = new AudioContext();

const WAM_SERVER = 'https://mainline.i3s.unice.fr/wam2/packages';
const SDK_URL = WAM_SERVER + '/sdk/dist/index.js';
const SYNTH_URL = WAM_SERVER + '/synth101/dist/index.js';

// the feel of the piece. change these first.
let pattern = [48, 55, 60, 63, 67, 63, 60, 55]; // MIDI notes. 60 is middle C
let stepTime = 150;                             // milliseconds between notes
let velocity = 100;                             // how hard each note is played, 0 to 127

let synth;              // the synth, once it has loaded
let synthReady = false;
let playing = true;     // a tap stops and starts the notes
let unlocked = false;   // has the p5-phone tap turned the sound on?
let unlockedAt = 0;

let patternIndex = 0; // which note of the pattern is next
let lastStepAt = 0;
let lastNote = -1;      // the note that is sounding now, so it can be stopped
let notesSent = 0;

let cutoff = 0.3;       // 0 to 1. how open the filter is
let resonance = 0.2;    // 0 to 1. how much the filter rings
let sentCutoff = -1;    // the values the synth has now, so they are only sent when they change
let sentResonance = -1;

// what happened, in order. drawn at the top of the screen.
let steps = [];
function report(line) {
  steps.push(line);
  console.log('[wam test] ' + line);
}

function userSetupComplete() {
  unlocked = true;
  unlockedAt = millis();
  report('tap done. sound is ' + audio.state);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  angleMode(DEGREES);
  enablePermissionsTap(['motion', 'sound'], 'Tap to turn on motion and sound');

  report('AudioWorklet: ' + (typeof AudioWorkletNode === 'function' ? 'yes' : 'NO'));
  report('sample rate: ' + audio.sampleRate);

  // no await here, so draw() starts straight away while the synth loads
  loadSynth();
}

async function loadSynth() {
  let start = performance.now();
  try {
    let sdk = await import(SDK_URL);
    let host = await sdk.initializeWamHost(audio);
    let groupId = host[0];
    report('WAM host ready in ' + round(performance.now() - start) + ' ms');

    let synthModule = await import(SYNTH_URL);
    let Synth = synthModule.default;
    synth = await Synth.createInstance(groupId, audio);
    synth.audioNode.connect(audio.destination);

    // a short, plucky sound, so each note of the pattern is clear
    await synth.audioNode.setParameterValues({
      envAttack: { id: 'envAttack', value: 0, normalized: false },
      envDecay: { id: 'envDecay', value: 0.25, normalized: false },
      envSustain: { id: 'envSustain', value: 0.2, normalized: false },
      envRelease: { id: 'envRelease', value: 0.15, normalized: false },
      filterEnv: { id: 'filterEnv', value: 0.35, normalized: false },
    });

    synthReady = true;
    report('Synth-101 ready in ' + round(performance.now() - start) + ' ms');
  } catch (error) {
    report('LOAD FAILED: ' + error.message);
    console.log(error);
  }
}

function draw() {
  background(20);

  readInput();
  sendKnobs();
  playPattern();

  drawKnobs();
  drawLog();
}

// ---------- the input ----------

// a laptop has no motion sensors. this turns true when the first real reading arrives.
let motionArrived = false;
window.addEventListener('devicemotion', function (event) {
  let g = event.accelerationIncludingGravity;
  if (g && g.x !== null) {
    motionArrived = true;
  }
});

function readInput() {
  if (window.sensorsEnabled && motionArrived) {
    // left and right tilt: about 60 degrees either way covers the whole filter
    cutoff = constrain(map(rotationY, -60, 60, 0.05, 0.9), 0.05, 0.9);
    // towards you and away: flat is none, upright is the most
    resonance = constrain(map(rotationX, 0, 90, 0, 0.85), 0, 0.85);
  } else if (mouseX > 0 || mouseY > 0) {
    cutoff = constrain(map(mouseX, 0, width, 0.05, 0.9), 0.05, 0.9);
    resonance = constrain(map(mouseY, height, 0, 0, 0.85), 0, 0.85);
  }
}

// a tap stops and starts the notes. the first tap belongs to p5-phone, so it is skipped.
function mousePressed() {
  if (!unlocked || millis() - unlockedAt < 500) {
    return;
  }
  playing = !playing;
  if (!playing) {
    stopLastNote();
  }
}

// ---------- the sound ----------

// send the knobs only when they have moved, so the synth is not flooded
function sendKnobs() {
  if (!synthReady) {
    return;
  }
  let changes = {};
  if (abs(cutoff - sentCutoff) > 0.005) {
    changes.filterFreq = { id: 'filterFreq', value: cutoff, normalized: false };
    sentCutoff = cutoff;
  }
  if (abs(resonance - sentResonance) > 0.005) {
    changes.filterRes = { id: 'filterRes', value: resonance, normalized: false };
    sentResonance = resonance;
  }
  if (Object.keys(changes).length > 0) {
    synth.audioNode.setParameterValues(changes);
  }
}

function playPattern() {
  if (!synthReady || !unlocked || !playing || audio.state !== 'running') {
    return;
  }
  if (millis() - lastStepAt < stepTime) {
    return;
  }
  lastStepAt = millis();
  stopLastNote();
  let n = pattern[patternIndex];
  sendMidi([0x90, n, velocity]); // note on
  lastNote = n;
  patternIndex = (patternIndex + 1) % pattern.length;
}

function stopLastNote() {
  if (lastNote >= 0 && synthReady) {
    sendMidi([0x80, lastNote, 0]); // note off
  }
  lastNote = -1;
}

function sendMidi(bytes) {
  synth.audioNode.scheduleEvents({
    type: 'wam-midi',
    time: audio.currentTime,
    data: { bytes: bytes },
  });
  notesSent++;
}

// ---------- the screen ----------

function drawKnobs() {
  let top = height * 0.45;
  let barWidth = width - 40;
  noStroke();
  textSize(16);

  fill(160);
  text('filter (tilt left and right)', 20, top);
  fill(60);
  rect(20, top + 10, barWidth, 24, 6);
  fill(255, 200, 0);
  rect(20, top + 10, barWidth * cutoff, 24, 6);

  fill(160);
  text('resonance (tilt towards you)', 20, top + 70);
  fill(60);
  rect(20, top + 80, barWidth, 24, 6);
  fill(0, 200, 255);
  rect(20, top + 80, barWidth * resonance, 24, 6);

  fill(255);
  textSize(20);
  let state;
  if (!synthReady) {
    state = 'loading the synth…';
  } else if (!unlocked) {
    state = 'tap to turn on sound';
  } else if (!playing) {
    state = 'stopped. tap to start';
  } else {
    state = 'playing. tap to stop';
  }
  text(state, 20, top + 150);

  fill(160);
  textSize(13);
  text('No sound? Check silent mode.', 20, height - 20);
}

function drawLog() {
  fill(220);
  noStroke();
  textSize(14);
  let y = 28;
  let lines = steps.slice();
  lines.push('sound: ' + audio.state + '   latency: ' + round(audio.baseLatency * 1000) + ' ms');
  lines.push('MIDI messages sent: ' + notesSent);
  lines.push('motion: ' + (motionArrived ? 'yes' : 'no (mouse instead)'));
  for (let line of lines) {
    text(line, 20, y);
    y += 20;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
