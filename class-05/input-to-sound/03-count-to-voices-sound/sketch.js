// 03 · Count to Voices · Sound
// Five voices, each one a note of the same chord. The input sets how many sing.
// The question is: how many? Nothing is recorded. p5.sound makes each note with an oscillator.
// Here each clap adds a voice. Only the claps of the last few seconds count,
// so the voices drop away again when you stop. It is Class 4 · 02 Clap to Step, counted.
// The touch and motion versions sound the same voices in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.

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

// the feel of the piece. change these before you change anything else.
let notes = [220, 330, 440, 554, 659]; // hertz. A, E, A, C sharp, E: an A major chord, low to high
let waveType = 'triangle'; // 'sine' is softest. 'triangle', 'square' and 'sawtooth' get brighter
let loudness = 0.5;        // all the voices together. keep it under 1 or the sound distorts
let fadeTime = 0.15;       // seconds for a voice to fade in or out

let voices = [];         // one oscillator for each note
let started = false;     // are the oscillators running?
let count = 0;           // how many voices are on
let soundPlayed = false; // has any sound played yet?

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  // one oscillator for each note. they all start silent.
  for (let i = 0; i < notes.length; i++) {
    voices[i] = new p5.Oscillator(notes[i], waveType);
    voices[i].amp(0);
  }
  setupInput();
}

function draw() {
  background(20);

  // the oscillators start once there is a tap
  if (unlocked && !started) {
    startVoices();
  }

  // 1. read the input: how many, as a whole number
  let raw = readCount();
  // 2. keep it inside the range: no more voices than there are notes
  count = constrain(raw, 0, notes.length);
  // 3. and 4. use it: the first voices sing, the rest are silent
  if (started) {
    setVoices(count);
  }

  drawVoices();
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

function startVoices() {
  for (let i = 0; i < voices.length; i++) {
    voices[i].start();
  }
  started = true;
}

// turn on the first n voices. each voice gets quieter as more are added,
// so all of them together are never louder than loudness.
// without this, five voices add up to five times as loud, and the phone distorts.
let lastCount = -1;
function setVoices(n) {
  if (n === lastCount) {
    return; // nothing changed. only send new volumes when the count changes
  }
  lastCount = n;
  let each = 0;
  if (n > 0) {
    each = loudness / n;
    soundPlayed = true;
  }
  for (let i = 0; i < voices.length; i++) {
    if (i < n) {
      voices[i].amp(each, fadeTime);
    } else {
      voices[i].amp(0, fadeTime);
    }
  }
}

// the voices as circles, low notes at the bottom. a voice that sings is lit.
// each circle shrinks as more voices share the loudness.
function drawVoices() {
  let areaTop = 70;
  let areaBottom = height - 90; // room for the notes
  let gap = (areaBottom - areaTop) / notes.length;
  let biggest = min(gap * 0.9, width * 0.4);

  textAlign(CENTER, CENTER);
  for (let i = 0; i < notes.length; i++) {
    let y = areaBottom - gap * (i + 0.5);
    let on = i < count;
    noStroke();
    if (on) {
      fill(255, 200, 0);
      circle(width / 2, y, biggest / sqrt(count));
    } else {
      noFill();
      stroke(80);
      strokeWeight(2);
      circle(width / 2, y, biggest * 0.4);
    }
    noStroke();
    fill(160);
    textSize(13);
    text(notes[i] + ' Hz', width / 2 + biggest * 0.5 + 30, y);
  }
  fill(255);
  textSize(48);
  text(count, width * 0.15, (areaTop + areaBottom) / 2);
  textSize(14);
  text('voices', width * 0.15, (areaTop + areaBottom) / 2 + 34);
  textAlign(LEFT, BASELINE);
}

// the notes along the bottom. the input part adds its own lines.
function drawNotes() {
  let lines = findings.slice(); // a copy, so the list below can grow
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
// From Class 4 · 02 Clap to Step. A clap is the level crossing the line on its way up.
// Here the sketch remembers when each clap happened, and counts the ones in the last few seconds.

let countSeconds = 4; // only claps from the last 4 seconds count
let boost = 5;        // phones hear quietly. raise it if claps do not reach the line
let threshold = 0.35; // the line. how loud a sound has to be to count
let lockout = 200;    // milliseconds. one clap must not count twice

// H9, H10: with the microphone open, the phone hears its own speaker.
let findings = [
  'Sound can only count over time: claps in the last ' + countSeconds + ' seconds.',
  'The voices fill the room, and claps get lost under them.',
  'Use headphones. Without them the phone hears itself.'
];

let mic;   // the microphone
let meter; // measures how loud the microphone is
let level = 0;
let wasAbove = false; // was the level over the line on the last frame?
let lastClap = -10000;
let clapTimes = [];   // when each recent clap happened, in milliseconds

function setupInput() {
  setupMic();
}

// how many claps in the last few seconds?
function readCount() {
  level = getMicLevel();
  // an event, not a value. it only counts at the moment the level
  // crosses the line on its way up. a long hum is one event, not many.
  let isAbove = level > threshold;
  // H3: a clap inside the lockout is not counted. the status line shows the wait.
  if (isAbove && !wasAbove && millis() - lastClap > lockout) {
    clapTimes.push(millis());
    lastClap = millis();
  }
  wasAbove = isAbove;
  // forget the claps that are older than countSeconds
  while (clapTimes.length > 0 && millis() - clapTimes[0] > countSeconds * 1000) {
    clapTimes.shift();
  }
  return clapTimes.length;
}

function inputReading() {
  return 'claps in the last ' + countSeconds + ' s: ' + clapTimes.length + '   level: ' + nf(level, 1, 2);
}

function inputStatus() {
  if (!window.micOpen) {
    return micStatus();
  }
  if (millis() - lastClap < lockout) {
    return 'clap counted. waiting a moment before the next';
  }
  if (wasAbove) {
    return 'still loud. it waits for the level to drop below the line';
  }
  return 'clap. each clap adds a voice for a while';
}

// the level as a bar up the left edge, with the line.
// the last few seconds as a strip. each clap is a mark that slides away and drops off the end.
function drawInput() {
  noStroke();
  fill(100, 200, 255);
  rect(0, height - level * height, 12, level * height);
  stroke(255, 200, 0);
  strokeWeight(2);
  line(0, height - threshold * height, 40, height - threshold * height);
  noStroke();

  let y = height - 100;
  fill(45);
  rect(0, y, width, 8);
  fill(255, 90, 90);
  for (let i = 0; i < clapTimes.length; i++) {
    let age = millis() - clapTimes[i];
    let x = map(age, 0, countSeconds * 1000, width - 10, 0);
    rect(x, y - 6, 6, 20);
  }
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
// This unplugs it from the speaker and plugs it into the level meter.
// It runs every frame, the same way the p5-phone Microphone Level example does it.
function routeMic() {
  mic.disconnect();
  mic.connect(meter);
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
