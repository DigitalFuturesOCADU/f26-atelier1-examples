// phone-kit.js
// The same file sits in every class-11 phone folder. It does the plumbing every phone page
// needs, so sketch.js can be about the idea:
//   phoneSetup(room, extra)  joins the room as a phone. false means there is no server address
//   keepAwake()              asks the phone not to lock its screen. call it from the join tap
//   tiltNow()                { x, y } from -1 to 1. x is left to right, y is top to bottom
//   recentre()               counts the way you hold the phone right now as level
//   raiseNow()               0 when the phone lies flat, 1 when it is held upright
//   otherPhones()            the other phones in the room
//   checkMyName()            takes the lowest free number, or a new one if another phone has yours
//   footerLine()             one line about the connection, for the bottom of the screen
//   centreLines(str, y, w, h)  writes centred lines that wrap at w, the first one at y. h is the line height
//
// A laptop has no tilt sensor, so the mouse or the arrow keys stand in. Move the mouse
// across the page, or hold an arrow key.
//
// Call angleMode(DEGREES) in setup(), because the tilt comes in degrees.

const REACH = 30; // degrees of tilt that count as all the way, 1
const GREY_TEXT = '#9a9a9a';

let serverProblem = '';
let hasRealTilt = false;  // true once a phone has sent a real tilt reading
let neutralBeta = null;   // the front to back angle that counts as level
let mouseHasMoved = false;
let wakeLock = null;
let screenAwake = false;
let wantAwake = false;

// a name and a colour this phone keeps, so it is the same one each time it joins
function remembered(key, make) {
  try {
    let value = localStorage.getItem(key);
    if (!value) {
      value = String(make());
      localStorage.setItem(key, value);
    }
    return value;
  } catch (e) {
    return String(make());
  }
}
// each phone is a number, Phone 1, Phone 2 and so on: the lowest number no other phone in the room has.
// the phone keeps it, so it gets the same number back when it rejoins, if that number is still free
let myNumber = Number(remembered('class12Number', function () {
  return 0;   // 0 is no number yet. checkMyName() gives one once the phone is in the room
}));
let myName = myNumber > 0 ? 'Phone ' + myNumber : 'Phone';
let myHue = Number(remembered('class11Hue', function () {
  return Math.floor(Math.random() * 360);
}));

window.addEventListener('deviceorientation', function (e) {
  if (e.beta !== null) {
    hasRealTilt = true;
  }
});
window.addEventListener('mousemove', function () {
  mouseHasMoved = true;
});

// join the room as a phone. the address the projector's code holds carries the server and the room
function phoneSetup(room, extra) {
  textFont('system-ui');
  const fromUrl = new URLSearchParams(location.search).get('shareHost');
  const host = fromUrl || window.CLASS_SHARE_HOST || '';
  if (!host || host.indexOf('REPLACE-ME') >= 0) {
    serverProblem = 'This page has no server address. Scan the code on the big screen.';
    return false;
  }
  const me = Object.assign({ role: 'phone', name: myName, hue: myHue }, extra || {});
  return shareSetup({ host: host, room: room, me: me });
}

// ask the phone not to lock. a phone that locks leaves the room
async function keepAwake() {
  wantAwake = true;
  if (!('wakeLock' in navigator)) {
    return;
  }
  if (wakeLock && !wakeLock.released) {
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    screenAwake = true;
    wakeLock.addEventListener('release', function () {
      screenAwake = false;
    });
  } catch (e) {
    screenAwake = false;
  }
}
// a wake lock ends when the page is hidden. ask again when it comes back
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && wantAwake) {
    keepAwake();
  }
});

function recentre() {
  neutralBeta = null;
}

function tiltNow() {
  if (hasRealTilt) {
    if (neutralBeta === null) {
      neutralBeta = rotationX;
    }
    return {
      x: constrain(rotationY / REACH, -1, 1),
      y: constrain((rotationX - neutralBeta) / REACH, -1, 1)
    };
  }
  return laptopTilt();
}

// 0 when the phone lies flat, 1 when it is held upright
function raiseNow() {
  if (hasRealTilt) {
    return constrain(map(rotationX, 15, 75, 0, 1), 0, 1);
  }
  if (isMobile) {
    return 0; // a phone with no tilt readings stays quiet
  }
  const t = laptopTilt();
  return constrain(map(t.y, 1, -1, 0, 1), 0, 1);
}

// the mouse stands in for tilt on a laptop. the arrow keys win while they are held
function laptopTilt() {
  if (isMobile) {
    return { x: 0, y: 0 }; // a touch is not a mouse
  }
  let x = 0;
  let y = 0;
  if (mouseHasMoved) {
    x = constrain(map(mouseX, 0, width, -1, 1), -1, 1);
    y = constrain(map(mouseY, 0, height, -1, 1), -1, 1);
  }
  if (keyIsDown(LEFT_ARROW)) {
    x = -1;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    x = 1;
  }
  if (keyIsDown(UP_ARROW)) {
    y = -1;
  }
  if (keyIsDown(DOWN_ARROW)) {
    y = 1;
  }
  return { x: x, y: y };
}

function otherPhones() {
  return guests.filter(function (g) {
    return g.role === 'phone';
  });
}

// two phones with one number are hard to tell apart. the phone that joined later picks again.
// the room gives every phone an id, so 'later' is the larger id, and only one of the two moves
function checkMyName() {
  if (!shareConnected) {
    return;
  }
  const others = otherPhones();
  const clash = others.some(function (g) {
    return g.name === me.name && String(g.id) < String(shareClientId);
  });
  if (myNumber > 0 && !clash) {
    return;
  }
  const taken = others.map(function (g) {
    return g.name;
  });
  let n = 1;
  while (taken.indexOf('Phone ' + n) >= 0) {
    n++;
  }
  myNumber = n;
  myName = 'Phone ' + n;
  me.name = myName;
  try {
    localStorage.setItem('class12Number', String(n));
  } catch (e) { /* the number just will not be kept */ }
}
// phones that join at the same moment can pick the same number, so look again every second
setInterval(checkMyName, 1000);

function footerLine() {
  if (serverProblem) {
    return serverProblem;
  }
  let line = 'Connecting';
  if (shareConnected) {
    line = 'Connected';
  } else if (shareStatus === 'error') {
    line = 'Cannot reach the server. Trying again';
  }
  if (wantAwake) {
    line += screenAwake ? '. Screen stays on' : '. Keep your screen on';
  }
  return line;
}

// centred text that wraps. the text size and colour must be set first.
// it draws lines of up to w pixels across the middle of the screen and returns how many
function centreLines(str, y, w, lineH) {
  textAlign(CENTER, BASELINE);
  const rows = String(str).split('\n');
  let drawn = 0;
  for (let r = 0; r < rows.length; r++) {
    const words = rows[r].split(' ');
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const next = line ? line + ' ' + words[i] : words[i];
      if (line && textWidth(next) > w) {
        text(line, width / 2, y + drawn * lineH);
        drawn += 1;
        line = words[i];
      } else {
        line = next;
      }
    }
    text(line, width / 2, y + drawn * lineH);
    drawn += 1;
  }
  return drawn;
}
