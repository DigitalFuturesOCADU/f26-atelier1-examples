// 04 · Make a Tone
// p5.sound. No recording at all. An oscillator makes the sound as you listen.
// Hold a finger down and it sounds. Left and right is the pitch. Let go and it fades.
// The shape of the wave is the colour of the tone. Try each waveType below.

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
let waveType = 'sine'; // 'sine', 'triangle', 'sawtooth' or 'square'
let lowest = 110;      // hertz at the left edge
let highest = 880;     // hertz at the right edge. three octaves up
let volume = 0.4;      // from 0 to 1
let fadeTime = 0.3;    // seconds to fade in and out. 0 clicks

let osc;               // the oscillator
let started = false;
let pitch = 220;       // hertz

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');

  // it runs all the time, silent, and a finger turns the volume up
  osc = new p5.Oscillator(pitch, waveType);
  osc.amp(0);
}

function draw() {
  background(20);

  // start it once the sound is on
  if (unlocked && !started) {
    osc.start();
    started = true;
  }

  // 1. read the finger. 2. map it onto a pitch. 3. use it.
  let sounding = unlocked && mouseIsPressed;
  if (sounding) {
    pitch = map(mouseX, 0, width, lowest, highest, true);
    osc.freq(pitch, 0.05);
  }

  // the wave: one line, its shape from waveType, its width from the pitch
  let cy = 70 + (height - 160) / 2;
  let waves = map(pitch, lowest, highest, 2, 16);
  let h = 0;
  if (sounding) {
    h = min(width, height) * 0.2;
  }
  stroke(255, 200, 0);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let x = 0; x <= width; x += 2) {
    let phase = (x / width * waves) % 1;
    vertex(x, cy - h * waveShape(phase));
  }
  endShape();
  strokeWeight(1);

  // the labels sit in the top 70 pixels
  noStroke();
  fill(255);
  textSize(16);
  text('p5.Oscillator · ' + waveType + '   ' + round(pitch) + ' hertz', 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('hold a finger down: left is low, right is high', 20, 52);
  }
  fill(160);
  textSize(13);
  text('Nothing was recorded. Change waveType and listen again.', 20, height - 12);
}

// the height of the wave at a point in its cycle, from -1 to 1. only for the drawing.
function waveShape(phase) {
  if (waveType === 'square') {
    if (phase < 0.5) {
      return 1;
    }
    return -1;
  } else if (waveType === 'sawtooth') {
    return 1 - 2 * phase;
  } else if (waveType === 'triangle') {
    return 1 - 4 * abs(phase - 0.5);
  }
  return sin(phase * TWO_PI);
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
