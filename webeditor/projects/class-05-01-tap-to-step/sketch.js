// 01 · Tap to Step
// A GIF and a sound from the same tap. Each tap moves the cow one frame and plays one note.
// The note climbs with the frame, so the walk becomes a little tune.
// Touch in, GIF and sound out. Class 3's GIF controls plus Class 5's oscillator.

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
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/cow.gif';
let notes = [262, 294, 330, 392, 440, 523, 587, 659]; // hertz. a scale, one note for each frame, then round again
let waveType = 'triangle'; // 'sine', 'triangle', 'sawtooth' or 'square'
let noteLength = 120;      // milliseconds each note sounds
let volume = 0.4;          // from 0 to 1

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

  // the oscillator runs all the time, silent. each tap turns it up for one note.
  osc = new p5.Oscillator(notes[0], waveType);
  osc.amp(0);

  gif = await loadImage(gifFile);
  gif.pause(); // the taps choose the frame, not the GIF's own clock
}

function draw() {
  background(20);

  // start the oscillator once the sound is on
  if (unlocked && !started) {
    osc.start();
    started = true;
  }

  drawGif();

  // the labels sit in the top 70 pixels
  fill(255);
  noStroke();
  textSize(16);
  text('frame ' + frame + ' of ' + gif.numFrames() + '   note ' + notes[frame % notes.length] + ' hertz', 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('tap anywhere: one step, one note', 20, 52);
  }
  fill(160);
  textSize(13);
  text('One event, two outputs. The picture and the sound move together.', 20, height - 12);
}

function mousePressed() {
  // the first tap belongs to the sound message, so it does not step
  if (!unlocked || gif === undefined) {
    return false;
  }
  userStartAudio(); // a phone can put the sound to sleep. any tap wakes it.

  // 1. read the tap. 2. one frame forward, back to 0 after the last. 3. show it and play its note.
  frame = frame + 1;
  if (frame >= gif.numFrames()) {
    frame = 0;
  }
  gif.setFrame(frame);
  osc.freq(notes[frame % notes.length]);
  osc.amp(volume, 0.01); // on
  setTimeout(function () {
    osc.amp(0, 0.1); // and off again
  }, noteLength);
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
