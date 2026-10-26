// 2 Send a Number
// Share Basics. Each phone sends one number: how loud it is around that phone, from 0 to 1.
// Every phone shows a line for each person, with a dot where their sound level is.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
// Hum, clap or talk near the phone. A laptop uses its own microphone.
//
// Key data: me.value (yours), guests[i].value (theirs)

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx',
  'owl', 'bee', 'deer', 'frog', 'mole', 'swan', 'duck', 'goat', 'crab', 'toad',
  'lark', 'robin', 'finch', 'panda', 'koala', 'llama', 'puffin', 'badger', 'beaver', 'tiger'];

let boost = 5;   // phones hear quietly. raise it if the dot barely moves
let mic;         // the microphone. p5-phone looks for a variable with exactly this name
let meter;       // measures how loud the microphone is
let level = 0;   // the level, smoothed so the dot does not jitter

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'send-a-number',
    me: { name: MY_NAME || random(ANIMALS), hue: floor(random(360)), value: 0 }
  });
  mic = new p5.AudioIn();
  meter = new p5.Amplitude();
  routeMic();
  enablePermissionsTap(['mic', 'share'], 'Tap to join');   // one tap: the microphone, then the room
  showDesktopQr();
}

// THE NUMBER. Change what it reads here. It must be a number from 0 to 1.
function readMyNumber() {
  return getMicLevel();
}

function draw() {
  const k = min(width / 390, height / 700);
  background(20);
  colorMode(HSB);

  // send it. Smooth it, then round to steps of 0.05, so a quiet room sends almost nothing new
  level = lerp(level, readMyNumber(), 0.3);
  me.value = round(level * 20) / 20;

  // everyone with a name: me first.
  // guestsWith('name') skips a phone whose name has not arrived yet
  const everyone = [me].concat(guestsWith('name'));
  const half = width * 0.38;
  for (let i = 0; i < everyone.length; i++) {
    const person = everyone[i];
    const y = 110 * k + i * 70 * k;
    stroke(0, 0, 30);
    strokeWeight(4 * k);
    line(width / 2 - half, y, width / 2 + half, y);
    noStroke();
    fill(person.hue, 70, 100);
    circle(width / 2 - half + person.value * half * 2, y, 36 * k);   // quiet at the left, loud at the right
    fill(0, 0, 70);
    textAlign(LEFT, BOTTOM);
    textSize(16 * k);
    text(person.name + (person === me ? ' (you)' : '') + '   ' + person.value, width / 2 - half, y - 20 * k);
  }

  drawWhoIAm(k);

  textAlign(CENTER, CENTER);
  fill(0, 0, 60);
  textSize(16 * k);
  if (!window.micOpen) text('no microphone yet. Tap to join, and allow the microphone', width / 2, height - 92 * k);
  text(shareStatusText(), width / 2, height - 66 * k);
  text('you send ' + JSON.stringify(me), 10 * k, height - 50 * k, width - 20 * k, 44 * k);   // a box, so a long line wraps
}

// who I am: a border round the screen in my colour, and my name at the top
function drawWhoIAm(k) {
  noFill();
  stroke(me.hue, 70, 100);
  strokeWeight(12 * k);
  rect(0, 0, width, height);
  noStroke();
  fill(me.hue, 70, 100);
  textAlign(CENTER, CENTER);
  textSize(20 * k);
  text('you are ' + me.name, width / 2, 26 * k);
}

// ---------- the microphone, as in Class 4's 01 Level to Frame ----------

// p5.sound sends the microphone straight to the speaker unless you stop it.
// This unplugs it from the speaker and plugs it into the level meter.
function routeMic() {
  mic.disconnect();
  mic.connect(meter);
}

// how loud it is right now, from 0 to 1. it is 0 when there is no microphone.
// window.micOpen is true only while sound is really arriving
function getMicLevel() {
  if (!window.micOpen) return 0;
  routeMic();
  return constrain(meter.getLevel() * boost, 0, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
