// 2 Say Who You Are
// One Cow to Many. Now this phone sends something: a name and a colour, in me.
// The screen shows them too, a border in your colour and your name at the top,
// so when there are many phones you know which one is yours.
//
// Your room: change ROOM to the room you were given, like 'a1-otter'.
// Your name: put it in MY_NAME. Leave it empty and the phone picks an animal.
// No phone? On a laptop, click or press the space bar. That is a pretend shake.

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'cow';      // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx',
  'owl', 'bee', 'deer', 'frog', 'mole', 'swan', 'duck', 'goat', 'crab', 'toad',
  'lark', 'robin', 'finch', 'panda', 'koala', 'llama', 'puffin', 'badger', 'beaver', 'tiger'];

// phones only start motion and sound inside a tap. p5-phone's tap message turns them on,
// then calls userSetupComplete() once everything is on.
let unlocked = false; // has the tap turned the sound on?
function userSetupComplete() {
  unlocked = true;
}

// the feel of the piece. change these before you change anything else.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/cow.gif';
let notes = [262, 294, 330, 392, 440, 523, 587, 659]; // hertz. one note for each step, then round again
let noteLength = 120;  // milliseconds each note sounds
let volume = 0.4;      // from 0 to 1
let shakeLevel = 30;   // how hard a shake has to be. lower is easier
let lockout = 400;     // milliseconds. one shake calls deviceShaken() many times in a row

let gif;            // the cow
let frames = [];    // each frame of the GIF as its own picture
let osc;            // the oscillator
let started = false;
let steps = 0;      // how many steps so far. the frame and the note both come from this
let lastStep = 0;   // when the last step was, in milliseconds
let k = 1;          // one size unit for this screen. draw() sets it

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
  textFont('system-ui');
  setShakeThreshold(shakeLevel);

  // the room. me is what this phone sends to everyone else
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'one-cow-to-many',
    me: {
      name: MY_NAME || random(ANIMALS),   // who you are
      hue: floor(random(360))             // your colour, 0 to 360
    }
  });
  enablePermissionsTap(['motion', 'sound', 'share'], 'Tap to start');   // the tap joins the room too
  showDesktopQr();   // on a laptop: a QR code, so a phone can open this page

  // the oscillator runs all the time, silent. each step turns it up for one note.
  osc = new p5.Oscillator(notes[0], 'triangle');
  osc.amp(0);

  gif = await loadImage(gifFile);
  // copy each frame into its own picture. the steps choose the frame, not the GIF's own clock,
  // and two cows can show two different frames at the same moment
  for (let i = 0; i < gif.numFrames(); i++) {
    gif.setFrame(i);
    frames.push(gif.get());
  }
}

function draw() {
  k = min(width / 390, height / 700);
  background(0);
  colorMode(HSB);   // colours as hue, saturation, brightness. white is (0, 0, 100)
  noStroke();

  // start the oscillator once the sound is on
  if (unlocked && !started) {
    osc.start();
    started = true;
  }

  // the cow walks between the words at the top and the words at the bottom
  const top = 80 * k;
  const bottom = height - 120 * k;
  drawCow(steps, top, bottom - top);

  // a border in your colour, so you know which phone is yours
  noFill();
  stroke(me.hue, 70, 100);
  strokeWeight(12 * k);
  rect(0, 0, width, height);
  noStroke();

  // the words at the top: your name, in your colour
  textAlign(LEFT, CENTER);
  fill(me.hue, 70, 100);
  textSize(28 * k);
  text(me.name + ' · step ' + steps, 20 * k, 44 * k);

  // the words at the bottom
  fill(0, 0, 60);
  textSize(16 * k);
  if (!unlocked) {
    text('tap to start', 20 * k, height - 96 * k);
  } else if (!motionArrived) {
    text('no shake here. click or press space', 20 * k, height - 96 * k);
  } else {
    text('shake the phone', 20 * k, height - 96 * k);
  }
  text(shareStatusText(), 20 * k, height - 70 * k);   // are you in the room?
  textWrap(CHAR);   // what you send has no spaces, so let it break anywhere
  text('you send ' + JSON.stringify(me), 20 * k, height - 52 * k, width - 40 * k, 48 * k);   // a box, so a long line wraps
}

// one step: the count goes up, and the picture and the note follow it
function takeStep() {
  if (!unlocked) return;   // the first tap belongs to the start message
  steps = steps + 1;
  lastStep = millis();
  playNote(steps);
}

// one note from the climbing scale, then quiet again
function playNote(n) {
  osc.freq(notes[n % notes.length]);
  osc.amp(volume, 0.01);   // on
  setTimeout(function () {
    osc.amp(0, 0.1);       // and off again
  }, noteLength);
}

// one cow, in a band from y to y + h. its frame comes from n, its step count
function drawCow(n, y, h) {
  const s = min(width * 0.6 / gif.width, h * 0.9 / gif.height);   // as large as fits
  const w = gif.width * s;
  push();
  translate(width / 2, y + h / 2);   // the middle of its band. the cow walks on the spot
  imageMode(CENTER);
  image(frames[n % frames.length], 0, 0, w, gif.height * s);
  pop();
}

// p5.js calls this when the phone is shaken. one shake calls it many times, so wait out the lockout.
function deviceShaken() {
  if (millis() - lastStep > lockout) takeStep();
}

// fake data for a laptop: a click or the space bar is a pretend shake.
// on a phone with motion, a tap does nothing. only a shake counts.
function mousePressed() {
  if (!motionArrived) takeStep();
  return false;
}

function keyPressed() {
  if (key === ' ') takeStep();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
