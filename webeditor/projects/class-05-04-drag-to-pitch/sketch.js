// 04 · Drag to Pitch
// A finger scrubs through a GIF, and every frame has its own note.
// Drag left and right: the hand moves and the note moves with it. Let go and the note fades.
// Touch in, GIF and sound out. Class 3's setFrame() and Class 5's oscillator, from one number.

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
// to use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/hand.gif';
let lowest = 220;          // hertz on the first frame
let highest = 880;         // hertz on the last frame. two octaves up
let waveType = 'sine';     // 'sine', 'triangle', 'sawtooth' or 'square'
let volume = 0.4;          // from 0 to 1
let fadeTime = 0.2;        // seconds to fade in and out. 0 clicks

let gif;        // the GIF
let osc;        // the oscillator
let frame = 0;  // which frame is showing
let started = false;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');

  // the oscillator runs all the time, silent. a finger turns it up.
  osc = new p5.Oscillator(lowest, waveType);
  osc.amp(0);

  gif = await loadImage(gifFile);
  gif.pause(); // the finger chooses the frame, not the GIF's own clock
}

function draw() {
  background(20);

  // start the oscillator once the sound is on
  if (unlocked && !started) {
    osc.start();
    started = true;
  }

  // 1. read the finger. 2. map it onto a frame. 3. the frame chooses the picture and the note.
  let last = gif.numFrames() - 1;
  if (unlocked && mouseIsPressed) {
    frame = round(map(mouseX, 0, width, 0, last, true));
    gif.setFrame(frame);
    osc.freq(map(frame, 0, last, lowest, highest), 0.05);
  }

  drawGif();

  // the labels sit in the top 70 pixels
  fill(255);
  noStroke();
  textSize(16);
  text('frame ' + frame + ' of ' + last + '   note ' + round(map(frame, 0, last, lowest, highest)) + ' hertz', 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('drag left and right to scrub', 20, 52);
  }
  fill(160);
  textSize(13);
  text('The frame and the note are the same number, mapped twice.', 20, height - 12);
}

function mousePressed() {
  userStartAudio(); // a phone can put the sound to sleep. any tap wakes it.
  if (unlocked) {
    osc.amp(volume, fadeTime); // fade in
  }
  return false;
}

function mouseReleased() {
  osc.amp(0, fadeTime); // fade out
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
