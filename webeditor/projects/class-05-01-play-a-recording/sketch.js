// 01 · Play a Recording
// p5.sound. The smallest sound sketch there is: load a recording, then play it.
// Each tap plays it again from the start.
//
// The recording: Lovely meditation bell. CC0. https://archive.org/details/LovelyMeditationBell
// This copy is on the examples site, so it always loads.

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
// to use your own recording, upload it to the sketch and put its file name here, like 'mySound.mp3'
let soundFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/mark-bell.mp3';
let volume = 0.8; // from 0 to 1

let bell;              // the loaded recording
let startedAt = -1;    // when it last started, in milliseconds
let soundPlayed = false;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');

  // load it. setup() waits here until the recording has arrived.
  bell = await loadSound(soundFile);
  bell.amp(volume);
}

function draw() {
  background(20);

  // how far through the recording are we, from 0 to 1?
  let progress = 0;
  if (startedAt >= 0) {
    progress = (millis() - startedAt) / 1000 / bell.duration();
  }
  let playing = startedAt >= 0 && progress < 1;

  // a circle that is lit while the recording plays, and a bar for how far it has got
  let cy = 70 + (height - 160) / 2;
  let d = min(width, height - 160) * 0.6;
  noStroke();
  if (playing) {
    fill(255, 200, 0);
  } else {
    fill(45);
  }
  circle(width / 2, cy, d);
  if (playing) {
    fill(255);
    rect(width / 2 - d / 2, cy + d / 2 + 20, d * progress, 8);
  }

  // the labels sit in the top 70 pixels
  fill(255);
  textSize(16);
  text('p5.sound · one recording', 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('tap to play it   ' + nf(bell.duration(), 1, 1) + ' seconds long', 20, 52);
  }
  fill(160);
  textSize(13);
  text('Each tap starts it again from the beginning.', 20, height - 30);
  if (!soundPlayed) {
    text('No sound? Check silent mode.', 20, height - 12);
  }
}

function mousePressed() {
  // the first tap belongs to the sound message, so it does not play anything
  if (!unlocked || bell === undefined) {
    return false;
  }
  userStartAudio(); // a phone can put the sound to sleep. any tap wakes it.
  bell.stop();
  bell.play();
  startedAt = millis();
  soundPlayed = true;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
