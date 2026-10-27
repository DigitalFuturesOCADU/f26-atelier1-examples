// 5 Lean Together
// One Cow to Many. Tilt the phone left or right and your cow leans, on every phone.
// The lean is a stream: a number that changes all the time, sent as it changes.
// Now the sketch has all three kinds of sharing:
// the steps are state (kept), the sound is an event (once), the lean is a stream (always).
//
// Your room: change ROOM to the room you were given, like 'a1-otter'.
// Your name: put it in MY_NAME. Leave it empty and the phone picks an animal.
// No phone? On a laptop, click or press the space bar. That is a pretend shake.
// The mouse, left and right, is a pretend tilt.

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
let osc;            // the oscillator
let started = false;
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

// the same for tilt: a laptop has none. this turns true when the first real reading arrives.
let gotTilt = false;
window.addEventListener('deviceorientation', function (event) {
  if (event.gamma !== null) gotTilt = true;
});

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');
  angleMode(DEGREES);
  setShakeThreshold(shakeLevel);

  // the room. me is what this phone sends to everyone else
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'one-cow-to-many',
    me: {
      name: MY_NAME || random(ANIMALS),   // who you are
      hue: floor(random(360)),            // your colour, 0 to 360
      steps: 0,                           // how many steps your cow has taken
      pitch: random([0.75, 1, 1.25, 1.5, 2]),  // your cow's voice. 2 is an octave up
      lean: 0                             // how far you tilt, from -1 (left) to 1 (right)
    }
  });
  enablePermissionsTap(['motion', 'sound', 'share'], 'Tap to start');   // the tap joins the room too
  showDesktopQr();   // on a laptop: a QR code, so a phone can open this page

  // the oscillator runs all the time, silent. each step turns it up for one note.
  osc = new p5.Oscillator(notes[0], 'triangle');
  osc.amp(0);

  gif = await loadImage(gifFile);
  gif.pause();   // the steps choose the frame, not the GIF's own clock
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

  // the lean: tilt left and right. from -1 to 1, in steps of 0.05, so a phone held still
  // sends nothing new. a laptop has no tilt, so after the start tap the mouse is fake tilt
  if (gotTilt) {
    me.lean = round(constrain(rotationY / 30, -1, 1) * 20) / 20;
  } else if (unlocked) {
    me.lean = round(constrain(map(mouseX, 0, width, -1, 1), -1, 1) * 20) / 20;
  }

  // the cows walk between the words at the top and the words at the bottom
  const top = 80 * k;
  const bottom = height - 120 * k;

  // everyone who sends steps, me first. each cow gets a lane of its own
  const everyone = [me].concat(guestsWith('steps'));
  const lane = (bottom - top) / everyone.length;
  for (let i = 0; i < everyone.length; i++) {
    drawCow(everyone[i], top + i * lane, lane);
  }

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
  text(me.name + ' · step ' + me.steps, 20 * k, 44 * k);

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
  me.steps = me.steps + 1;   // a change to me is sent to everyone
  lastStep = millis();
  playNote(me.steps, me.pitch);
  if (shareConnected) shareEmit('step');   // and the other phones play it too. yours never comes back
}

// runs on every other phone when someone steps. from says who sent it, and shareGuest(from)
// is what they send: their steps and their pitch. so everyone hears the same note.
function shareEvent(name, data, from) {
  if (name !== 'step') return;
  const sender = shareGuest(from);
  if (!sender) return;   // a phone that has already left
  playNote(sender.steps, sender.pitch);
}

// one note from the climbing scale, at one person's pitch, then quiet again.
// there is one oscillator, so if two cows step at once the second note takes over the first
function playNote(n, pitch) {
  osc.freq(notes[n % notes.length] * pitch);
  osc.amp(volume, 0.01);   // on
  setTimeout(function () {
    osc.amp(0, 0.1);       // and off again
  }, noteLength);
}

// one person's cow, in a band from y to y + h. its frame comes from their steps
function drawCow(person, y, h) {
  const n = person.steps;
  if (!person.name) return;   // a phone whose name has not arrived yet: skip it for now
  const s = min(width * 0.6 / gif.width, h * 0.9 / gif.height);   // as large as fits
  const w = gif.width * s;
  gif.setFrame(n % gif.numFrames());
  push();
  translate(width / 2, y + h / 2);   // the middle of its band. the cow walks on the spot
  rotate((person.lean || 0) * 30);   // and lean it, up to 30 degrees. a cow from an older step has no lean
  imageMode(CENTER);
  tint(person.hue, 40, 100);   // the cow in its owner's colour
  image(gif, 0, 0, w, gif.height * s);
  pop();                       // pop() also ends the tint

  // the owner's name, at the top of the lane
  textAlign(LEFT, TOP);
  fill(person.hue, 70, 100);
  textSize(18 * k);
  text(person.name + (person === me ? ' (you)' : ''), 20 * k, y + 4 * k);
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
