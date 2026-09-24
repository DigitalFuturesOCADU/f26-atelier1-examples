// 03 · Echo a Recording
// p5.sound. The recording goes through an effect before it reaches the speaker.
// The effect is an echo, p5.Delay. Tap to strike the bell.
// Where you tap sets the echo: left and right is the time between repeats,
// up and down is how many repeats you hear before it fades.
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
let shortest = 0.05; // seconds between repeats, at the left edge
let longest = 0.8;   // seconds between repeats, at the right edge. p5.Delay stops at 1
let most = 0.85;     // feedback at the top. 0 is one echo, near 1 is echoes that barely fade
let wetness = 0.5;   // how much of the echo you hear, from 0 to 1

let bell;            // the loaded recording
let echo;            // the effect
let echoTime = 0.3;  // seconds between repeats
let feedback = 0.5;  // how much of each repeat comes back again
let struckAt = -1;   // when the bell was last struck, in milliseconds

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');
  bell = await loadSound(soundFile);

  // unplug the recording from the speaker, and plug it into the echo.
  // the echo is plugged into the speaker already.
  echo = new p5.Delay(echoTime, feedback);
  bell.disconnect();
  bell.connect(echo);
  echo.wet(wetness);
}

function draw() {
  background(20);

  // the strike, then one circle for each repeat, fading.
  // a repeat is feedback times as loud as the one before.
  let cy = 70 + (height - 160) / 2;
  let spacing = map(echoTime, shortest, longest, 30, width / 4);
  let seconds = (millis() - struckAt) / 1000;
  noStroke();
  let loudness = 1;
  for (let i = 0; i < 12 && loudness > 0.05; i++) {
    let x = 60 + i * spacing;
    let heard = struckAt >= 0 && seconds > i * echoTime && seconds < i * echoTime + 0.25;
    if (heard) {
      fill(255, 200, 0);
    } else {
      fill(255, 255 * loudness);
    }
    circle(x, cy, 50 * sqrt(loudness));
    loudness = loudness * feedback;
  }

  // the labels sit in the top 70 pixels
  fill(255);
  textSize(16);
  text('p5.Delay · ' + nf(echoTime, 1, 2) + ' s between repeats   feedback ' + nf(feedback, 1, 2), 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('tap: left is quick repeats, right is slow, higher is more of them', 20, 52);
  }
  fill(160);
  textSize(13);
  text('The echo is not in the recording. It is made as you listen.', 20, height - 12);
}

function mousePressed() {
  // the first tap belongs to the sound message, so it does not strike the bell
  if (!unlocked || bell === undefined) {
    return false;
  }
  userStartAudio(); // a phone can put the sound to sleep. any tap wakes it.

  // 1. read the tap. 2. map it onto the echo. 3. use it, then strike the bell.
  echoTime = map(mouseX, 0, width, shortest, longest, true);
  feedback = map(mouseY, height, 70, 0, most, true);
  echo.delayTime(echoTime, 0);
  echo.feedback(feedback);
  bell.stop();
  bell.play();
  struckAt = millis();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
