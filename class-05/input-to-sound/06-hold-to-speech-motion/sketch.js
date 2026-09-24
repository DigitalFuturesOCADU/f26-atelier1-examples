// 06 · Hold to Speech · Motion
// The phone says how long something lasted. The longer it lasted, the slower it speaks.
// The question is: how long?
// Here it is how long the phone is held upright, like a walkie-talkie. Lower it, and listen.
// It is Class 4 · 08 Raise to Listen, timed.
// The touch and sound versions speak in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.
//
// The voice is the browser's own speech, speechSynthesis. It is not a sound file and not
// an oscillator. It sits outside the sound system, so there are no effects on it and nothing
// can measure it. Its settings are fixed when a sentence starts. Nothing changes mid-sentence.
// Every phone has its own voices, so the same sketch sounds different on each one.

// H7: ask the phone to treat this page like a music player, so silent mode may not mute it.
// Not tested on a phone yet. If it changes nothing, delete this line.
if ('audioSession' in navigator) navigator.audioSession.type = 'playback';

// H4, H5: a phone only lets a page speak once a tap has made it speak.
// This catches the first tap, before p5-phone's tap message does its own work,
// and says one word inside that tap. After that, speech works from anywhere.
let unlocked = false;
function unlockSpeech() {
  if (unlocked) {
    return;
  }
  unlocked = true;
  sayText(firstWord, 1);
}
document.addEventListener('touchend', unlockSpeech, { capture: true, once: true });
document.addEventListener('click', unlockSpeech, { capture: true, once: true });
// with a mouse, p5-phone's tap message goes away before the browser sends 'click',
// so the release of the mouse button is caught here as well.
document.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'mouse') {
    unlockSpeech();
  }
}, { capture: true });

// the feel of the piece. change these before you change anything else.
let firstWord = 'Hold.';  // said on the first tap. it tells you what to do
let longest = 5;          // seconds. anything this long or longer is said at the slowest rate
let fastestRate = 1.6;    // speech rate for a very short one. 1 is normal
let slowestRate = 0.5;    // speech rate for a long one

let lastSaid = '';       // the last sentence
let lastRate = 1;        // and its rate
let ignored = 0;         // how many ended while the phone was still speaking
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

  setupInput();
}

function draw() {
  background(20);

  // 1. read the input: did something just end? how many seconds it lasted, or -1
  let seconds = readDuration();
  if (seconds >= 0) {
    // H3: while it is still speaking, a new one is ignored, and the screen counts it
    if (isSpeaking()) {
      ignored = ignored + 1;
    } else {
      // 2. map it: a longer time is a slower rate
      let rate = map(seconds, 0, longest, fastestRate, slowestRate, true);
      // 3. use it: say the time, at that rate
      sayText(nf(seconds, 1, 1) + ' seconds', rate);
    }
  }

  drawSpeech();
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

// say something. the rate is fixed now, for the whole sentence.
function sayText(words, rate) {
  let sentence = new SpeechSynthesisUtterance(words);
  sentence.rate = rate;
  sentence.onstart = function () {
    soundPlayed = true;
  };
  speechSynthesis.speak(sentence);
  lastSaid = words;
  lastRate = rate;
}

// is the phone speaking, or about to?
function isSpeaking() {
  return speechSynthesis.speaking || speechSynthesis.pending;
}

// the last sentence, big, with its rate. it is lit while the phone speaks.
function drawSpeech() {
  let cy = 70 + (height - 70 - 90) / 2;
  textAlign(CENTER, CENTER);
  noStroke();
  if (isSpeaking()) {
    fill(255, 200, 0);
  } else {
    fill(255);
  }
  textSize(40);
  if (lastSaid !== '') {
    text('"' + lastSaid + '"', width / 2, cy);
    textSize(16);
    fill(160);
    text('rate ' + nf(lastRate, 1, 2), width / 2, cy + 44);
  }
  textSize(14);
  fill(160);
  if (isSpeaking()) {
    text('speaking. wait for it to finish', width / 2, cy + 80);
  }
  if (ignored > 0) {
    text('ignored while speaking: ' + ignored, width / 2, cy + 102);
  }
  textAlign(LEFT, BASELINE);
}

// the notes along the bottom. the input part adds its own lines.
function drawNotes() {
  let lines = findings.slice(); // a copy, so the list below can grow
  lines.push('Speech is fixed at the start of each sentence.');
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------- the input: motion. this is the only part that changes between versions. ----------
// From Class 4 · 08 Raise to Listen. rotationX is about 0 when the phone lies flat
// and about 90 when it stands upright. Above raiseAngle counts as raised.

let raiseAngle = 60; // degrees. above this the phone counts as raised

let findings = ['It can only speak from a movement because the first tap spoke.'];
let raisedSince = -1; // when the phone was raised, in milliseconds. -1 is not raised
let lowered = -1;     // seconds it was held up, waiting for draw() to use it

// a laptop has no motion sensors. this turns true when the first real reading arrives.
let motionArrived = false;
window.addEventListener('devicemotion', function (event) {
  let g = event.accelerationIncludingGravity;
  if (g && g.x !== null) {
    motionArrived = true;
  }
});

function setupInput() {
  angleMode(DEGREES); // rotation values in degrees
  enablePermissionsTap(['motion', 'sound'], 'Tap to turn on motion and sound');
}

// did the phone just come down? how many seconds it was up, or -1
function readDuration() {
  if (!window.sensorsEnabled || !motionArrived) {
    return -1;
  }
  let raised = rotationX > raiseAngle;
  if (raised && raisedSince < 0) {
    raisedSince = millis(); // it just went up
  }
  if (!raised && raisedSince >= 0) {
    let seconds = (millis() - raisedSince) / 1000; // it just came down
    raisedSince = -1;
    return seconds;
  }
  return -1;
}

function inputReading() {
  if (raisedSince >= 0) {
    return 'tilt: ' + round(rotationX) + '°   raised: ' + nf((millis() - raisedSince) / 1000, 1, 1) + ' s';
  }
  return 'tilt: ' + round(rotationX) + '°   raised: no';
}

function inputStatus() {
  if (!window.sensorsEnabled) {
    return 'tap to turn on motion and sound';
  }
  if (!motionArrived) {
    return 'no motion sensors here. on a laptop, open this on a phone';
  }
  return 'raise the phone upright, hold it, then lower it';
}

// a bar across the bottom that grows while the phone is up
function drawInput() {
  if (raisedSince >= 0) {
    let seconds = (millis() - raisedSince) / 1000;
    noStroke();
    fill(60);
    rect(0, height - 90, width, 10);
    fill(255, 90, 90);
    rect(0, height - 90, width * constrain(seconds / longest, 0, 1), 10);
  }
}
