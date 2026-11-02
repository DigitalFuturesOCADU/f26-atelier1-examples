// 3 Colour Room: Phone
// Where People Are. This phone is a colour. Hold it up, screen to the camera, and the camera
// on the laptop finds you by your colour. The room plan comes back, and this phone says who
// is nearest and how far.
//
// The screen is your colour, edge to edge, so the camera has as much of it as it can get.
// The words are black or white. A word in another colour could look like another phone.
//
// Five phones: a room holds five. Each phone takes a slot and its colour: red, yellow, green,
// blue or pink. The laptop knows the five colours. A sixth phone waits until one leaves.
// Your name: put it in MY_NAME. Your colour stays your slot's colour, because the camera needs it.
//
// Try this:
//   Hold the phone at chest height, screen to the camera. Then hold it at your side. Then
//   behind your back. Which ones does the camera still see?
//   Walk toward another phone until the words say close.
//   If the laptop sees white in the middle of your phone, turn the brightness down.
//
// Key data:
//   mine      you on the plan: { x, y, name, hue }, in metres. null while the camera cannot see you
//   others    everyone else on the plan, nearest first. each one has .metres, how far from you
//   nearest   the first of others, or null
//   me.slot   this phone's slot, 1 to 5. 0 while it waits for one

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'room-plan';   // your room. the laptop uses the same one
const MY_NAME = '';         // your name

// the feel of the piece. change these before you change anything else.
const CLOSE_M = 1;          // nearer than this, in metres, counts as close

let mine = null;     // you on the plan
let others = [];     // everyone else, nearest first
let nearest = null;  // the nearest person

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');

  // me is what this phone sends. The laptop reads the slot, the name and the key
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'room-plan',
    me: {
      role: 'phone',
      key: kept('key', Math.random().toString(36).slice(2, 8)),
      slot: 0,
      name: MY_NAME,
      hue: -1
    }
  });
  enablePermissionsTap(['share'], 'Tap to join');   // the tap joins the room
  showDesktopQr();   // on a laptop: a QR code, so a phone can join
}

// take a slot, or keep the one this phone has. me changes only when the slot changes.
// After a reload the phone asks for its old slot again
function keepMySlot() {
  if (!shareConnected) return;
  const slot = freeSlot(me.slot || kept('slot', 0));
  if (slot === me.slot) return;
  me.slot = slot;
  me.name = slot > 0 ? MY_NAME || SLOTS[slot - 1].name : MY_NAME;
  me.hue = slot > 0 ? SLOTS[slot - 1].hue : -1;
  if (slot > 0) kept('slot', slot, true);
}

// something this tab keeps while it is open, through reloads too. each tab keeps its own.
// change is true to write a new value over the old one
function kept(what, value, change = false) {
  try {
    const old = sessionStorage.getItem('room-plan-' + what);
    if (old !== null && !change) return typeof value === 'number' ? Number(old) : old;
    sessionStorage.setItem('room-plan-' + what, String(value));
  } catch (e) {
    // a private window can say no. then a reload makes a new key
  }
  return value;
}

function draw() {
  const k = min(width / 390, height / 700);   // one size unit for this screen
  const left = (width - 390 * k) / 2;         // the page is a column 390 units wide
  keepMySlot();
  readThePlan();

  // the colour, edge to edge. grey until this phone has a slot
  let ink = color(235);
  if (shareConnected && me.slot > 0) {
    const c = slotColour(me.slot);
    background(c);
    // black words on a light colour, white on a dark one
    ink = 0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c) > 128 ? color(20) : color(255);
  } else {
    background(40);
  }

  noStroke();
  fill(ink);
  textAlign(CENTER, CENTER);
  textSize(26 * k);
  textStyle(BOLD);
  text(me.slot > 0 ? 'you are ' + String(me.name || '') : 'waiting for a slot', width / 2, 40 * k);
  textStyle(NORMAL);

  // the words in the middle: who is nearest, or what is missing
  const mid = height / 2 - 60 * k;
  if (!shareConnected) {
    textSize(20 * k);
    text(shareStatusText(), left + 20 * k, mid - 60 * k, 350 * k, 120 * k);
  } else if (me.slot === 0) {
    bigWords('Five phones are here', 'A room holds five. This phone joins when one leaves. Or change ROOM to make your own.', left, k, mid);
  } else if (!planFloor() || guestsWith('role', 'tracker').length === 0) {
    bigWords('No camera yet', 'Open 3 Colour Room on a laptop, in the room ' + roomName() + '.', left, k, mid);
  } else if (!mine) {
    bigWords('The camera cannot see you', 'Hold your phone up, screen to the camera.', left, k, mid);
  } else if (!nearest) {
    bigWords('Nobody else yet', 'The camera sees you. It sees nobody else.', left, k, mid);
  } else {
    textSize(22 * k);
    text(nearest.metres < CLOSE_M ? 'close to' : 'nearest', width / 2, mid - 70 * k);
    textStyle(BOLD);
    textSize(54 * k);
    text(nameOf(nearest), width / 2, mid - 18 * k);
    textStyle(NORMAL);
    textSize(40 * k);
    text(metresText(nearest.metres), width / 2, mid + 40 * k);
    drawTheList(left, k, mid + 110 * k);
  }

  textSize(13 * k);
  textAlign(CENTER, BOTTOM);
  text('If the camera sees white, turn your brightness down.', left + 10 * k, height - 104 * k, 370 * k, 40 * k);
  text(shareStatusText(), left + 10 * k, height - 62 * k, 370 * k, 40 * k);
}

function bigWords(head, words, left, k, mid) {
  textAlign(CENTER, CENTER);
  textSize(30 * k);
  textStyle(BOLD);
  text(head, left + 20 * k, mid - 60 * k, 350 * k, 80 * k);
  textStyle(NORMAL);
  textSize(18 * k);
  text(words, left + 30 * k, mid + 10 * k, 330 * k, 80 * k);
}

// find you on the plan, then how far everyone else is
function readThePlan() {
  const everyone = planPeople();
  mine = everyone.find(function (p) {
    return p.phone !== '' && p.phone === me.key;
  }) || null;
  others = [];
  if (mine) {
    for (const p of everyone) {
      if (p.id === mine.id) continue;
      p.metres = metresBetween(mine, p);
      others.push(p);
    }
    others.sort(function (a, b) {
      return a.metres - b.metres;
    });
  }
  nearest = others[0] || null;
}

// everyone else after the nearest, with how far away they are. words only: no colours
function drawTheList(left, k, top) {
  textSize(18 * k);
  for (let i = 1; i < others.length; i++) {
    const y = top + (i - 1) * 28 * k;
    textAlign(LEFT, CENTER);
    text(nameOf(others[i]), left + 70 * k, y);
    textAlign(RIGHT, CENTER);
    text(metresText(others[i].metres), left + 320 * k, y);
  }
}

// the room this page joined. an address with ?room= wins over ROOM
function roomName() {
  return new URLSearchParams(location.search).get('room') || ROOM;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
