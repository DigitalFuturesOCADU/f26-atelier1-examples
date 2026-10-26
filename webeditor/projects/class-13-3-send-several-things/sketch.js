// 3 Send Several Things
// Share Basics. me can hold several things at once. Each phone sends a name, a colour,
// and two numbers, x and y, from its tilt. Every phone shows everyone as a dot on one field.
// When two dots touch, every phone plays a bump and shows a burst in both colours.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
// Hold the phone flat, then tilt it like a tray. On a laptop, move the mouse.
//
// Key data: me.name, me.hue, me.x, me.y (yours), the same names in guests[i] (theirs)

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx',
  'owl', 'bee', 'deer', 'frog', 'mole', 'swan', 'duck', 'goat', 'crab', 'toad',
  'lark', 'robin', 'finch', 'panda', 'koala', 'llama', 'puffin', 'badger', 'beaver', 'tiger'];
let gotTilt = false;
let osc;                 // the bump: an oscillator that runs silent until two dots touch
let touching = {};       // the pairs of dots that touch now, so each touch bumps once
let bursts = [];         // the bursts on screen now

window.addEventListener('deviceorientation', function (e) {
  if (e.beta !== null) gotTilt = true;
});

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textFont('system-ui');
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'send-several-things',
    // a word, a number set once, and two numbers that change. Add more names here
    me: { name: MY_NAME || random(ANIMALS), hue: floor(random(360)), x: 0, y: 0 }
  });
  enablePermissionsTap(['gyro', 'sound', 'share'], 'Tap to join');   // tilt and sound before the room
  showDesktopQr();
  osc = new p5.Oscillator(330, 'triangle');
  osc.amp(0);
}

// the tap has turned the sound on, so the oscillator can start (silent)
function userSetupComplete() {
  osc.start();
}

function draw() {
  const k = min(width / 390, height / 700);
  background(20);
  colorMode(HSB);

  // two numbers from -1 to 1, in steps of 0.05
  if (gotTilt) {
    me.x = round(constrain(rotationY / 30, -1, 1) * 20) / 20;   // left and right
    me.y = round(constrain(rotationX / 30, -1, 1) * 20) / 20;   // towards you and away
  } else {
    me.x = round(constrain(map(mouseX, 0, width, -1, 1), -1, 1) * 20) / 20;
    me.y = round(constrain(map(mouseY, 0, height, -1, 1), -1, 1) * 20) / 20;
  }

  // the field. A dot is a part of the field, so dots touch at the same moment on every screen
  const r = min(width, height) * 0.4;
  const d = r * 0.22;
  noFill();
  stroke(0, 0, 30);
  strokeWeight(2 * k);
  square(width / 2 - r, height / 2 - r, r * 2);

  // everyone with a name: me last, so I am drawn on top.
  // guestsWith('name') skips a phone whose name has not arrived yet
  const everyone = guestsWith('name').concat([me]);
  textAlign(CENTER, BOTTOM);
  textSize(16 * k);
  for (const person of everyone) {
    const px = width / 2 + person.x * r;
    const py = height / 2 + person.y * r;
    noStroke();
    fill(person.hue, 70, 100);
    circle(px, py, d);
    fill(0, 0, 100);
    text(person.name, px, py - d / 2 - 4 * k);
  }

  // a ring round my own dot
  noFill();
  stroke(me.hue, 70, 100);
  strokeWeight(3 * k);
  circle(width / 2 + me.x * r, height / 2 + me.y * r, d + 16 * k);

  checkTouches(everyone, d / r);
  drawBursts(r, k);
  drawWhoIAm(k);

  textAlign(CENTER, CENTER);
  fill(0, 0, 60);
  textSize(16 * k);
  text(shareStatusText(), width / 2, height - 66 * k);
  text('you send ' + JSON.stringify(me), 10 * k, height - 50 * k, width - 20 * k, 44 * k);   // a box, so a long line wraps
}

// Two dots touch when they are closer than one dot across (the two radii added up).
// Every phone works this out from the x and y it already has, so nothing new is sent.
function checkTouches(everyone, size) {
  for (let i = 0; i < everyone.length; i++) {
    for (let j = i + 1; j < everyone.length; j++) {
      const a = everyone[i];
      const b = everyone[j];
      const pair = [a.id || 'me', b.id || 'me'].sort().join('+');
      const apart = dist(a.x, a.y, b.x, b.y);
      if (apart < size && !touching[pair]) {
        touching[pair] = true;
        bursts.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, hues: [a.hue, b.hue], born: millis() });
        bump();
      } else if (apart > size * 1.2) {
        delete touching[pair];   // apart again. The small gap stops a shaky hand bumping twice
      }
    }
  }
}

// a short bump: turn the oscillator up, then straight back down
function bump() {
  osc.amp(0.4, 0.01);
  setTimeout(function () {
    osc.amp(0, 0.15);
  }, 80);
}

// each burst is two rings, one in each colour, that grow and fade over half a second
function drawBursts(r, k) {
  noFill();
  strokeWeight(5 * k);
  for (const b of bursts) {
    const age = (millis() - b.born) / 500;
    stroke(b.hues[0], 70, 100, 1 - age);
    circle(width / 2 + b.x * r, height / 2 + b.y * r, age * r * 0.6);
    stroke(b.hues[1], 70, 100, 1 - age);
    circle(width / 2 + b.x * r, height / 2 + b.y * r, age * r * 0.9);
  }
  bursts = bursts.filter(function (b) { return millis() - b.born < 500; });
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
