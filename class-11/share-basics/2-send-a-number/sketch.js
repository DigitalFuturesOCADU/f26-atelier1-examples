// 2 Send a Number
// Share Basics. Each phone sends one number: how far it tilts left or right, from -1 to 1.
// Every phone shows a line for each person, with a dot where their tilt is.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
// On a laptop, move the mouse left and right instead of tilting.
//
// Key data: me.value (yours), guests[i].value (theirs)

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx'];
let gotTilt = false;     // true once the phone sends a real tilt reading

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
    app: 'send-a-number',
    me: { name: MY_NAME || random(ANIMALS), hue: floor(random(360)), value: 0 }
  });
  enablePermissionsTap(['gyro', 'share'], 'Tap to join');   // one tap: tilt, then the room
  showDesktopQr();
}

// THE NUMBER. Change what it reads here. It must be a number from -1 to 1.
function readMyNumber() {
  if (gotTilt) return constrain(rotationY / 30, -1, 1);   // 30 degrees is all the way
  return constrain(map(mouseX, 0, width, -1, 1), -1, 1);  // a laptop mouse
}

function draw() {
  const k = min(width / 390, height / 700);
  background(20);
  colorMode(HSB);

  // send it. Rounding to steps of 0.05 means a still phone sends nothing new
  me.value = round(readMyNumber() * 20) / 20;

  // everyone who sends a value: me first
  const everyone = [me].concat(guestsWith('value'));
  const half = width * 0.38;
  for (let i = 0; i < everyone.length; i++) {
    const person = everyone[i];
    const y = 110 * k + i * 70 * k;
    stroke(0, 0, 30);
    strokeWeight(4 * k);
    line(width / 2 - half, y, width / 2 + half, y);
    noStroke();
    fill(person.hue, 70, 100);
    circle(width / 2 + person.value * half, y, 36 * k);
    fill(0, 0, 70);
    textAlign(LEFT, BOTTOM);
    textSize(16 * k);
    text(person.name + (person === me ? ' (you)' : '') + '   ' + person.value, width / 2 - half, y - 20 * k);
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
