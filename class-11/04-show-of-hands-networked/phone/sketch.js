// 04 Show of Hands, Networked: Phone
// Share. The same vote as Class 10's Show of Hands. Tilt your phone left for A or right for B.
// Your vote stays when you tilt back. Tilt the other way to change it.
//
// The rule: Share keeps only the last thing written, so this phone keeps its own vote in me
// and the projector adds them up.
//
// In Class 10 the projector's camera watched your screen and knew where you were. Here the
// vote travels over the network, so the projector knows what you sent and nothing else.
//
// Try this:
//   Tilt left, then right. The vote changes only when you tilt past the marks.
//   On a laptop, move the mouse to the left or right of the page, or use the arrow keys.
//
// Key data:
//   me.vote          'A', 'B' or '' for no vote yet
//   shareEvent('reset')   the projector clears every vote

const ROOM = 'show-of-hands';

// the feel of the piece. change these before you change anything else.
let threshold = 0.6;     // how far to tilt to vote. 1 is 30 degrees. 0.6 is 18 degrees

let joined = false;
let serverOk = false;
let vote = '';           // 'A', 'B' or '' for no vote yet
let armed = true;        // after a reset, the phone must come back to level before it votes again
let k = 1;               // one design unit for this screen
let colors = { A: '#ffc800', B: '#3ddcff' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);

  serverOk = phoneSetup(ROOM, { vote: '' });
  if (serverOk) {
    // one tap asks for tilt. userSetupComplete() runs after it
    enablePermissionsTap(['gyro'], 'Tap to join the vote');
  }
}

function userSetupComplete() {
  joined = true;
  keepAwake();        // a phone that locks leaves the room, and its vote goes with it
  shareConnect();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function shareReady() {
  checkMyName();
}

// the projector clears every vote
function shareEvent(name) {
  if (name === 'reset') {
    vote = '';
    me.vote = '';
    armed = false;
  }
}

function draw() {
  k = min(width / 390, height / 700);
  background(20);

  // 1. read the tilt. 2. past the marks, left is A and right is B. 3. the vote latches.
  const t = tiltNow();
  if (joined && shareConnected) {
    if (abs(t.x) < 0.3) {
      armed = true;
    }
    if (armed && t.x < -threshold) {
      vote = 'A';
    } else if (armed && t.x > threshold) {
      vote = 'B';
    }
    me.vote = vote;
  }

  drawHalves();
  drawTilt(t);
  drawWords();
}

// the screen is two halves. the one you chose is lit
function drawHalves() {
  const top = height * 0.2;
  const h = height * 0.5;
  const gap = 12 * k;
  const w = (width - gap * 3) / 2;
  const sides = ['A', 'B'];
  for (let s = 0; s < 2; s++) {
    const side = sides[s];
    const x = gap + s * (w + gap);
    noStroke();
    if (vote === side) {
      fill(colors[side]);
    } else {
      fill(36);
    }
    rect(x, top, w, h);
    fill(vote === side ? 20 : colors[side]);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(min(w * 0.8, h * 0.6));
    text(side, x + w / 2, top + h / 2);
    textStyle(NORMAL);
  }
}

// a dot that slides along a line, so you can see how far to tilt
function drawTilt(t) {
  const y = height * 0.76;
  const half = width * 0.4;
  stroke(70);
  strokeWeight(4 * k);
  line(width / 2 - half, y, width / 2 + half, y);
  stroke(120);
  line(width / 2 - half * threshold, y - 10 * k, width / 2 - half * threshold, y + 10 * k);
  line(width / 2 + half * threshold, y - 10 * k, width / 2 + half * threshold, y + 10 * k);
  noStroke();
  fill(color('hsl(' + myHue + ', 85%, 65%)'));
  circle(width / 2 + t.x * half, y, 30 * k);
}

function drawWords() {
  noStroke();
  fill(255);
  textStyle(BOLD);
  textSize(34 * k);
  if (!serverOk) {
    textSize(26 * k);
    centreLines(serverProblem, height * 0.2, width * 0.85, 34 * k);
    textStyle(NORMAL);
    return;
  }
  let head = '04 Show of Hands';
  if (joined && shareConnected) {
    head = vote === '' ? 'Tilt to vote' : 'You voted ' + vote;
  }
  centreLines(head, height * 0.11, width * 0.9, 40 * k);
  textStyle(NORMAL);

  fill('#9a9a9a');
  textSize(21 * k);
  let how = 'Tilt left for A. Tilt right for B.\nYour vote stays until you tilt the other way.';
  if (!hasRealTilt) {
    how = 'No tilt sensor here.\nMove the mouse to the left or right, or use the arrow keys.';
  }
  centreLines(how, height * 0.82, width * 0.86, 28 * k);
  textSize(17 * k);
  centreLines(footerLine(), height - 40 * k, width * 0.9, 24 * k);
}
