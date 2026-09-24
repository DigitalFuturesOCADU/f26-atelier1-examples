// 02 · Tilt to Speed
// A GIF and a sound from the same tilt. Lay the phone flat and the jelly and the clock are slow.
// Stand it up and both speed up together.
// Motion in, GIF and sound out. Class 2's tilt, Class 3's gif.delay() and Class 5's rate().
//
// The recording: RAVAG interval signal, 1925. Austrian radio's clock, ticking 270 times
// a minute between programmes. Public domain.
// https://commons.wikimedia.org/wiki/File:RAVAG-Pausenzeichen.ogg

// phones only start sound inside a tap. This catches the first tap, before
// p5-phone's tap message does its own work, and wakes the sound system right there.
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
// with a mouse, p5-phone's tap message goes away before the browser sends 'click'
document.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'mouse') {
    unlockAudio();
  }
}, { capture: true });

// the feel of the piece. change these before you change anything else.
// to use your own GIF or recording, upload it to the sketch and put its file name here
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/jelloGif.gif';
let soundFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wait-ravag.mp3';
let slowDelay = 200;   // milliseconds between GIF frames when the phone lies flat
let fastDelay = 20;    // milliseconds between GIF frames when it stands upright
let slowRate = 0.5;    // the recording's speed when flat. 1 is normal
let fastRate = 2;      // its speed when upright
let smoothing = 0.1;   // 1 is raw and jumpy, 0.05 is slow and calm

let gif;          // the GIF
let tick;         // the recording
let looping = false;
let amount = 0;   // 0 flat, 1 upright, smoothed

// a laptop has no motion sensors. this turns true when the first real reading arrives.
let motionArrived = false;
window.addEventListener('devicemotion', function (event) {
  let g = event.accelerationIncludingGravity;
  if (g && g.x !== null) {
    motionArrived = true;
  }
});

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  angleMode(DEGREES); // rotation values in degrees
  enablePermissionsTap(['motion', 'sound'], 'Tap to turn on motion and sound');

  gif = await loadImage(gifFile);
  tick = await loadSound(soundFile);
}

function draw() {
  background(20);

  // the loop starts as soon as the sound is on
  if (unlocked && !looping) {
    tick.loop();
    tick.play();
    looping = true;
  }

  // 1. read the tilt: 0 flat, 1 upright. the fallback: a finger, higher is more upright.
  let raw = amount;
  if (window.sensorsEnabled && motionArrived) {
    raw = constrain(map(rotationX, 0, 90, 0, 1), 0, 1);
  }
  if (mouseIsPressed) {
    raw = constrain(map(mouseY, height, 70, 0, 1), 0, 1);
  }
  // 2. smooth it
  amount = lerp(amount, raw, smoothing);
  // 3. map it onto both outputs, and use them
  gif.delay(round(map(amount, 0, 1, slowDelay, fastDelay)));
  if (looping) {
    tick.rate(map(amount, 0, 1, slowRate, fastRate));
  }

  drawGif();

  // the labels sit in the top 70 pixels
  fill(255);
  noStroke();
  textSize(16);
  text('tilt ' + nf(amount, 1, 2) + '   GIF delay ' + round(map(amount, 0, 1, slowDelay, fastDelay)) +
       ' ms   rate ' + nf(map(amount, 0, 1, slowRate, fastRate), 1, 2), 20, 30);
  if (!window.sensorsEnabled) {
    text('tap to turn on motion and sound', 20, 52);
  } else if (!motionArrived) {
    text('no motion here. drag a finger up and down', 20, 52);
  } else {
    text('flat is slow, upright is fast, for both', 20, 52);
  }
  fill(160);
  textSize(13);
  text('One stream, two outputs. Tie them together, or pull them apart.', 20, height - 12);
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  userStartAudio();
  return false;
}

// the GIF as large as fits, in the middle, under the labels
function drawGif() {
  let top = 70;
  let bottom = height - 30;
  let s = min(width * 0.9 / gif.width, (bottom - top) * 0.9 / gif.height);
  imageMode(CENTER);
  image(gif, width / 2, (top + bottom) / 2, gif.width * s, gif.height * s);
  imageMode(CORNER);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
