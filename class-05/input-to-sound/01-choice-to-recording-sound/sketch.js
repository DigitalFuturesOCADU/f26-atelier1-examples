// 01 · Choice to Recording · Sound
// Four recordings. The input picks which one plays. The question is: which one?
// Here the kind of sound picks: a low hum or a high whistle. It is Class 4 · 04 Two Bands.
// Sound can reliably tell two kinds apart, not four. So only two of the four can be reached.
// The touch and motion versions play the same four recordings in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.

// The recordings. Each one tells people what to do with time: wait, mark, wake, go.
// wait: RAVAG interval signal, 1925. Austrian radio's clock, ticking 270 times a minute
//       between programmes. Public domain. https://commons.wikimedia.org/wiki/File:RAVAG-Pausenzeichen.ogg
// mark: Lovely meditation bell. CC0. https://archive.org/details/LovelyMeditationBell
// wake: Mechanical clock ring. CC0. https://commons.wikimedia.org/wiki/File:Mechanical_Clock_Ring_(Directory.Audio).mp3
// go:   "Cross now" pedestrian signal, East Molesey, UK. CC0.
//       https://commons.wikimedia.org/wiki/File:Pedestrian_crossing_audio.wav
// None of them needs a credit. They are credited anyway.

// H7: the audio session line in the touch and motion versions is left out here.
// Opening the microphone changes the phone's audio session anyway.

// H5: phones only start sound inside a tap. This catches the first tap, before
// p5-phone's tap message does its own work, and starts the sound system right there.
let unlocked = false;
function unlockAudio() {
  if (unlocked) {
    return;
  }
  unlocked = true;
  userStartAudio();
}
document.addEventListener('touchend', unlockAudio, { capture: true, once: true });
document.addEventListener('click', unlockAudio, { capture: true, once: true });

// Each recording is loaded from its own site by its full web address.
// That is why this sketch has no file to upload.
// To use your own recording, upload it to the sketch and put its file name here, like 'mySound.mp3'.
// The backup is a copy on the examples site. It is only used if the first site does not answer.
// p5.sound's loadSound() never finishes if the address has % codes in it, like %28.
// Write the characters out, like ( ). It does not report an error, which is why this sketch has a time limit.
let recordings = [
  {
    name: 'wait',
    file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8c/RAVAG-Pausenzeichen.ogg/RAVAG-Pausenzeichen.ogg.mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wait-ravag.mp3'
  },
  {
    name: 'mark',
    file: 'https://archive.org/download/LovelyMeditationBell/STE-015.mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/mark-bell.mp3'
  },
  {
    name: 'wake',
    file: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Mechanical_Clock_Ring_(Directory.Audio).mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wake-clock-ring.mp3'
  },
  {
    name: 'go',
    file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4a/Pedestrian_crossing_audio.wav/Pedestrian_crossing_audio.wav.mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/go-crossing.mp3'
  }
];

// the feel of the piece. change these before you change anything else.
let secondsToWait = 10; // how long to wait for a site before loading the backup copy

let sounds = [];         // the four loaded recordings
let playing = -1;        // which recording is playing. -1 is none
let startedAt = 0;       // when it started, in milliseconds
let soundPlayed = false; // has any sound played yet?
let usedBackup = false;  // did a site fail to answer?

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  setupInput();

  // load the four recordings. there is no await here, so draw() starts straight away
  // and each tile says 'loading' until its recording arrives.
  loadAll();
}

function draw() {
  background(20);

  // 1. read the input: which one was chosen this frame? -1 means none
  let choice = readChoice();

  // 2. use it: play the chosen recording from the start
  if (choice >= 0) {
    playRecording(choice);
  }

  // 3. show it: the four recordings, and the input on top
  drawTiles();
  drawInput();

  // the labels sit in the top 70 pixels, the same in every version
  fill(255);
  noStroke();
  textSize(16);
  text(inputReading(), 20, 30);
  text(inputStatus(), 20, 52);
  drawNotes();
}

// ---------- the sound. this part is the same in the touch, motion and sound versions. ----------

// load the four recordings, one after the other
async function loadAll() {
  for (let i = 0; i < recordings.length; i++) {
    sounds[i] = await loadRecording(recordings[i]);
  }
}

// load one recording by its web address.
// a site that does not answer never says no. it just never finishes.
// so the sketch waits a few seconds, and then loads the backup copy instead.
async function loadRecording(recording) {
  let sound = await Promise.race([loadSound(recording.file), timeLimit(secondsToWait)]);
  if (sound === undefined) {
    usedBackup = true;
    sound = await loadSound(recording.backup);
  }
  return sound;
}

// a promise that is kept after some seconds, with nothing inside it
function timeLimit(seconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, seconds * 1000);
  });
}

// play one recording from the start. whatever was playing stops.
function playRecording(n) {
  if (sounds[n] === undefined) {
    return; // not loaded yet
  }
  if (playing >= 0) {
    sounds[playing].stop();
  }
  sounds[n].play();
  playing = n;
  startedAt = millis();
  soundPlayed = true;
}

// the four recordings as four tiles. the one playing is lit, with a bar for how far it has got.
function drawTiles() {
  let tileTop = 70;
  let tileBottom = height - 90; // room for the notes
  let w = width / 2;
  let h = (tileBottom - tileTop) / 2;
  let seconds = (millis() - startedAt) / 1000;

  for (let i = 0; i < 4; i++) {
    let x = (i % 2) * w;
    let y = tileTop + floor(i / 2) * h;
    let loaded = sounds[i] !== undefined;
    let isOn = loaded && i === playing && seconds < sounds[i].duration();

    stroke(20);
    strokeWeight(6);
    if (isOn) {
      fill(255, 200, 0);
    } else {
      fill(45);
    }
    rect(x, y, w, h);

    noStroke();
    textAlign(CENTER, CENTER);
    textSize(28);
    if (isOn) {
      fill(20);
      rect(x + 10, y + h - 20, (w - 20) * seconds / sounds[i].duration(), 8);
    } else {
      fill(255);
    }
    text(recordings[i].name, x + w / 2, y + h / 2);
    if (!loaded) {
      textSize(14);
      text('loading', x + w / 2, y + h / 2 + 30);
    }
    textAlign(LEFT, BASELINE);
  }
}

// the notes along the bottom. the input part adds its own lines.
function drawNotes() {
  let lines = findings.slice(); // a copy, so the list below can grow
  if (usedBackup) {
    lines.push('Loaded the backup copy: the original site did not answer.');
  }
  // H6, H8: until the first sound plays, say what usually silences a phone
  if (!soundPlayed) {
    lines.push('No sound? Check silent mode.');
  }
  fill(160);
  noStroke();
  textSize(13);
  let y = height - 12;
  for (let i = lines.length - 1; i >= 0; i--) {
    text(lines[i], 20, y);
    y = y - 18;
  }
}

// a phone can put the sound system to sleep when you leave the page.
// any touch wakes it up again.
function wakeAudio() {
  if (getAudioContext().state !== 'running') {
    userStartAudio();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------- the input: sound. this is the only part that changes between versions. ----------
// From Class 4 · 04 Two Bands. The FFT splits the sound into frequencies, low to high.
// A low sound plays one recording. A high sound plays another.
// Telling four kinds of sound apart needs a trained model, like Class 4 · 05 Label to Image.

let lowFrom = 80;     // the low band, in hertz. a hum lives here
let lowTo = 400;
let highFrom = 1500;  // the high band. a whistle and "sss" live here
let highTo = 6000;
let quietDb = -75;    // decibels that count as nothing. raise it in a noisy room
let loudDb = -35;     // decibels that count as full
let threshold = 0.6;  // how strong a band has to be to count
let quietLevel = 0.3; // both bands must drop under this before the next sound counts
let lowPlays = 0;     // the recording a low sound plays: 0 is wait
let highPlays = 3;    // the recording a high sound plays: 3 is go
let boost = 5;        // only used for the overall level

// H9, H10: with the microphone open, the phone hears its own speaker.
let findings = [
  'Sound tells two kinds apart, so only wait and go can play.',
  'Four kinds need a trained model (Class 4 · 05).',
  'Use headphones. Without them the phone hears itself.'
];

let mic;   // the microphone
let meter; // measures how loud the microphone is
let fft;   // splits the sound into frequencies
let low = 0;
let high = 0;
let armed = true; // ready for the next sound? it re-arms when it is quiet again
let kind = '';    // the last kind heard: low or high

function setupInput() {
  fft = new p5.FFT(256); // 256 slices, from the lowest frequency to the highest
  setupMic();
}

// which recording did the last sound pick? -1 means none this frame
function readChoice() {
  // one list of 256 numbers, lowest frequency first
  let spectrum = fft.analyze();
  low = 0;
  high = 0;
  if (window.micOpen) {
    routeMic();
    low = getBand(spectrum, lowFrom, lowTo);
    high = getBand(spectrum, highFrom, highTo);
  }
  // quiet again? then the next sound can count
  if (low < quietLevel && high < quietLevel) {
    armed = true;
    return -1;
  }
  // H3: it waits for quiet between sounds. the status line says so.
  if (!armed) {
    return -1;
  }
  if (max(low, high) > threshold) {
    armed = false;
    if (low > high) {
      kind = 'low';
      return lowPlays;
    }
    kind = 'high';
    return highPlays;
  }
  return -1;
}

// how much sound there is between two frequencies, from 0 to 1
function getBand(spectrum, fromHz, toHz) {
  // each slice covers this many hertz
  let hzPerSlice = getAudioContext().sampleRate / 2 / spectrum.length;
  let first = floor(fromHz / hzPerSlice);
  let last = min(ceil(toHz / hzPerSlice), spectrum.length - 1);
  // find the loudest slice inside the band
  let loudest = 0;
  for (let i = first; i <= last; i++) {
    loudest = max(loudest, spectrum[i]);
  }
  return toRange(loudest);
}

// the FFT numbers are tiny, so they are read in decibels, the way a sound meter reads.
// then the decibels are mapped onto 0 to 1.
function toRange(value) {
  let db = 20 * Math.log10(value + 0.0000001);
  return constrain(map(db, quietDb, loudDb, 0, 1), 0, 1);
}

function inputReading() {
  let words = 'low: ' + nf(low, 1, 2) + '   high: ' + nf(high, 1, 2);
  if (kind !== '') {
    words = words + '   heard: ' + kind;
  }
  return words;
}

function inputStatus() {
  if (!window.micOpen) {
    return micStatus();
  }
  if (!armed) {
    return 'waiting for quiet before the next sound';
  }
  return 'hum low for wait. whistle high for go';
}

// the two bands as two bars up the left edge: low is blue, high is red.
// the line is the threshold.
function drawInput() {
  noStroke();
  fill(100, 200, 255);
  rect(0, height - low * height, 12, low * height);
  fill(255, 90, 90);
  rect(14, height - high * height, 12, high * height);
  stroke(255, 200, 0);
  strokeWeight(2);
  line(0, height - threshold * height, 40, height - threshold * height);
  noStroke();
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
  return false;
}

// ---------- the microphone. this part is the same in every sketch. ----------
// (wakeAudio() and windowResized() are in the sound part above, so they are not repeated here.)

// call this once in setup
function setupMic() {
  mic = new p5.AudioIn(); // p5-phone looks for a variable with exactly this name
  meter = new p5.Amplitude();
  routeMic();
  enableMicTap('Tap to turn on the microphone');
}

// p5.sound sends the microphone straight to the speaker unless you stop it.
// This unplugs it from the speaker and plugs it into the level meter and the FFT.
// It runs every frame, the same way the p5-phone Microphone Level example does it.
function routeMic() {
  mic.disconnect();
  mic.connect(meter);
  mic.connect(fft);
}

// how loud it is right now, from 0 to 1. it is 0 when there is no microphone.
// window.micOpen is true only while sound is really arriving.
// window.micEnabled turns true on the tap even if the person says no, so it is not enough.
function getMicLevel() {
  if (!window.micOpen) {
    return 0;
  }
  routeMic();
  return constrain(meter.getLevel() * boost, 0, 1);
}

// one line for the screen that says what the microphone is doing
function micStatus() {
  if (window.micOpen) {
    return 'listening';
  }
  if (window.micEnabled) {
    return 'waiting for the microphone. if it never comes, check the permission';
  }
  return 'tap to turn on the microphone';
}
