// 1 Who's Here
// Share Basics. Join a room and see who else is in it.
// Each phone sends a name and a colour. Every phone shows everyone.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
// Your name: put it in MY_NAME. Leave it empty and the phone picks an animal.
//
// Key data: me (what this phone sends), guests (what everyone else sends),
// shareJoined() and shareLeft() (someone came or went)

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx',
  'owl', 'bee', 'deer', 'frog', 'mole', 'swan', 'duck', 'goat', 'crab', 'toad',
  'lark', 'robin', 'finch', 'panda', 'koala', 'llama', 'puffin', 'badger', 'beaver', 'tiger'];
let news = '';           // the last person who came or went

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');

  // me is what this phone sends. Here it is set once: a name and a colour.
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'whos-here',
    me: { name: MY_NAME || random(ANIMALS), hue: floor(random(360)) }
  });
  enablePermissionsTap(['share'], 'Tap to join');   // the tap joins the room
  showDesktopQr();   // on a laptop: a QR code, so a phone can join
}

function draw() {
  const k = min(width / 390, height / 700);   // one size unit for this screen
  background(20);
  noStroke();
  colorMode(HSB);

  // everyone in the room: me first, then the guests that have a name
  const everyone = [me].concat(guestsWith('name'));

  textAlign(LEFT, CENTER);
  for (let i = 0; i < everyone.length; i++) {
    const person = everyone[i];
    const y = 120 * k + i * 56 * k;
    fill(person.hue, 70, 100);
    circle(50 * k, y, 36 * k);
    fill(0, 0, 100);
    textSize(24 * k);
    text(person.name + (person === me ? '  (you)' : ''), 84 * k, y);
  }

  drawWhoIAm(k);

  textAlign(CENTER, CENTER);
  fill(0, 0, 100);
  textSize(28 * k);
  text(everyone.length + ' here', width / 2, 66 * k);   // under the name at the top
  fill(0, 0, 60);
  textSize(16 * k);
  text(news, width / 2, height - 92 * k);
  text(shareStatusText(), width / 2, height - 66 * k);
  text('you send ' + JSON.stringify(me), 10 * k, height - 50 * k, width - 20 * k, 44 * k);   // a box, so a long line wraps
}

// someone joined after you. data is what they send
function shareJoined(id, data) {
  if (data.name) news = data.name + ' joined';   // a page with no name, like the Room Inspector, is skipped
}

// someone left. data is the last thing they sent
function shareLeft(id, data) {
  if (data.name) news = data.name + ' left';
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
