// 01 Crowd Tilt: Phone
// Share. Your phone is one tilt sensor in a crowd. Hold it like a tray. The big screen
// adds up every phone in the room and rolls one ball on the average. Get the ball into the
// ring together.
//
// The rule: Share keeps only the last thing written, so this phone keeps its own tilt in me
// and the projector adds them up.
//
// Try this:
//   Tilt your phone and find the line with your colour on the big screen.
//   Tap the screen to say the way you hold the phone now is level.
//   On a laptop, move the mouse or hold the arrow keys.
//
// Key data:
//   me.x and me.y     this phone's tilt, from -1 to 1, about ten times a second
//   guests            the other phones. the ones with role 'phone' are counted
//   shared.average    the whole class's tilt, written by the projector
//   shareEvent('hit') the projector tells every phone when the class has got it

const ROOM = 'crowd-tilt';

// the feel of the piece
let sendEvery = 100;   // milliseconds between updates. 100 is ten a second

let joined = false;    // has this phone tapped to join?
let serverOk = false;
let lastSend = 0;
let flash = 0;         // 1 when the class has just got it, then fades
let k = 1;             // one design unit for this screen

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);

  serverOk = phoneSetup(ROOM, { x: 0, y: 0 });
  if (serverOk) {
    // one tap asks for tilt and for vibration. userSetupComplete() runs after it
    enablePermissionsTap(['gyro', 'vibration'], 'Tap to join the class');
  }
}

function userSetupComplete() {
  joined = true;
  keepAwake();        // a phone that locks leaves the room
  shareConnect();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function shareReady() {
  checkMyName();
}

// the projector says the class got it
function shareEvent(name) {
  if (name === 'hit') {
    flash = 1;
    vibrate([200, 100, 200]);   // Android only
  }
}

// tap to say how you are holding the phone now is level
function mousePressed() {
  if (joined) {
    recentre();
  }
  return false;
}

function draw() {
  k = min(width / 390, height / 700);
  background(20 + flash * 30);
  flash = max(0, flash - deltaTime / 1200);

  // 1. read the tilt. 2. send it, ten times a second. 3. show it.
  const t = tiltNow();
  if (joined && shareConnected && millis() - lastSend >= sendEvery) {
    // steps of 0.05, so a phone held still sends nothing
    me.x = round(t.x * 20) / 20;
    me.y = round(t.y * 20) / 20;
    lastSend = millis();
  }

  drawHeader();
  drawPad(t);
  drawFooter();
}

function drawHeader() {
  noStroke();
  fill(255);
  textStyle(BOLD);
  textSize(36 * k);
  if (!serverOk) {
    textSize(26 * k);
    centreLines(serverProblem, height * 0.2, width * 0.85, 34 * k);
    textStyle(NORMAL);
    return;
  }
  if (flash > 0.2) {
    fill(255, 200, 0);
    centreLines('Got it!', height * 0.11, width * 0.9, 44 * k);
  } else if (joined && shareConnected) {
    const n = 1 + otherPhones().length;
    if (n === 1) {
      centreLines('You are the only one here', height * 0.11, width * 0.9, 44 * k);
    } else {
      centreLines('You are one of ' + n, height * 0.11, width * 0.9, 44 * k);
    }
  } else {
    centreLines('01 Crowd Tilt', height * 0.11, width * 0.9, 44 * k);
  }
  textStyle(NORMAL);
}

// the pad is a top-down view of a tray. your dot is where your tilt would roll a ball
function drawPad(t) {
  const cx = width / 2;
  const cy = height * 0.38;
  const r = min(width * 0.38, height * 0.24);

  noFill();
  stroke(70);
  strokeWeight(3 * k);
  circle(cx, cy, r * 2);
  stroke(40);
  strokeWeight(2 * k);
  line(cx - r, cy, cx + r, cy);
  line(cx, cy - r, cx, cy + r);

  // the whole class, as the projector sees it: an open ring
  const avg = shared.average;
  if (joined && avg && avg.n > 1) {
    noFill();
    stroke(255, 200, 0);
    strokeWeight(5 * k);
    circle(cx + avg.x * r, cy + avg.y * r, 30 * k);
  }

  // you: a dot in your own colour
  noStroke();
  fill(color('hsl(' + myHue + ', 85%, 65%)'));
  circle(cx + t.x * r, cy + t.y * r, 44 * k);

  fill(GREY_TEXT);
  textSize(21 * k);
  let words = 'Hold your phone like a tray.\nYour dot is your colour.\nThe open ring is the whole class.';
  if (!hasRealTilt) {
    words = 'No tilt sensor here.\nMove the mouse or use the arrow keys.';
  }
  centreLines(words, height * 0.68, width * 0.86, 28 * k);
}


function drawFooter() {
  noStroke();
  fill(GREY_TEXT);
  textSize(18 * k);
  centreLines(footerLine(), height - 40 * k, width * 0.9, 24 * k);
  if (joined && hasRealTilt) {
    centreLines('Tap the screen to set level', height - 72 * k, width * 0.9, 24 * k);
  }
}
