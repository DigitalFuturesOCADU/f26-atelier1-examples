// 03 · Hold and Silence
// The mantis only eats when it has been quiet for a while. Any noise and it freezes.
// Silence is an input too. The sketch is timing how long a condition has lasted.
// Flip waitForQuiet to false and it is the opposite piece:
// the GIF only plays while a sound is held, like a long hum.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/bugEating.gif';

// the feel of the piece. change these before you change anything else.
let waitForQuiet = true; // true: plays after quiet. false: plays after a held sound
let waitSeconds = 3;     // how long the quiet, or the sound, has to last
let threshold = 0.15;    // the line between quiet and not quiet
let boost = 5;           // phones hear quietly

let mic;   // the microphone
let meter; // measures how loud the microphone is
let fingerDown = false; // true while a finger is on the screen, after the microphone tap
let gif;
let since = 0; // when the condition last started, in milliseconds

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  imageMode(CENTER);
  setupMic();

  gif = await loadImage(gifFile);
  gif.pause();
  since = millis();
}

function draw() {
  background(20);

  let level = getMicLevel();
  // the fallback: a finger on the screen stands in for sound
  if (fingerDown) {
    level = 1;
  }

  // is the condition true right now?
  let conditionMet;
  if (waitForQuiet) {
    conditionMet = level < threshold;
  } else {
    conditionMet = level > threshold;
  }

  // the moment it stops being true, the clock starts again from zero
  if (!conditionMet) {
    since = millis();
  }
  let held = (millis() - since) / 1000; // seconds the condition has lasted

  if (held > waitSeconds) {
    gif.play();
  } else {
    gif.pause();
  }

  // the labels sit in the top 90 pixels, so the GIF is fitted below them
  let top = 90;
  let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);

  // the wait, as a bar across the bottom. it fills, and any break empties it.
  noStroke();
  fill(60);
  rect(0, height - 12, width, 12);
  fill(255, 200, 0);
  rect(0, height - 12, width * constrain(held / waitSeconds, 0, 1), 12);

  fill(255);
  textSize(16);
  text('level: ' + nf(level, 1, 2) + '   held: ' + nf(held, 1, 1) + ' s', 20, 30);
  text(micStatus(), 20, 52);
  if (waitForQuiet) {
    text('stay quiet for ' + waitSeconds + ' seconds', 20, 74);
  } else {
    text('hold a sound for ' + waitSeconds + ' seconds', 20, 74);
  }
}

// the first tap belongs to the microphone message, so it is not counted.
// p5's own mouseIsPressed can stay stuck after that tap, so the sketch keeps its own record.
function mousePressed() {
  wakeAudio();
  if (window.micEnabled) {
    fingerDown = true;
  }
  return false;
}

function mouseReleased() {
  fingerDown = false;
  return false;
}

// ---------- the microphone. this part is the same in every sketch. ----------

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

// true only when the phone has really handed over a live microphone.
// window.micEnabled turns true on the tap, even if the person then says no,
// so this also checks that sound is actually arriving.
function micIsOpen() {
  return window.micEnabled === true && mic.node.state === 'started';
}

// how loud it is right now, from 0 to 1. it is 0 when there is no microphone.
function getMicLevel() {
  if (!micIsOpen()) {
    return 0;
  }
  routeMic();
  return constrain(meter.getLevel() * boost, 0, 1);
}

// one line for the screen that says what the microphone is doing
function micStatus() {
  if (micIsOpen()) {
    return 'listening';
  }
  if (window.micEnabled) {
    return 'waiting for the microphone. if it never comes, use a finger';
  }
  return 'tap to turn on the microphone';
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
