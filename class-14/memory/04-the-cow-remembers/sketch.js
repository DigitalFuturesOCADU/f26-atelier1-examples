// 04 · The Cow Remembers
// One Cow to Many, step 3 (Everyone's Cow), with a memory. In step 3, every reload made
// you a new animal in a new colour, and your cow started again at step 0.
// Now this phone remembers its cow: the name, the colour, every step it has taken,
// and the day it first walked. The memory is in localStorage, on this phone only.
//
// The room does not remember anything. On startup, this phone reads what it remembers
// and sends it to everyone, in me. So the room knows what the phones that are here
// remember. When you leave, your cow leaves with you. When you come back, it walks on
// from where it stopped, and everyone sees how far it has come.
//
// What is kept and what is sent are the same object, and both travel as JSON text:
//   { "name": "otter", "hue": 212, "steps": 41, "since": 1762094040123 }
// The two lines at the bottom of the screen show both.
//
// Your room: the class shares one room, ROOM. Add ?room=a1-otter to the address for your own.
// Your name: put it in MY_NAME. Leave it empty and the phone picks an animal, once.
// No phone? On a laptop, click or press the space bar. That is a pretend shake.

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'cow-remembers';   // the room
const MY_NAME = '';             // your name
const KEY = 'class14-the-cow-remembers';   // the name the memory is kept under, on this phone

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

let memory;         // what this phone remembers: { name, hue, steps, since }
let gif;            // the cow
let frames = [];    // each frame of the GIF as its own picture
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

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');
  setShakeThreshold(shakeLevel);

  // 1. what does this phone remember? the first visit makes up a cow and keeps it
  memory = loadMemory();
  if (memory === null) {
    memory = newCow();
  }
  if (MY_NAME !== '') {
    memory.name = MY_NAME;
  }
  saveMemory();

  // 2. the room. on startup, this phone sends everyone what it remembers. me is that message
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'the-cow-remembers',
    me: {
      name: memory.name,     // who you are
      hue: memory.hue,       // your colour, 0 to 360
      steps: memory.steps,   // every step your cow has ever taken, on this phone
      since: memory.since    // when your cow took its first step (Date.now())
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

// a cow nobody has seen before
function newCow() {
  return { name: random(ANIMALS), hue: floor(random(360)), steps: 0, since: Date.now() };
}

// read the memory. text in, an object out. null if this phone has none
function loadMemory() {
  try {
    let saved = localStorage.getItem(KEY);
    if (saved === null) {
      return null;
    }
    return JSON.parse(saved);
  } catch (e) {
    return null; // storage is blocked, or the text was not JSON
  }
}

// write the memory as one line of text
function saveMemory() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch (e) { }
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

  const barHeight = 44 * k;   // the forget bar
  const top = 96 * k;
  const bottom = height - barHeight - 170 * k;

  // everyone who sends steps, me first. a grid, so a whole class fits on one phone
  const everyone = [me].concat(guestsWith('steps'));
  if (gif) {
    drawGrid(everyone, top, bottom);
  }

  // what the room knows right now: the steps of the cows that are here
  let total = 0;
  for (const person of everyone) {
    total += person.steps || 0;
  }

  // a border in your colour, so you know which phone is yours
  noFill();
  stroke(me.hue, 70, 100);
  strokeWeight(12 * k);
  rect(0, 0, width, height);
  noStroke();

  // the words at the top: your name, in your colour, and what the room knows
  textAlign(LEFT, CENTER);
  fill(me.hue, 70, 100);
  textSize(28 * k);
  text(me.name + ' · step ' + me.steps, 20 * k, 40 * k);
  fill(0, 0, 70);
  textSize(15 * k);
  text(everyone.length + (everyone.length === 1 ? ' cow' : ' cows') + ' here · ' + total + ' steps between them',
    20 * k, 72 * k);

  // the words at the bottom
  textAlign(LEFT, TOP);
  let y = bottom + 14 * k;
  fill(0, 0, 60);
  textSize(16 * k);
  if (!unlocked) {
    text('tap to start', 20 * k, y);
  } else if (!motionArrived) {
    text('no shake here. click or press space', 20 * k, y);
  } else {
    text('shake the phone', 20 * k, y);
  }
  text(shareStatusText(), 20 * k, y + 24 * k);   // are you in the room?

  // what is kept and what is sent: the same object, as text. boxes, so a long line wraps
  textWrap(CHAR);   // JSON has no spaces, so let it break anywhere
  textSize(13 * k);
  fill(45, 90, 100);
  text('this phone remembers ' + savedText(), 20 * k, y + 54 * k, width - 40 * k, 44 * k);
  fill(0, 0, 80);
  text('and sends ' + JSON.stringify(me), 20 * k, y + 100 * k, width - 40 * k, 44 * k);
  textWrap(WORD);

  // the forget bar
  fill(0, 0, 18);
  rect(0, height - barHeight, width, barHeight);
  fill(0, 0, 80);
  textSize(15 * k);
  textAlign(LEFT, CENTER);
  text('forget · tap here and this phone forgets its cow', 20 * k, height - barHeight / 2);
}

// what is kept under KEY, exactly as it is kept: one line of text
function savedText() {
  try {
    let saved = localStorage.getItem(KEY);
    return saved === null ? 'nothing' : saved;
  } catch (e) {
    return 'nothing. storage is blocked here';
  }
}

// one cell for each person, in as many columns as make the cows largest
function drawGrid(people, top, bottom) {
  const w = width - 40 * k;
  const h = bottom - top;
  const ratio = gif.width / gif.height;
  let cols = 1;
  let best = 0;
  for (let c = 1; c <= people.length; c++) {
    const rows = ceil(people.length / c);
    const size = min(w / c / ratio, h / rows - 34 * k);   // the cow's height in a cell, under its words
    if (size > best) {
      best = size;
      cols = c;
    }
  }
  const cellW = w / cols;
  const cellH = h / ceil(people.length / cols);
  for (let i = 0; i < people.length; i++) {
    const cx = 20 * k + (i % cols) * cellW;
    const cy = top + floor(i / cols) * cellH;
    drawCow(people[i], cx, cy, cellW, cellH);
  }
}

// one person's cow, in a cell. its frame comes from their steps, the words from their memory
function drawCow(person, x, y, w, h) {
  if (!person.name) return;   // a phone whose name has not arrived yet: skip it for now
  const n = person.steps || 0;
  const words = min(15 * k, h * 0.16);   // text size: smaller cells, smaller words
  const s = min(w * 0.9 / gif.width, (h - words * 2.4) * 0.92 / gif.height);   // as large as fits
  const cw = gif.width * s;
  const ch = gif.height * s;

  // the owner's name, and how far this cow has come
  textAlign(LEFT, TOP);
  fill(person.hue, 70, 100);
  fitText([person.name + (person === me ? ' (you)' : ''), person.name], x + 2 * k, y, words, w - 10 * k);
  fill(0, 0, 70);
  fitText([n + ' steps' + sinceWords(person.since), n + ' steps', '' + n], x + 2 * k, y + words * 1.2, words * 0.8, w - 10 * k);

  push();
  translate(x + w / 2, y + words * 2.4 + (h - words * 2.4) / 2);   // the middle of the cell, under the words
  imageMode(CENTER);
  image(frames[n % frames.length], 0, 0, cw, ch);
  noFill();
  stroke(person.hue, 70, 100);   // a frame round the cow in its owner's colour
  strokeWeight(3 * k);
  rect(-cw / 2, -ch / 2, cw, ch);
  pop();
}

// the longest of these words that fits in maxW, so they stay in their cell.
// if none fits, the shortest, made smaller
function fitText(choices, x, y, size, maxW) {
  textSize(size);
  for (const words of choices) {
    if (textWidth(words) <= maxW) {
      text(words, x, y);
      return;
    }
  }
  const words = choices[choices.length - 1];
  textSize(max(7, size * maxW / textWidth(words)));
  text(words, x, y);
}

// ' since Oct 27' from a Date.now() number. today's cows say 'today'
function sinceWords(t) {
  if (!t) return '';
  const day = new Date(t);
  if (day.toDateString() === new Date().toDateString()) {
    return ' since today';
  }
  return ' since ' + day.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// one step: the count goes up, and the picture and the note follow it
function takeStep() {
  if (!unlocked) return;   // the first tap belongs to the start message
  me.steps = me.steps + 1;   // a change to me is sent to everyone
  memory.steps = me.steps;   // and this phone remembers it
  saveMemory();
  lastStep = millis();
  playNote(me.steps);
}

// forget the cow. this phone makes up a new one, and everyone sees the change
function forget() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) { }
  memory = newCow();
  if (MY_NAME !== '') {
    memory.name = MY_NAME;
  }
  saveMemory();
  me.name = memory.name;
  me.hue = memory.hue;
  me.steps = memory.steps;
  me.since = memory.since;
}

// one note from the climbing scale, then quiet again
function playNote(n) {
  osc.freq(notes[n % notes.length]);
  osc.amp(volume, 0.01);   // on
  setTimeout(function () {
    osc.amp(0, 0.1);       // and off again
  }, noteLength);
}

// p5.js calls this when the phone is shaken. one shake calls it many times, so wait out the lockout.
function deviceShaken() {
  if (millis() - lastStep > lockout) takeStep();
}

// a tap on the forget bar forgets. on a laptop, any other click is a pretend shake.
// on a phone with motion, a tap does nothing else. only a shake counts.
function mousePressed() {
  if (unlocked && mouseY > height - 44 * k) {
    forget();
    return false;
  }
  if (!motionArrived) takeStep();
  return false;
}

function keyPressed() {
  if (key === ' ') takeStep();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
