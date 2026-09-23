// 02 · Amount to Speed · Sound
// One recording loops. The input sets how fast it plays. The question is: how much?
// Speed and pitch change together, like a record played too fast or too slow.
// Here how loud it is sets it. Quiet is slow. Loud is fast. It is Class 4 · 01 Level to Frame.
// On a speaker it runs away: the phone hears its own loop, and that speeds it up.
// The touch and motion versions change the same loop in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.

// The recording: RAVAG interval signal, 1925. Austrian radio's clock, ticking 270 times
// a minute between programmes. Public domain. It needs no credit. It is credited anyway.
// https://commons.wikimedia.org/wiki/File:RAVAG-Pausenzeichen.ogg

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

// The recording is loaded from its own site by its full web address.
// That is why this sketch has no file to upload.
// To use your own recording, upload it to the sketch and put its file name here, like 'mySound.mp3'.
// The backup is a copy on the examples site. It is only used if the first site does not answer.
//
// Try the bell instead. Swap in these two addresses:
//   https://archive.org/download/LovelyMeditationBell/STE-015.mp3
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/mark-bell.mp3
// At half speed the bell's note drops to about 175 Hz. Most phone speakers can barely play
// a note that low, so it goes quiet. That is the speaker's limit, not the code's.
let recording = {
  name: 'wait',
  file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8c/RAVAG-Pausenzeichen.ogg/RAVAG-Pausenzeichen.ogg.mp3',
  backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wait-ravag.mp3'
};

// the feel of the piece. change these before you change anything else.
let slowest = 0.5;      // half speed. an octave lower
let fastest = 2;        // double speed. an octave higher
let smoothing = 0.2;    // 1 is raw and jumpy. 0.05 is slow and calm
let secondsToWait = 10; // how long to wait for a site before loading the backup copy

let loopSound;           // the loaded recording
let looping = false;     // has the loop started?
let amount = 0.33;       // from 0 to 1. how much. 0.33 starts it near normal speed
let speed = 1;           // the playback rate. 1 is normal
let handAngle = 0;       // the clock hand, in degrees
let soundPlayed = false; // has any sound played yet?
let usedBackup = false;  // did the site fail to answer?

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  angleMode(DEGREES);
  setupInput();

  // load the recording. there is no await here, so draw() starts straight away
  // and the screen says 'loading' until the recording arrives.
  loadRecording(recording).then(function (sound) {
    loopSound = sound;
  });
}

function draw() {
  background(20);

  // the loop starts once there is a tap and a recording
  if (unlocked && loopSound !== undefined && !looping) {
    startLoop();
  }

  // 1. read the input: how much, from 0 to 1. -1 means no new reading, so keep the last one
  let raw = readAmount();
  if (raw >= 0) {
    // 2. smooth it: move part of the way toward the new value each frame
    amount = lerp(amount, raw, smoothing);
  }
  // 3. map it: the amount range onto the speed range
  speed = map(amount, 0, 1, slowest, fastest);
  // 4. use it
  if (looping) {
    loopSound.rate(speed);
  }

  drawClock();
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

// load one recording by its web address.
// a site that does not answer never says no. it just never finishes.
// so the sketch waits a few seconds, and then loads the backup copy instead.
async function loadRecording(rec) {
  let sound = await Promise.race([loadSound(rec.file), timeLimit(secondsToWait)]);
  if (sound === undefined) {
    usedBackup = true;
    sound = await loadSound(rec.backup);
  }
  return sound;
}

// a promise that is kept after some seconds, with nothing inside it
function timeLimit(seconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, seconds * 1000);
  });
}

// start the recording and keep it going round
function startLoop() {
  loopSound.loop();
  loopSound.play();
  looping = true;
  soundPlayed = true;
}

// a clock face. the hand turns at the speed of the recording.
// the amount is the bar up the left edge, the same as the level bar in Class 4.
function drawClock() {
  let cx = width / 2;
  let cy = 70 + (height - 70 - 90) / 2;
  let r = min(width, height - 160) * 0.38;

  if (looping) {
    handAngle = handAngle + speed * 27 / 60; // at normal speed, one turn every 13 seconds
  }

  noFill();
  stroke(90);
  strokeWeight(4);
  circle(cx, cy, r * 2);
  for (let i = 0; i < 12; i++) {
    let a = i * 30;
    line(cx + r * 0.85 * sin(a), cy - r * 0.85 * cos(a), cx + r * sin(a), cy - r * cos(a));
  }
  stroke(255, 200, 0);
  strokeWeight(6);
  line(cx, cy, cx + r * 0.8 * sin(handAngle), cy - r * 0.8 * cos(handAngle));

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(40);
  if (loopSound === undefined) {
    textSize(20);
    text('loading', cx, cy + r + 40);
  } else {
    text(nf(speed, 1, 2) + '×', cx, cy + r + 40);
  }
  textAlign(LEFT, BASELINE);

  // the amount as a bar up the left edge
  fill(100, 200, 255);
  rect(0, height - amount * height, 12, amount * height);
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
// From Class 4 · 01 Level to Frame. getMicLevel() is how loud it is, from 0 to 1.

let boost = 5; // phones hear quietly. raise it if the speed barely moves

// H9, H10: with the microphone open, the phone hears its own speaker.
let findings = [
  'On a speaker it hears its own loop, and speeds itself up.',
  'Use headphones. Without them the phone hears itself.'
];

let mic;   // the microphone
let meter; // measures how loud the microphone is
let level = 0;

function setupInput() {
  setupMic();
}

// how loud it is, from 0 to 1. -1 if the microphone is not open
function readAmount() {
  if (!window.micOpen) {
    return -1;
  }
  level = getMicLevel();
  return level;
}

function inputReading() {
  return 'level: ' + nf(level, 1, 2);
}

function inputStatus() {
  if (!window.micOpen) {
    return micStatus();
  }
  return 'quiet is slow. make a sound to speed it up';
}

// the level needs nothing extra on screen. the bar up the left edge is the amount.
function drawInput() {
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
