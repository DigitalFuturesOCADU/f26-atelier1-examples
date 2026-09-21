// 01 · Level to Frame
// How loud it is picks the frame. Nothing plays on its own.
// Try a clap, a hum, and blowing on the microphone. All three are one number.
// Then put the phone next to a speaker, or by an open window.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/jelloGif.gif';

// the feel of the piece. change these before you change anything else.
let boost = 5;       // phones hear quietly. raise it if the GIF barely moves
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

  imageMode(CENTER);
  setupMic();

  gif = await loadImage(gifFile);
  gif.pause(); // the sound chooses the frame, not the clock
}

function draw() {
  background(20);

  // 1. read the input: how loud is it, from 0 to 1
  let raw = getMicLevel();
  // the fallback: a finger stands in for the sound. higher on the screen is louder.
  if (mouseIsPressed) {
    raw = constrain(map(mouseY, height, 0, 0, 1), 0, 1);
  }
  // 2. smooth it: move part of the way toward the new value each frame
  level = lerp(level, raw, smoothing);
  // 3. map the level range onto the frame range
  let last = gif.numFrames() - 1;
  let frame = round(map(level, 0, 1, 0, last));
  // 4. use it
  gif.setFrame(frame);

  // the labels sit in the top 70 pixels, so the GIF is fitted below them
  let top = 70;
  let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);

  // the level as a bar up the left edge
  noStroke();
  fill(100, 200, 255);
  rect(0, height - level * height, 12, level * height);

  fill(255);
  textSize(16);
  text('level: ' + nf(level, 1, 2) + '   frame: ' + frame, 20, 30);
  text(micStatus(), 20, 52);
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
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
