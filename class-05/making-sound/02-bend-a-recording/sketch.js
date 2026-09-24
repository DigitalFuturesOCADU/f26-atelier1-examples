// 02 · Bend a Recording
// p5.sound. One recording loops. A finger changes how it plays.
// Left and right is the speed. Up and down is the volume.
// Speed and pitch are tied together: slower is lower, faster is higher.
//
// The recording: RAVAG interval signal, 1925. Austrian radio's clock, ticking 270 times
// a minute between programmes. Public domain.
// https://commons.wikimedia.org/wiki/File:RAVAG-Pausenzeichen.ogg
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
let soundFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wait-ravag.mp3';
let slowest = 0.25; // a quarter of the speed, two octaves down
let fastest = 3;    // three times the speed

let tick;           // the loaded recording
let looping = false;
let speed = 1;      // 1 is the speed it was recorded at
let volume = 0.8;   // from 0 to 1

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');
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

  // 1. read the finger. 2. map it onto a speed and a volume. 3. use them.
  if (unlocked && mouseIsPressed) {
    speed = map(mouseX, 0, width, slowest, fastest, true);
    volume = map(mouseY, height, 70, 0, 1, true);
    tick.rate(speed);
    tick.amp(volume, 0.05);
  }

  // where the finger is, or was last
  let x = map(speed, slowest, fastest, 0, width);
  let y = map(volume, 0, 1, height, 70);
  stroke(70);
  line(x, 70, x, height);
  line(0, y, width, y);
  noStroke();
  fill(255, 200, 0);
  circle(x, y, 40);

  // the labels sit in the top 70 pixels
  fill(255);
  textSize(16);
  text('p5.sound · speed ' + nf(speed, 1, 2) + '   volume ' + nf(volume, 1, 2), 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('drag: left is slow, right is fast, up is loud', 20, 52);
  }
  fill(160);
  textSize(13);
  text('Slow it right down and the phone speaker can barely play it.', 20, height - 12);
}

function mousePressed() {
  userStartAudio(); // a phone can put the sound to sleep. any tap wakes it.
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
