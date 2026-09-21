// 04 · Two Bands
// Low sounds set the size. High sounds set the colour.
// A hum and a whistle can be exactly as loud as each other. Level cannot tell them apart.
// The FFT splits the sound into frequencies, low to high, so the sketch can ask what kind.
// Try a hum, then a whistle. Then "ooo" and "sss". Then a song: the bass and the hi-hats.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/hand.gif';

// the feel of the piece. change these before you change anything else.
let lowFrom = 80;     // the low band, in hertz. a hum lives here
let lowTo = 400;
let highFrom = 1500;  // the high band. a whistle and "sss" live here
let highTo = 6000;
let quietDb = -75;    // decibels that count as nothing. raise it in a noisy room
let loudDb = -35;     // decibels that count as full
let smoothing = 0.25; // 1 is raw and jumpy. 0.05 is slow and calm
let boost = 5;        // only used for the overall level

let mic;   // the microphone
let meter; // measures how loud the microphone is
let fft;   // splits the sound into frequencies
let gif;
let low = 0;
let high = 0;

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
  fft = new p5.FFT(256); // 256 slices, from the lowest frequency to the highest
  setupMic();

  gif = await loadImage(gifFile);
}

function draw() {
  background(20);

  // 1. read the input: one list of 256 numbers, lowest frequency first
  let spectrum = fft.analyze();
  let rawLow = 0;
  let rawHigh = 0;
  if (window.micOpen) {
    routeMic();
    rawLow = getBand(spectrum, lowFrom, lowTo);
    rawHigh = getBand(spectrum, highFrom, highTo);
  }
  // the fallback: a finger stands in for the sound.
  // up and down is the low band. left and right is the high band.
  if (mouseIsPressed) {
    rawLow = constrain(map(mouseY, height, 0, 0, 1), 0, 1);
    rawHigh = constrain(map(mouseX, 0, width, 0, 1), 0, 1);
  }
  // 2. smooth both
  low = lerp(low, rawLow, smoothing);
  high = lerp(high, rawHigh, smoothing);

  // 3. use them: low is the size, high is the colour
  let top = 70;
  let bottom = 110; // room for the bars
  let fit = min(width * 0.9 / gif.width, (height - top - bottom) * 0.95 / gif.height);
  let s = fit * map(low, 0, 1, 0.35, 1);
  tint(255, 255 - high * 215, 255 - high * 215); // more high sound, more red
  image(gif, width / 2, top + (height - top - bottom) / 2, gif.width * s, gif.height * s);
  noTint();

  drawBars(spectrum);

  fill(255);
  noStroke();
  textSize(16);
  text('low: ' + nf(low, 1, 2) + '   high: ' + nf(high, 1, 2), 20, 30);
  text(micStatus(), 20, 52);
}

// how much sound there is between two frequencies, from 0 to 1
function getBand(spectrum, fromHz, toHz) {
  // each slice covers this many hertz
  let hzPerSlice = getAudioContext().sampleRate / 2 / spectrum.length;
  let first = floor(fromHz / hzPerSlice);
  let last = min(ceil(toHz / hzPerSlice), spectrum.length - 1);
  // find the loudest slice inside the band
  let loudest = 0;
  for (let i = first; i <= last; i++) {
    loudest = max(loudest, spectrum[i]);
  }
  return toRange(loudest);
}

// the FFT numbers are tiny, so they are read in decibels, the way a sound meter reads.
// then the decibels are mapped onto 0 to 1.
function toRange(value) {
  let db = 20 * Math.log10(value + 0.0000001);
  return constrain(map(db, quietDb, loudDb, 0, 1), 0, 1);
}

// the spectrum across the bottom, up to 8000 hertz, with the two bands marked.
// make a sound and watch where it lands. that is how you find your own bands.
function drawBars(spectrum) {
  let hzPerSlice = getAudioContext().sampleRate / 2 / spectrum.length;
  let shown = min(ceil(8000 / hzPerSlice), spectrum.length);
  let w = width / shown;
  noStroke();
  for (let i = 0; i < shown; i++) {
    let hz = i * hzPerSlice;
    if (hz >= lowFrom && hz <= lowTo) {
      fill(100, 200, 255); // the low band
    } else if (hz >= highFrom && hz <= highTo) {
      fill(255, 90, 90);   // the high band
    } else {
      fill(90);
    }
    let h = toRange(spectrum[i]) * 90;
    rect(i * w, height - h, w - 1, h);
  }
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
// This unplugs it from the speaker and plugs it into the level meter and the FFT.
// It runs every frame, the same way the p5-phone Microphone Level example does it.
function routeMic() {
  mic.disconnect();
  mic.connect(meter);
  mic.connect(fft);
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
