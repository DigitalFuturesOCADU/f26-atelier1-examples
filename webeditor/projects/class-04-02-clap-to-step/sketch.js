// 02 · Clap to Step
// The GIF holds still. Each sound that crosses the line moves it one frame.
// Example 01 asked how loud. This one asks when.
// Try one clap, then a rhythm. Then a dripping tap, or a song with a strong beat.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/cow.gif';

// the feel of the piece. change these before you change anything else.
let boost = 5;        // phones hear quietly. raise it if claps do not reach the line
let threshold = 0.35; // the line. how loud a sound has to be to count
let lockout = 200;    // milliseconds. one clap must not count twice

let mic;   // the microphone
let meter; // measures how loud the microphone is
let gif;
let frame = 0;
let wasAbove = false; // was the level over the line on the last frame?
let lastHit = 0;      // when the last sound counted, in milliseconds
let gap = 0;          // time between the last two sounds

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
  gif.pause(); // the sound chooses when to move, not the clock
}

function draw() {
  background(20);

  let level = getMicLevel();

  // an event, not a value. it only counts at the moment the level
  // crosses the line on its way up. a long hum is one event, not many.
  let isAbove = level > threshold;
  if (isAbove && !wasAbove && millis() - lastHit > lockout) {
    nextFrame();
  }
  wasAbove = isAbove;

  // the labels sit in the top 70 pixels, so the GIF is fitted below them
  let top = 70;
  let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);

  // the level as a bar up the left edge. it flashes when a sound counts.
  noStroke();
  if (millis() - lastHit < 120) {
    fill(255, 200, 0);
  } else {
    fill(100, 200, 255);
  }
  rect(0, height - level * height, 12, level * height);
  // the line
  stroke(255, 200, 0);
  strokeWeight(2);
  line(0, height - threshold * height, 40, height - threshold * height);
  noStroke();

  fill(255);
  textSize(16);
  text('frame: ' + frame + '   gap: ' + round(gap) + ' ms', 20, 30);
  text(micStatus() + '. a tap also counts as one step', 20, 52);
}

// one frame forward, and remember when it happened.
// (it cannot be called step. p5.js already has a function with that name.)
function nextFrame() {
  frame = frame + 1;
  if (frame >= gif.numFrames()) {
    frame = 0;
  }
  gif.setFrame(frame);
  gap = millis() - lastHit;
  lastHit = millis();
}

// the fallback: a tap stands in for the sound.
// the first tap belongs to the microphone message, so it is not counted.
function mousePressed() {
  wakeAudio();
  if (window.micEnabled) {
    nextFrame();
  }
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
