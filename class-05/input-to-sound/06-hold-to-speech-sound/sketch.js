// 06 · Hold to Speech · Sound
// The phone says how long something lasted. The longer it lasted, the slower it speaks.
// The question is: how long?
// Here it is how long a sound lasted, like a long hum. When it stops, the phone speaks.
// Flip timeTheSound to false and it times the silence instead. It is Class 4 · 03 Hold and Silence.
// The touch and motion versions speak in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.
//
// The voice is the browser's own speech, speechSynthesis. It is not a sound file and not
// an oscillator. It sits outside the sound system, so there are no effects on it and nothing
// can measure it. Its settings are fixed when a sentence starts. Nothing changes mid-sentence.
// Every phone has its own voices, so the same sketch sounds different on each one.

// H7: the audio session line in the touch and motion versions is left out here.
// Opening the microphone changes the phone's audio session anyway.

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

// ---------- the input: sound. this is the only part that changes between versions. ----------
// From Class 4 · 03 Hold and Silence. The sketch times how long a condition lasted:
// the level above the line (a sound), or below it (a silence).

let timeTheSound = true; // true: how long a sound lasted. false: how long a silence lasted
let threshold = 0.15;    // the line between quiet and not quiet
let endAfter = 0.3;      // seconds. a gap shorter than this, like between two words, does not end a sound
let shortest = 0.3;      // seconds. anything shorter is not spoken
let boost = 5;           // phones hear quietly

// H9, H10: with the microphone open, the phone hears its own speaker.
let findings = [
  'On a speaker it hears itself talk, and times that too.',
  'Use headphones. Without them the phone hears itself.'
];

let mic;   // the microphone
let meter; // measures how loud the microphone is
let level = 0;
let soundSince = -1; // when the current sound started, in milliseconds. -1 is none
let lastLoud = -1;   // the last moment the level was over the line
let quietSince = -1; // when the current silence started. -1 is none

function setupInput() {
  setupMic();
}

// did a sound (or a silence) just end? how many seconds it lasted, or -1
function readDuration() {
  if (!window.micOpen) {
    return -1;
  }
  level = getMicLevel();
  let loud = level > threshold;
  let now = millis();
  let seconds = -1;

  if (loud) {
    lastLoud = now;
    if (soundSince < 0) {
      soundSince = now; // a sound just started
    }
  }
  // a sound ends once it has been quiet for endAfter seconds
  let soundEnded = soundSince >= 0 && now - lastLoud > endAfter * 1000;

  if (timeTheSound) {
    if (soundEnded) {
      seconds = (lastLoud - soundSince) / 1000;
    }
  } else {
    // a silence starts when a sound ends, and ends when the next sound starts
    if (soundSince < 0 && quietSince < 0) {
      quietSince = now;
    }
    if (loud && quietSince >= 0) {
      seconds = (now - quietSince) / 1000;
      quietSince = -1;
    }
  }
  if (soundEnded) {
    soundSince = -1;
  }
  if (seconds >= 0 && seconds < shortest) {
    return -1; // too short to say
  }
  return seconds;
}

function inputReading() {
  let words = 'level: ' + nf(level, 1, 2);
  if (timeTheSound && soundSince >= 0) {
    words = words + '   sound: ' + nf((millis() - soundSince) / 1000, 1, 1) + ' s';
  }
  if (!timeTheSound && quietSince >= 0) {
    words = words + '   silence: ' + nf((millis() - quietSince) / 1000, 1, 1) + ' s';
  }
  return words;
}

function inputStatus() {
  if (!window.micOpen) {
    return micStatus();
  }
  if (timeTheSound) {
    return 'hum for a while, then stop';
  }
  return 'stay quiet for a while, then make a sound';
}

// the level as a bar up the left edge, with the line
function drawInput() {
  noStroke();
  fill(100, 200, 255);
  rect(0, height - level * height, 12, level * height);
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

// a phone can put the sound system to sleep when you leave the page.
// any touch wakes it up again.
// (the touch and motion versions have no sound system of their own, so this one lives here.)
function wakeAudio() {
  if (getAudioContext().state !== 'running') {
    userStartAudio();
  }
}

// ---------- the microphone. this part is the same in every sketch. ----------
// (windowResized() is in the sound part above, so it is not repeated here.)

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
