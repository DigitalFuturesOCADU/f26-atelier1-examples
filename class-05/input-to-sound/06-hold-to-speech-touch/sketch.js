// 06 · Hold to Speech · Touch
// The phone says how long something lasted. The longer it lasted, the slower it speaks.
// The question is: how long?
// Here it is how long a finger stays on the screen. Hold, let go, and listen.
// The motion and sound versions speak in the same way.
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

// ---------- the input: touch. this is the only part that changes between versions. ----------
// From the p5-phone Touch Basic example: when the finger lands, and when it lifts.

let findings = ['A finger says exactly when it starts and when it stops.'];
let holdStart = -1; // when the finger landed, in milliseconds. -1 is not touching
let released = -1;  // seconds held, waiting for draw() to use it

function setupInput() {
  enableSoundTap('Tap to turn on sound');
}

function mousePressed() {
  // the first tap belongs to the permission message, so it is not timed
  if (unlocked) {
    holdStart = millis();
  }
  return false;
}

function mouseReleased() {
  if (holdStart >= 0) {
    released = (millis() - holdStart) / 1000;
    holdStart = -1;
  }
  return false;
}

// hand draw() the finished hold once, then forget it
function readDuration() {
  let seconds = released;
  released = -1;
  return seconds;
}

function inputReading() {
  if (holdStart >= 0) {
    return 'holding: ' + nf((millis() - holdStart) / 1000, 1, 1) + ' s';
  }
  return 'holding: no';
}

function inputStatus() {
  if (!unlocked) {
    return 'tap to turn on sound';
  }
  return 'hold a finger on the screen, then let go';
}

// a bar across the bottom that grows while the finger is down
function drawInput() {
  if (holdStart >= 0) {
    let seconds = (millis() - holdStart) / 1000;
    noStroke();
    fill(60);
    rect(0, height - 90, width, 10);
    fill(255, 90, 90);
    rect(0, height - 90, width * constrain(seconds / longest, 0, 1), 10);
  }
}
