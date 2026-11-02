// 1 The Room Plan: Projector
// Where People Are. The whole plan on a big screen: everyone, where they stand, in metres.
// A line joins two people who are nearer than CLOSE_M, with how far apart they are.
// This page only reads the plan, the same as the phones. A tracker writes it, such as
// 2 Fake Room on another laptop. Phones join with the code on the right.
//
// Your room: change ROOM to your room. The tracker and the phones must use the same room.
//
// Try this:
//   Put this page on the projector and run 2 Fake Room on another laptop. Move a dot there
//   and watch it move here.
//   Close Fake Room. The plan stays as it was, and this page says the tracker has gone.
//
// Key data:
//   planPeople()   everyone on the plan: [{ id, x, y, name, hue, phone }], in metres
//   pairs          every two people nearer than CLOSE_M, nearest first, each with .metres

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'room-plan';   // your room. the tracker uses the same one

// the feel of the piece. change these before you change anything else.
const CLOSE_M = 1;          // a line joins two people nearer than this. use the phones' CLOSE_M

let pairs = [];       // every two people nearer than CLOSE_M
let joinUrl = '';
let shortUrl = '';
let u = 1;            // one size unit. 1 is a 1280 by 720 screen
let qrSize = 200;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');
  sizeThePage();

  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'room-plan',
    me: { role: 'plan' },
    quiet: true   // this page reads only shared, so it does not need the phones' values
  });
  shareConnect().catch(function () {});   // a laptop needs no tap to join

  // the code takes a phone to the phone page, with the server and the room in its address
  const phonePage = new URL('../phone/', location.href);
  joinUrl = getShareJoinUrl(phonePage.href).replace(/%3A/gi, ':').replace(/%2F/gi, '/');
  shortUrl = phonePage.host + '\n' + phonePage.pathname;   // two lines: a long address fits the column
  if (canShowCode()) showJoinCode();
}

function sizeThePage() {
  u = min(width / 1280, height / 720);
  qrSize = round(190 * u);
}

// the code only works on a page a phone can reach, so it shows on https
function canShowCode() {
  return location.protocol === 'https:' && window.self === window.top;
}

function showJoinCode() {
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

function draw() {
  background(20);
  const col = 340 * u;   // the column on the right
  const theFloor = planFloor();
  const everyone = planPeople();

  pairs = [];
  for (let i = 0; i < everyone.length; i++) {
    for (let j = i + 1; j < everyone.length; j++) {
      const m = metresBetween(everyone[i], everyone[j]);
      if (m < CLOSE_M) pairs.push({ a: everyone[i], b: everyone[j], metres: m });
    }
  }
  pairs.sort(function (p, q) {
    return p.metres - q.metres;
  });

  if (theFloor) {
    const view = fitFloor(theFloor, 40 * u, 60 * u, width - col - 80 * u, height - 100 * u);
    drawFloor(view, u);
    for (const p of pairs) drawGap(view, p.a, p.b, u);
    for (const p of everyone) drawPerson(view, p, u);
    for (const p of pairs) drawGapWords(view, p.a, p.b, u);
  } else {
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(40 * u);
    text('No plan yet', (width - col) / 2, height / 2 - 30 * u);
    fill(160);
    textSize(20 * u);
    text('A tracker writes the plan. Open 2 Fake Room on another laptop, in the room ' + roomName() + '.',
      (width - col) / 2 - 300 * u, height / 2, 600 * u, 80 * u);
  }
  drawSide(width - col + 10 * u, col - 30 * u, theFloor, everyone);
}

function drawSide(x, w, theFloor, everyone) {
  let y = 34 * u;
  noStroke();
  textAlign(LEFT, TOP);
  fill(255);
  textStyle(BOLD);
  textSize(30 * u);
  text('The Room Plan', x, y);
  textStyle(NORMAL);
  y += 40 * u;
  fill(160);
  textSize(16 * u);
  text('Where everyone stands, seen from above.', x, y, w, 44 * u);
  y += 50 * u;

  fill(150);
  textStyle(BOLD);
  textSize(13 * u);
  text('ON THE PLAN', x, y);
  textStyle(NORMAL);
  y += 18 * u;
  fill(255);
  textStyle(BOLD);
  textSize(90 * u);
  text(String(everyone.length), x, y);
  textStyle(NORMAL);
  y += 104 * u;

  fill(150);
  textStyle(BOLD);
  textSize(13 * u);
  text('NEARER THAN ' + metresText(CLOSE_M), x, y);
  textStyle(NORMAL);
  y += 22 * u;
  textSize(16 * u);
  if (pairs.length === 0) {
    fill(130);
    text('Nobody', x, y);
    y += 24 * u;
  }
  for (let i = 0; i < min(pairs.length, 5); i++) {
    fill(255);
    text(nameOf(pairs[i].a) + ' and ' + nameOf(pairs[i].b) + ', ' + metresText(pairs[i].metres), x, y, w, 24 * u);
    y += 24 * u;
  }
  y += 16 * u;

  fill(shareConnected ? color(92, 224, 138) : color(255, 200, 0));
  circle(x + 7 * u, y + 9 * u, 12 * u);
  fill(200);
  textSize(14 * u);
  text(shareStatusText(), x + 22 * u, y, w - 22 * u, 40 * u);
  y += 44 * u;
  if (shareConnected && theFloor && guestsWith('role', 'tracker').length === 0) {
    fill(255, 200, 0);
    text('No tracker in the room. The plan stays as it was.', x, y, w, 40 * u);
  }

  // how phones join. the code sits under these words, on https
  fill(255, 200, 0);
  textStyle(BOLD);
  textSize(18 * u);
  text('Phones join here', x, height - qrSize - 124 * u);
  textStyle(NORMAL);
  fill(150);
  textSize(12 * u);
  text(shortUrl + '\nroom ' + roomName(), x, height - qrSize - 98 * u, w, 48 * u);
}

// the room this page joined. an address with ?room= wins over ROOM
function roomName() {
  return new URLSearchParams(location.search).get('room') || ROOM;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  sizeThePage();
  if (canShowCode()) showJoinCode();
}
