// One Number
// The smallest Share sketch. Every phone in the room sends one number: how many times
// it has been tapped. Every phone shows everyone's number in a grid.
// Tap the screen (or click, on a laptop) to count up.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textFont('system-ui');

  // 1. Which server, which room, which sketch, and what this phone sends.
  //    me is what this phone sends. Here it is one number, starting at 0.
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

  // 3. guests is everyone else in the room. Each guest has the same names as my me,
  //    so guests[0].number is the first other phone's number.
  //    guestsWith('number') leaves out pages that send no number, like the Room Inspector.
  const everyone = [me].concat(guestsWith('number'));

  // one cell for each person, in a grid that fits the screen
  const cols = ceil(sqrt(everyone.length * width / height));
  const rows = ceil(everyone.length / cols);
  const w = width / cols;
  const h = (height - 60) / rows;
  for (let i = 0; i < everyone.length; i++) {
    const person = everyone[i];
    const x = (i % cols) * w;
    const y = floor(i / cols) * h;

    // a box round each cell. yours is brighter
    noFill();
    stroke(person === me ? 200 : 60);
    rect(x + 6, y + 6, w - 12, h - 12);
    noStroke();

    // the number: how many times this person has tapped
    fill(255);
    textSize(min(w, h) * 0.4);
    text(person.number, x + w / 2, y + h * 0.45);

    // under it, who it is: you, or the id the room gave that phone when it joined
    fill(150);
    textSize(min(w, h) * 0.1);
    text(person === me ? 'you' : person.id.slice(0, 4), x + w / 2, y + h * 0.78);
  }

  // one line about the connection
  fill(150);
  textSize(16);
  text(shareStatusText(), width / 2, height - 30);
}

function mousePressed() {
  if (!shareConnected) return;   // the tap that joins the room does not count

  // 4. Change me, and p5-phone sends it. Every other phone sees your number go up.
  me.number = me.number + 1;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
