// 08 · Raise to Listen
// Motion and sound together. One input opens the other.
// A heart lies still while the phone lies flat. Raise the phone upright, like a walkie-talkie,
// and the heart starts to beat and the phone starts to listen. The louder you speak, the faster it beats.
// Lower the phone and it stops, however loud the room is.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/CG_Heart.gif';

// the feel of the piece. change these before you change anything else.
let raiseAngle = 60; // degrees. 0 is flat on a table, 90 is standing upright. above this it listens
let slowDelay = 120; // milliseconds between frames when it is quiet. a slow beat
let fastDelay = 20;  // milliseconds between frames when it is loud. a racing beat
let boost = 5;       // phones hear quietly. raise it if the beat barely changes
let smoothing = 0.2; // 1 is raw and jumpy. 0.05 is slow and calm

let mic;   // the microphone
let meter; // measures how loud the microphone is
let gif;
let level = 0;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  angleMode(DEGREES); // rotation values in degrees
  imageMode(CENTER);
  setupMic();

  gif = await loadImage(gifFile);
  gif.pause(); // it waits until the phone is raised
}

function draw() {
  background(20);

  // 1. read the motion: is the phone raised?
  // rotationX is about 0 when the phone lies flat and about 90 when it stands upright
  let raised = window.sensorsEnabled && rotationX > raiseAngle;
  // the fallback: a finger on the screen stands in for raising the phone
  if (mouseIsPressed) {
    raised = true;
  }

  // 2. read the sound, but only while the phone is raised. this is the gate.
  let raw = 0;
  if (raised) {
    raw = getMicLevel();
  }
  level = lerp(level, raw, smoothing);

  // 3. use them: raising starts the beat, and the level sets how fast it is
  if (raised) {
    gif.play();
    gif.delay(round(map(level, 0, 1, slowDelay, fastDelay)));
    tint(255);
  } else {
    gif.pause();
    tint(255, 60); // lowered, the heart fades
  }

  // the labels sit in the top 70 pixels, so the GIF is fitted below them
  let top = 70;
  let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);
  noTint();

  // the level as a bar up the left edge
  noStroke();
  fill(100, 200, 255);
  rect(0, height - level * height, 12, level * height);

  fill(255);
  textSize(16);
  text('tilt: ' + round(rotationX) + '   level: ' + nf(level, 1, 2), 20, 30);
  if (raised) {
    text(micStatus(), 20, 52);
  } else {
    text('raise the phone upright, then speak', 20, 52);
  }
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
  return false;
}

// ---------- the microphone. this part is the same in every sketch. ----------
// two changes from 01 to 04: the tap asks for motion and the microphone together,
// and the status line, because here the finger stands in for the motion, not the sound.

// call this once in setup
function setupMic() {
  mic = new p5.AudioIn(); // p5-phone looks for a variable with exactly this name
  meter = new p5.Amplitude();
  routeMic();
  enableAllTap('Tap to turn on motion and the microphone');
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
    return 'no microphone yet. the rest still works';
  }
  return 'tap to turn on motion and the microphone';
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
