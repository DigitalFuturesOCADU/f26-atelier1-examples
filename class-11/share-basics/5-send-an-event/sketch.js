// 5 Send an Event
// Share Basics. An event is a knock, not a value. It is sent once and not kept.
// Tap the screen to knock. Every other phone gets a ripple in your colour, at the place you
// tapped, and the name of who knocked.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
//
// Key data: shareEmit(name, data) sends an event.
// shareEvent(name, data, from) runs on every other phone. from says who sent it,
// and shareGuest(from) is what that phone sends: its name and colour.

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx'];
let ripples = [];        // the knocks on screen now
let news = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'send-an-event',
    me: { name: MY_NAME || random(ANIMALS), hue: floor(random(360)) }
  });
  enablePermissionsTap(['share'], 'Tap to join');
  showDesktopQr();
}

function mousePressed() {
  if (!shareConnected) return;
  // where you tapped, from 0 to 1, so it lands in the same place on any screen size
  const data = { x: round(mouseX / width, 2), y: round(mouseY / height, 2) };
  shareEmit('knock', data);
  // the sender never gets its own event back, so show it here too
  addRipple(data, me);
  news = 'you knocked';
}

// runs on every other phone when an event arrives
function shareEvent(name, data, from) {
  if (name !== 'knock') return;
  const sender = shareGuest(from);   // what the sender sends: its name and colour
  if (!sender) return;               // a phone that has already left
  addRipple(data, sender);
  news = sender.name + ' knocked';
}

function addRipple(data, person) {
  ripples.push({ x: data.x, y: data.y, hue: person.hue, born: millis() });
}

function draw() {
  const k = min(width / 390, height / 700);
  background(20);
  colorMode(HSB);

  // each ripple grows and fades over one second
  noFill();
  for (const r of ripples) {
    const age = (millis() - r.born) / 1000;
    stroke(r.hue, 70, 100, 1 - age);
    strokeWeight(6 * k);
    circle(r.x * width, r.y * height, age * 400 * k);
  }
  ripples = ripples.filter(function (r) { return millis() - r.born < 1000; });

  noStroke();
  textAlign(CENTER, CENTER);
  fill(0, 0, 100);
  textSize(26 * k);
  text(news || 'tap to knock', width / 2, 60 * k);
  fill(0, 0, 60);
  textSize(16 * k);
  text(shareStatusText(), width / 2, height - 66 * k);
  text('you send ' + JSON.stringify(me), 10 * k, height - 50 * k, width - 20 * k, 44 * k);   // a box, so a long line wraps
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
