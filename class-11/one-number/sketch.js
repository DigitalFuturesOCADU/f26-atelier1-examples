// One Number
// The smallest Share sketch. Every phone in the room sends one number,
// and every phone shows everyone's number.
// Tap the screen (or click, on a laptop) to pick a new number.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textFont('system-ui');

  // 1. Which server, which room, which sketch, and what this phone sends.
  //    me is what this phone sends. Here it is one number.
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'one-number',
    me: { number: 0 }
  });

  // 2. A tap joins the room. A phone only joins after a tap.
  enablePermissionsTap(['share'], 'Tap to join');
  showDesktopQr();   // on a laptop: a QR code, so a phone can join
}

function draw() {
  background(20);
  fill(255);

  // my number, big
  textSize(96);
  text(me.number, width / 2, height * 0.3);
  textSize(16);
  text('you', width / 2, height * 0.3 + 64);

  // 3. guests is everyone else in the room. Each guest has the same names as my me,
  //    so guests[0].number is the first other phone's number.
  //    guestsWith('number') leaves out pages that send no number, like the Room Inspector.
  const others = guestsWith('number');
  textSize(16);
  text('the others', width / 2, height * 0.5 - 40);
  textSize(40);
  for (let i = 0; i < others.length; i++) {
    text(others[i].number, width / 2, height * 0.5 + i * 50);
  }

  // one line about the connection
  fill(150);
  textSize(16);
  text(shareStatusText(), width / 2, height - 40);
}

function mousePressed() {
  // 4. Change me, and p5-phone sends it. Every other phone sees the new number.
  me.number = floor(random(100));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
