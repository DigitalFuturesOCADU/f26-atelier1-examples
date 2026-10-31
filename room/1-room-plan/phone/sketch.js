// 1 The Room Plan: Phone
// Where People Are. The room plan says where everyone stands, seen from above, in metres.
// One page writes it, the tracker. This page only reads it. It finds you on the plan,
// measures how far you are from everyone else, and says who is nearest.
//
// The tracker can be anything. In 2 Fake Room it is a person dragging dots on a laptop.
// Later it is a camera. This page stays the same: every tracker writes the same plan.
// The plan is set out in plan.js.
//
// Your room: change ROOM to your room. The tracker and the phones must use the same room.
// Your name: put it in MY_NAME. Leave it empty and the phone picks an animal.
//
// How the tracker knows this phone: the phone makes a key, six random letters, and keeps it
// while the tab is open, through reloads too. The tracker puts the key on your spot in the plan.
// Share gives a phone a new id each time it joins, so the id cannot do this job.
//
// Try this:
//   Open 2 Fake Room on a laptop, in the same room. Join here. Your name appears on the
//   laptop. Drag it onto the floor. This phone now shows where you are.
//   Join with a second phone and place it near the first. Watch the distance.
//   Bring the two dots closer than CLOSE_M. The screen fills with the other person's colour.
//   Lock the phone, then unlock it. It joins again and finds its spot.
//
// Key data:
//   mine      you on the plan: { x, y, name, hue }, in metres. null until the tracker places you
//   others    everyone else on the plan, nearest first. each one has .metres, how far from you
//   nearest   the first of others, or null
//   CLOSE_M   how near counts as close, in metres

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'room-plan';   // your room. the tracker uses the same one
const MY_NAME = '';         // your name

// the feel of the piece. change these before you change anything else.
const CLOSE_M = 1;          // nearer than this, in metres, counts as close

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx',
  'owl', 'bee', 'deer', 'frog', 'mole', 'swan', 'duck', 'goat', 'crab', 'toad',
  'lark', 'robin', 'finch', 'panda', 'koala', 'llama', 'puffin', 'badger', 'beaver', 'tiger'];

let mine = null;     // you on the plan
let others = [];     // everyone else, nearest first
let nearest = null;  // the nearest person

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');

  // me is what this phone sends. The tracker reads the name, the colour and the key.
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'room-plan',
    me: {
      role: 'phone',
      name: MY_NAME || kept('name', random(ANIMALS)),
      hue: kept('hue', floor(random(360))),
      key: kept('key', Math.random().toString(36).slice(2, 8))
    },
    quiet: true   // this page reads only shared, so it does not need the other phones' values
  });
  enablePermissionsTap(['share'], 'Tap to join');   // the tap joins the room
  showDesktopQr();   // on a laptop: a QR code, so a phone can join
}

// something this tab keeps while it is open, through reloads too. each tab keeps its own
function kept(what, value) {
  try {
    const old = sessionStorage.getItem('room-plan-' + what);
    if (old !== null) return typeof value === 'number' ? Number(old) : old;
    sessionStorage.setItem('room-plan-' + what, String(value));
  } catch (e) {
    // a private window can say no. then a reload makes a new name, colour and key
  }
  return value;
}

function draw() {
  const k = min(width / 390, height / 700);   // one size unit for this screen
  const left = (width - 390 * k) / 2;         // the page is a column 390 units wide
  const extra = max(0, height - 700 * k);      // a tall screen gives the plan more room
  readThePlan();
  const theFloor = planFloor();

  background(20);
  // someone is close: the screen fills with their colour
  if (nearest && nearest.metres < CLOSE_M) {
    noStroke();
    fill(hueColour(nearest.hue, 70));
    rect(0, 0, width, height);
  }
  drawWhoIAm(k);

  // the words at the top: who is nearest, or what is missing
  noStroke();
  textAlign(CENTER, CENTER);
  fill(255);
  if (!shareConnected) {
    textSize(20 * k);
    text(shareStatusText(), left + 20 * k, 120 * k, 350 * k, 120 * k);
  } else if (!theFloor) {
    textSize(30 * k);
    text('No plan yet', width / 2, 110 * k);
    fill(170);
    textSize(17 * k);
    text('A tracker writes the plan. Open 2 Fake Room on a laptop, in the room ' + roomName() + '.',
      left + 30 * k, 140 * k, 330 * k, 80 * k);
  } else if (!mine) {
    textSize(30 * k);
    text('Not on the plan yet', width / 2, 110 * k);
    fill(170);
    textSize(17 * k);
    text('The tracker puts you on it.', width / 2, 150 * k);
  } else if (!nearest) {
    textSize(30 * k);
    text('Nobody else yet', width / 2, 110 * k);
    fill(170);
    textSize(17 * k);
    text('You are on the plan. Nobody else is.', width / 2, 150 * k);
  } else {
    textSize(20 * k);
    text(nearest.metres < CLOSE_M ? 'close to' : 'nearest', width / 2, 74 * k);
    textSize(44 * k);
    textStyle(BOLD);
    text(nameOf(nearest), width / 2, 118 * k);
    textStyle(NORMAL);
    textSize(30 * k);
    text(metresText(nearest.metres), width / 2, 162 * k);
  }

  if (theFloor) {
    const below = drawThePlan(theFloor, left, k, extra);
    drawTheList(left, k, below + 36 * k);
  }

  // the tracker writes the plan. if it has gone, the plan stays as it was left
  fill(150);
  textSize(14 * k);
  textAlign(CENTER, BOTTOM);
  if (shareConnected && theFloor && guestsWith('role', 'tracker').length === 0) {
    text('No tracker in the room. The plan stays as it was.', left + 10 * k, height - 104 * k, 370 * k, 40 * k);
  }
  text(shareStatusText(), left + 10 * k, height - 62 * k, 370 * k, 40 * k);
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

// the whole floor, seen from above. you have a white ring and a circle of CLOSE_M round you.
// it returns where the floor ends, so the list can go under it
function drawThePlan(theFloor, left, k, extra) {
  const view = fitFloor(theFloor, left + 20 * k, 214 * k, 350 * k, 264 * k + extra);
  view.y = 214 * k;   // the floor sits at the top of its space
  drawFloor(view, k);
  if (mine) {
    const s = toScreen(view, mine);
    noFill();
    stroke(255, 90);
    strokeWeight(1.5 * k);
    circle(s.x, s.y, CLOSE_M * 2 * view.s);
    if (nearest) drawGap(view, mine, nearest, k);   // the distance is in big type above
  }
  for (const p of planPeople()) {
    if (mine && p.id === mine.id) continue;
    drawPerson(view, p, k);
  }
  if (mine) drawPerson(view, mine, k, { ring: true });
  return view.y + view.d * view.s;
}

// everyone else, nearest first, with how far away they are, from top down
function drawTheList(left, k, top) {
  if (!mine) return;
  textSize(17 * k);
  for (let i = 0; i < min(others.length, 4); i++) {
    const p = others[i];
    const y = top + i * 26 * k;
    noStroke();
    fill(hueColour(p.hue));
    circle(left + 40 * k, y, 14 * k);
    fill(255);
    textAlign(LEFT, CENTER);
    text(nameOf(p), left + 58 * k, y);
    textAlign(RIGHT, CENTER);
    text(metresText(p.metres), left + 350 * k, y);
  }
  if (others.length > 4) {
    fill(150);
    textAlign(LEFT, CENTER);
    text('and ' + (others.length - 4) + ' more', left + 58 * k, top + 4 * 26 * k);
  }
}

// who I am: a border round the screen in my colour, and my name at the top
function drawWhoIAm(k) {
  noFill();
  stroke(hueColour(me.hue));
  strokeWeight(12 * k);
  rect(0, 0, width, height);
  noStroke();
  fill(hueColour(me.hue));
  textAlign(CENTER, CENTER);
  textSize(20 * k);
  text('you are ' + String(me.name || ''), width / 2, 26 * k);
}

// the room this page joined. an address with ?room= wins over ROOM
function roomName() {
  return new URLSearchParams(location.search).get('room') || ROOM;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
