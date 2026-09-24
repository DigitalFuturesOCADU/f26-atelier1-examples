// 03 · Shake to Play
// A shake is a moment. Here it starts something that lasts: the clock rings,
// and the mantis eats for as long as the ring lasts. When the sound ends, the GIF stops.
// Motion in, GIF and sound out. Class 2's shake, Class 3's play() and pause(), Class 5's recording.
//
// The recording: Mechanical clock ring. CC0.
// https://commons.wikimedia.org/wiki/File:Mechanical_Clock_Ring_(Directory.Audio).mp3

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
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/bugEating.gif';
let soundFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wake-clock-ring.mp3';
let playSeconds = 4;   // how long one shake lasts, in seconds. the ring itself is longer
let shakeLevel = 30;   // how hard a shake has to be. lower is easier
let lockout = 400;     // milliseconds. one shake calls deviceShaken() many times in a row

let gif;              // the GIF
let ring;             // the recording
let startedAt = -1;   // when the last shake started it, in milliseconds. -1 is never
let shakes = 0;       // how many shakes so far

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

  enablePermissionsTap(['motion', 'sound'], 'Tap to turn on motion and sound');
  setShakeThreshold(shakeLevel);

  gif = await loadImage(gifFile);
  gif.pause(); // it only eats while the clock rings
  ring = await loadSound(soundFile);
}

function draw() {
  background(20);

  // how long since the last shake? the GIF plays and the sound rings until playSeconds have passed
  let seconds = (millis() - startedAt) / 1000;
  let playing = startedAt >= 0 && seconds < playSeconds;
  if (playing) {
    gif.play();
  } else {
    gif.pause();
    if (ring !== undefined && ring.isPlaying()) {
      ring.stop();
    }
  }

  drawGif();

  // a bar along the bottom for how much time is left
  if (playing) {
    fill(255, 200, 0);
    noStroke();
    rect(0, height - 34, width * (1 - seconds / playSeconds), 6);
  }

  // the labels sit in the top 70 pixels
  fill(255);
  noStroke();
  textSize(16);
  text('shakes: ' + shakes, 20, 30);
  if (!unlocked) {
    text('tap to turn on motion and sound', 20, 52);
  } else if (!motionArrived) {
    text('no motion here. tap instead of a shake', 20, 52);
  } else {
    text('shake the phone', 20, 52);
  }
  fill(160);
  textSize(13);
  text('A moment starts a duration. The sound decides how long.', 20, height - 12);
}

// p5.js calls this when the phone is shaken. one shake calls it many times, so wait out the lockout.
function deviceShaken() {
  if (millis() - startedAt > lockout) {
    startRing();
  }
}

// the fallback: with no motion, a tap does the same, after the first tap has turned the sound on
function mousePressed() {
  userStartAudio(); // a phone can put the sound to sleep. any tap wakes it.
  if (unlocked && !motionArrived) {
    startRing();
  }
  return false;
}

// 1. the moment. 2. start the clock. 3. the sound from the top, and the GIF with it.
// a shake while it rings starts it again.
function startRing() {
  if (ring === undefined || !unlocked) {
    return;
  }
  shakes = shakes + 1;
  startedAt = millis();
  ring.stop();
  ring.play();
  gif.play();
}

// the GIF as large as fits, in the middle, under the labels
function drawGif() {
  let top = 70;
  let bottom = height - 40;
  let s = min(width * 0.9 / gif.width, (bottom - top) * 0.9 / gif.height);
  imageMode(CENTER);
  image(gif, width / 2, (top + bottom) / 2, gif.width * s, gif.height * s);
  imageMode(CORNER);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
