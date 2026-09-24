// 03 · Count to Voices · Motion
// Five voices, each one a note of the same chord. The input sets how many sing.
// The question is: how many? Nothing is recorded. p5.sound makes each note with an oscillator.
// Here each shake adds a voice. Only the shakes of the last few seconds count,
// so the voices drop away again when you stop. It is Class 2 · 03 Shake to Filter, counted.
// The touch and sound versions sound the same voices in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.

// H7: ask the phone to treat this page like a music player, so silent mode may not mute it.
// Not tested on a phone yet. If it changes nothing, delete this line.
if ('audioSession' in navigator) navigator.audioSession.type = 'playback';

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
// with a mouse, p5-phone's tap message goes away before the browser sends 'click',
// so the release of the mouse button is caught here as well.
document.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'mouse') {
    unlockAudio();
  }
}, { capture: true });

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

// ---------- the input: motion. this is the only part that changes between versions. ----------
// From Class 2 · 03 Shake to Filter. deviceShaken() is an event:
// p5.js calls it when a shake passes the threshold. Here the sketch remembers when
// each shake happened, and counts the ones inside the last few seconds.

let countSeconds = 4;   // only shakes from the last 4 seconds count
let shakeLockout = 400; // milliseconds. one shake calls deviceShaken() many times in a row

let findings = [
  'Motion can only count over time: shakes in the last ' + countSeconds + ' seconds.',
  'A shake is always one body. Touch can count many hands at once.'
];
let shakeTimes = []; // when each recent shake happened, in milliseconds
let lastShake = -10000;

// a laptop has no motion sensors. this turns true when the first real reading arrives.
let motionArrived = false;
window.addEventListener('devicemotion', function (event) {
  let g = event.accelerationIncludingGravity;
  if (g && g.x !== null) {
    motionArrived = true;
  }
});

function setupInput() {
  setShakeThreshold(30); // lower is easier to trigger
  enablePermissionsTap(['motion', 'sound'], 'Tap to turn on motion and sound');
}

function deviceShaken() {
  // H3: only count it if the lockout has passed since the last one.
  // the status line shows the wait.
  if (millis() - lastShake > shakeLockout) {
    shakeTimes.push(millis());
    lastShake = millis();
  }
}

// how many shakes in the last few seconds?
function readCount() {
  // forget the shakes that are older than countSeconds
  while (shakeTimes.length > 0 && millis() - shakeTimes[0] > countSeconds * 1000) {
    shakeTimes.shift();
  }
  return shakeTimes.length;
}

function inputReading() {
  return 'shakes in the last ' + countSeconds + ' s: ' + shakeTimes.length;
}

function inputStatus() {
  if (!window.sensorsEnabled) {
    return 'tap to turn on motion and sound';
  }
  if (!motionArrived) {
    return 'no motion sensors here. on a laptop, open this on a phone';
  }
  if (millis() - lastShake < shakeLockout) {
    return 'shake counted. waiting a moment before the next';
  }
  return 'shake the phone. each shake adds a voice for a while';
}

// the last few seconds as a strip. each shake is a mark that slides away and drops off the end.
function drawInput() {
  let y = height - 100;
  noStroke();
  fill(45);
  rect(0, y, width, 8);
  fill(255, 90, 90);
  for (let i = 0; i < shakeTimes.length; i++) {
    let age = millis() - shakeTimes[i];
    let x = map(age, 0, countSeconds * 1000, width - 10, 0);
    rect(x, y - 6, 6, 20);
  }
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
  return false;
}
