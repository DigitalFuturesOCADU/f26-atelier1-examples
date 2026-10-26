// 6 One Value for the Room
// Share Basics. shared is one object for the whole room. Every phone sees the same shared.
// Here it holds the room's colour. Tap to change it, and every screen changes together.
//
// The rule: Share keeps only the last thing written. If two phones add 1 at the same moment,
// it counts once. So only one phone writes shared: the host. The other phones ask the host
// with an event, and the host makes the change.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
//
// Key data: shared.colour and shared.changes (the room's), iAmHost() (true on one phone)

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx',
  'owl', 'bee', 'deer', 'frog', 'mole', 'swan', 'duck', 'goat', 'crab', 'toad',
  'lark', 'robin', 'finch', 'panda', 'koala', 'llama', 'puffin', 'badger', 'beaver', 'tiger'];
const COLOURS = [200, 330, 45, 140, 270];   // the hues the room steps through

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'one-value-for-the-room',
    me: { name: MY_NAME || random(ANIMALS) },
    shared: { colour: 0, changes: 0, by: '' }   // what an empty room starts with
  });
  enablePermissionsTap(['share'], 'Tap to join');
  showDesktopQr();
}

// the host: one phone that every phone agrees on. Of the phones running this sketch,
// it is the one whose id comes first. (shareIsHost is the first page into the room,
// and that can be a page like the Room Inspector, which never answers.)
function iAmHost() {
  const ids = guestsWith('name').map(function (g) { return g.id; });
  ids.push(shareClientId);
  ids.sort();
  return ids[0] === shareClientId;
}

function mousePressed() {
  if (!shareConnected) return;
  if (iAmHost()) nextColour(me.name);     // the host changes it itself
  else shareEmit('next');                 // everyone else asks the host
}

// only the host acts on 'next'
function shareEvent(name, data, from) {
  if (name === 'next' && iAmHost()) {
    const asker = shareGuest(from);
    nextColour(asker ? asker.name : 'someone');
  }
}

// the only place shared is written, and only the host runs it
// (|| 0: a room another page started has no colour or changes yet)
function nextColour(who) {
  shared.colour = ((shared.colour || 0) + 1) % COLOURS.length;
  shared.changes = (shared.changes || 0) + 1;
  shared.by = who;
}

function draw() {
  const k = min(width / 390, height / 700);
  colorMode(HSB);
  background(COLOURS[shared.colour] || 0, 60, 45);
  noStroke();
  textAlign(CENTER, CENTER);

  fill(0, 0, 100);
  textSize(64 * k);
  text(shared.changes || 0, width / 2, height * 0.4);
  textSize(20 * k);
  text('changes', width / 2, height * 0.4 + 50 * k);
  if (shared.by) text('last by ' + shared.by, width / 2, height * 0.4 + 80 * k);
  text(iAmHost() ? 'you are the host' : 'tap to ask the host', width / 2, height * 0.2);

  fill(0, 0, 85);
  textSize(16 * k);
  text(shareStatusText(), width / 2, height - 116 * k);
  text('the room has ' + JSON.stringify(shared), 10 * k, height - 94 * k, width - 20 * k, 44 * k);
  text('you send ' + JSON.stringify(me), 10 * k, height - 50 * k, width - 20 * k, 44 * k);   // a box, so a long line wraps
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
