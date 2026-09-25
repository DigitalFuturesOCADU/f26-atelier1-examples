// 02 · Level to Shape
// The last few seconds of sound, wrapped around a circle.
// Each frame the newest level goes in at the top and the oldest falls out,
// so the shape turns slowly and a clap travels round it like a bump in a ring.
// Sound in, a drawn shape out. Class 4's level, drawn with splineVertex() instead of a circle.

// the feel of the piece. change these before you change anything else.
let points = 90;     // how many levels the ring remembers. more is a longer memory
let boost = 5;       // phones hear quietly. raise it if the shape barely moves
let smoothing = 0.3; // 1 is raw and jumpy. 0.05 is slow and calm
let reach = 0.8;     // how far a loud sound pushes out, as a share of the radius

let mic;             // the microphone
let meter;           // measures how loud the microphone is
let level = 0;
let history = [];    // the remembered levels, newest first

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  setupMic();
  for (let i = 0; i < points; i++) {
    history.push(0);
  }
}

function draw() {
  background(20);

  // 1. read the input: how loud is it, from 0 to 1. the fallback: higher finger is louder.
  let raw = getMicLevel();
  if (mouseIsPressed) {
    raw = constrain(map(mouseY, height, 0, 0, 1), 0, 1);
  }
  // 2. smooth it
  level = lerp(level, raw, smoothing);
  // 3. remember it: in at the front, the oldest out at the back
  history.unshift(level);
  history.pop();

  // 4. draw the memory as one closed curve. each level is a distance from the centre.
  let radius = min(width, height) * 0.25;
  push();
  translate(width / 2, height / 2 + 20);
  fill(255, 90, 60);
  stroke(255);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < points; i++) {
    let angle = map(i, 0, points, 0, TWO_PI) - HALF_PI;
    let r = radius * (1 + history[i] * reach);
    splineVertex(cos(angle) * r, sin(angle) * r);
  }
  endShape(CLOSE);

  // the quiet circle, for comparison
  noFill();
  stroke(255, 60);
  strokeWeight(1);
  circle(0, 0, radius * 2);
  pop();

  // the labels sit in the top 70 pixels
  noStroke();
  fill(255);
  textSize(15);
  text('level: ' + nf(level, 1, 2), 16, 26);
  text(micStatus(), 16, 48);
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
// This unplugs it from the speaker and plugs it into the level meter.
function routeMic() {
  mic.disconnect();
  mic.connect(meter);
}

// how loud it is right now, from 0 to 1. it is 0 when there is no microphone.
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
    return 'listening. clap, hum, or blow on the microphone';
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
