// 3 Send Several Things
// Share Basics. me can hold several things at once. Each phone sends a name, a colour,
// and two numbers, x and y, from its tilt. Every phone shows everyone as a dot on one field.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
// Hold the phone flat, then tilt it like a tray. On a laptop, move the mouse.
//
// Key data: me.name, me.hue, me.x, me.y (yours), the same names in guests[i] (theirs)

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx'];
let gotTilt = false;

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
  enablePermissionsTap(['gyro', 'share'], 'Tap to join');
  showDesktopQr();
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

  // the field
  const r = min(width, height) * 0.4;
  noFill();
  stroke(0, 0, 30);
  strokeWeight(2 * k);
  square(width / 2 - r, height / 2 - r, r * 2);

  // everyone who sends x and y: me last, so I am drawn on top
  const everyone = guestsWith('x').concat([me]);
  textAlign(CENTER, BOTTOM);
  textSize(16 * k);
  for (const person of everyone) {
    const px = width / 2 + person.x * r;
    const py = height / 2 + person.y * r;
    noStroke();
    fill(person.hue, 70, 100);
    circle(px, py, 34 * k);
    fill(0, 0, 100);
    text(person.name, px, py - 20 * k);
  }

  textAlign(CENTER, CENTER);
  fill(0, 0, 60);
  textSize(16 * k);
  text(shareStatusText(), width / 2, height - 66 * k);
  text('you send ' + JSON.stringify(me), 10 * k, height - 50 * k, width - 20 * k, 44 * k);   // a box, so a long line wraps
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
