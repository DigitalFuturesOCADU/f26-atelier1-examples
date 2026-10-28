// join-panel.js
// The same file sits in every class-11 projector folder. It does the plumbing every
// projector page needs, so sketch.js can be about the idea:
//   projectorSetup(room, title, sharedStart)  joins the room as the projector and shows the join code
//   layoutProjector()            works out the sizes. call it in setup() and windowResized()
//   drawTitle(line)              the title bar
//   drawJoinColumn(label, value, size)  the phone count, one more number, the join code and the
//                                       connection state. size is the text size of that number
//   phoneList()                  every guest that is a phone
//   nameOf(id)                   the name a phone picked for itself
//
// The rule for every class-wide example: Share keeps only the last thing written, so two phones
// that add 1 at the same moment count once. So each phone keeps its own value in me, the
// projector adds them up, and the projector is the only page that writes shared.

const AMBER = '#ffc800';
const GREY = '#9a9a9a';
const GREEN = '#5ce08a';
const RED = '#ff5a4d';

let u = 1;           // one design unit. 1 is a 1920 by 1080 screen. everything is sized with it
let qrSize = 300;    // the join code, in pixels
let colX = 0;        // the left edge of the column on the right
let colW = 300;      // its width
let arena = { x: 0, y: 0, w: 100, h: 100 }; // the space left over for the piece itself
let joinUrl = '';    // the address a phone opens. this is what the code holds
let shortUrl = '';   // the same address with no server in it, short enough to type
let serverProblem = ''; // what is wrong with the server address, or nothing
let hostName = '';
let roomName = '';
let projectorTitle = '';

// join the room. the page address can carry ?shareHost= and ?room= to change either one
function projectorSetup(room, title, sharedStart) {
  projectorTitle = title;
  textFont('system-ui');

  const fromUrl = new URLSearchParams(location.search).get('shareHost');
  const host = fromUrl || window.CLASS_SHARE_HOST || '';
  hostName = host.replace(/^https?:\/\//, '');
  if (!host || host.indexOf('REPLACE-ME') >= 0) {
    serverProblem = 'No server address yet';
    return false;
  }

  shareSetup({
    host: host,
    room: room,
    shared: sharedStart || {},
    me: { role: 'projector' }
  });
  roomName = window.shareRoom.replace(/^default:/, '');
  shareConnect().catch(function () {});

  // the phone page sits next to this one. getShareJoinUrl adds the server and the room
  const phonePage = new URL('https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/04-show-of-hands-networked/phone/');
  joinUrl = getShareJoinUrl(phonePage.href);
  // a colon and a slash are fine in a query. leaving them as they are makes the code smaller
  joinUrl = joinUrl.replace(/%3A/gi, ':').replace(/%2F/gi, '/');
  shortUrl = (phonePage.host + phonePage.pathname);
  layoutProjector();
  showJoinCode();
  return true;
}

function layoutProjector() {
  u = min(width / 1920, height / 1080);
  qrSize = round(constrain(min(height * 0.34, width * 0.22), 190, 420));
  colW = qrSize + 24;          // the code sits in a white panel with 12 pixels round it
  colX = width - 16 - colW;
  arena.x = 48 * u;
  arena.y = 150 * u;
  arena.w = colX - 48 * u - arena.x;
  arena.h = height - arena.y - 48 * u;
}

// p5-phone draws the code. it is a white panel in the bottom right corner
function showJoinCode() {
  if (!joinUrl) return;
  showDesktopQr({
    url: joinUrl,
    share: false,          // the address already carries the server and the room
    size: qrSize,
    position: 'bottom-right',
    label: '',
    closable: false,
    rememberDismiss: false
  });
}

function phoneList() {
  return guests.filter(function (g) {
    return g.role === 'phone';
  });
}

function nameOf(id) {
  for (let i = 0; i < guests.length; i++) {
    if (guests[i].id === id) {
      return guests[i].name || 'Someone';
    }
  }
  return 'Someone';
}

function drawTitle(line) {
  noStroke();
  fill(255);
  textAlign(LEFT, BASELINE);
  textStyle(BOLD);
  textSize(56 * u);
  text(projectorTitle, 48 * u, 84 * u);
  textStyle(NORMAL);
  fill(GREY);
  textSize(30 * u);
  text(line, 48 * u, 128 * u);
}

function connectionInfo() {
  if (serverProblem) {
    return { dot: RED, words: serverProblem };
  }
  if (shareConnected) {
    return { dot: GREEN, words: 'Connected' };
  }
  if (shareStatus === 'connecting' || shareStatus === 'idle') {
    return { dot: AMBER, words: 'Connecting' };
  }
  return { dot: RED, words: 'Cannot reach the server. Trying again' };
}

// the column on the right: how many phones, one more number, the state of the connection,
// and the code to join with
function drawJoinColumn(label, value, valueSize) {
  const x = colX;
  noStroke();
  textAlign(LEFT, BASELINE);

  fill(GREY);
  textSize(26 * u);
  text('PHONES', x, 58 * u);
  fill(255);
  textStyle(BOLD);
  textSize(150 * u);
  text(phoneList().length, x, 190 * u);
  textStyle(NORMAL);

  if (label) {
    fill(GREY);
    textSize(26 * u);
    text(label, x, 262 * u);
    fill(AMBER);
    textStyle(BOLD);
    textSize((valueSize || 96) * u);
    text(value, x, 352 * u);
    textStyle(NORMAL);
  }

  // the state of the connection
  const info = connectionInfo();
  fill(info.dot);
  circle(x + 9 * u, 400 * u, 18 * u);
  fill(255);
  textSize(28 * u);
  const said = wrapText(info.words, colW - 34 * u);
  for (let i = 0; i < said.length; i++) {
    text(said[i], x + 32 * u, 410 * u + i * 34 * u);
  }
  fill(GREY);
  textSize(22 * u);
  if (!serverProblem) {
    text('Room: ' + roomName, x, 410 * u + said.length * 34 * u + 14 * u);
  }

  // the address above the code
  const codeTop = height - 16 - (qrSize + 24);
  if (serverProblem) {
    fill(255);
    textSize(26 * u);
    const lines = wrapText('Put the server address in class-server.js. Or add ?shareHost=https://your-server.workers.dev to the end of this page address.', colW);
    for (let i = 0; i < lines.length; i++) {
      text(lines[i], x, codeTop - (lines.length - i) * 32 * u);
    }
    return;
  }
  textSize(22 * u);
  const lines = wrapText(shortUrl, colW);
  const lineH = 27 * u;
  const top = codeTop - 14 * u - lines.length * lineH;
  fill(AMBER);
  textStyle(BOLD);
  textSize(34 * u);
  text('SCAN TO JOIN', x, top - 14 * u);
  textStyle(NORMAL);
  fill(GREY);
  textSize(22 * u);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], x, top + (i + 1) * lineH - 6 * u);
  }
}

// break text into lines no wider than w. it breaks at a space or after a slash, and in the
// middle of a word only when the word is wider than the line. text size must be set first
function wrapText(str, w) {
  const parts = String(str).split(/(?<=[ \/])/);
  const lines = [];
  let line = '';
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (line && textWidth((line + part).trimEnd()) > w) {
      lines.push(line.trimEnd());
      line = '';
    }
    // a piece wider than the whole line is cut up
    while (textWidth(part.trimEnd()) > w && part.length > 1) {
      let n = part.length - 1;
      while (n > 1 && textWidth(part.slice(0, n)) > w) {
        n -= 1;
      }
      lines.push(part.slice(0, n));
      part = part.slice(n);
    }
    line += part;
  }
  if (line) {
    lines.push(line.trimEnd());
  }
  return lines;
}

// a small round arrow head for a line that ends at (x, y)
function arrowHead(x, y, angle, size) {
  push();
  translate(x, y);
  rotate(angle);
  triangle(0, 0, -size, size * 0.5, -size, -size * 0.5);
  pop();
}
