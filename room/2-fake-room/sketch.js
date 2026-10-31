// 2 Fake Room
// Where People Are. You are the tracker. Each phone that joins shows up on the right, by name.
// Drag it onto the floor, to where that person is standing. When they move, move their dot.
// Every phone reads the plan you make, as if a camera were watching the room.
// This is a Wizard of Oz: a person plays the sensor, so you can test the piece before
// the sensing works.
//
// A camera tracker writes the same plan later, so the phone pages do not change when it
// takes over. The plan is set out in plan.js.
//
// The rule: Share keeps only the last thing written, so this page is the only one that writes
// the plan. Open only one Fake Room for a room. It warns you if it finds another tracker.
//
// Your room: change ROOM to your room. The phones must use the same one.
// Your floor: ROOM_W and ROOM_D, in metres. Measure the space, or add ?w=8&d=5 to the address.
//
// Try this:
//   Open 1 The Room Plan on two phones, in the same room. Drag both names onto the floor.
//   Move one dot toward the other. Both phones show the distance shrink. A yellow line joins
//   two people nearer than CLOSE_M. Click a dot to see its distances.
//   Double-click the floor to add a person with no phone. A camera would see them too.
//   Run a short test with a friend calling out where people stand. Can you keep up?
//
// Mouse:  drag a name onto the floor      drag a dot to move it
//         drag a dot off the floor to take it off      double-click the floor to add a person
// Keys:   A  add a person with no phone   arrows  move the chosen dot 10 cm (with Shift, 50 cm)
//         Delete  take the chosen dot off   C twice  clear the plan
// Run it on a laptop, or on a tablet held sideways. On a tablet, drag with a finger, and the
// + button adds a person with no phone.
//
// Key data:
//   people        this page's copy of the plan: { [id]: { x, y, name, hue, phone } }, in metres
//   phones()      the phones in the room. each one has a name, a hue and a key
//   writePerson(id)   sends one person to shared.people

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'room-plan';   // your room. the phones use the same one

// the feel of the piece. change these before you change anything else.
const ROOM_W = 6;           // the floor, across, in metres
const ROOM_D = 4;           // the floor, top to bottom, in metres
const CLOSE_M = 1;          // a line joins two people nearer than this. use the phones' CLOSE_M

let floorSize;        // { w, d, by }: the floor this page writes to shared.room
let people = {};      // the plan. this page writes it to shared.people
let nextId = 1;       // the number for the next person
let chosen = '';      // the id of the dot that was touched last
let drag = null;      // what is being dragged: { id } for a dot, { phone } for a name
let view = null;      // where the floor is on the screen
let tray = [];        // where each waiting name is drawn, for the mouse to find
let addButton = null; // where the + button is drawn
let clearPressed = 0; // when C was pressed. C again soon after clears the plan
let joinedBefore = false;
let joinUrl = '';
let shortUrl = '';
let u = 1;            // one size unit. 1 is a 1280 by 720 screen
let qrSize = 200;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');
  sizeThePage();

  const q = new URLSearchParams(location.search);
  floorSize = { w: Number(q.get('w')) || ROOM_W, d: Number(q.get('d')) || ROOM_D, by: 'fake-room' };

  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'room-plan',
    shared: { room: floorSize, people: {} },
    me: { role: 'tracker', by: 'fake-room' }
  });
  shareConnect().catch(function () {});   // a laptop needs no tap to join

  // the code takes a phone to the phone page, with the server and the room in its address
  const phonePage = new URL('../1-room-plan/phone/', location.href);
  joinUrl = getShareJoinUrl(phonePage.href).replace(/%3A/gi, ':').replace(/%2F/gi, '/');
  shortUrl = phonePage.host + phonePage.pathname;
  if (canShowCode()) showJoinCode();
}

function sizeThePage() {
  u = min(width / 1280, height / 720);
  qrSize = round(160 * u);
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

// this runs each time the page joins the room
function shareReady() {
  if (!joinedBefore) {
    // a page that was reloaded takes the plan the room already has, so nobody loses their spot
    if (shared.people && typeof shared.people === 'object') {
      people = JSON.parse(JSON.stringify(shared.people));
    }
    for (const id of Object.keys(people)) {
      nextId = max(nextId, (parseInt(id.slice(1), 10) || 0) + 1);
    }
  } else {
    // back after a lost connection: this page has the plan, so it sends it all again
    shared.people = JSON.parse(JSON.stringify(people));
  }
  joinedBefore = true;
  shared.room = floorSize;
  if (!shared.people || typeof shared.people !== 'object') shared.people = {};
}

// the phones in the room. guestsWith('key') skips a phone that has not sent its key yet
function phones() {
  return guestsWith('key').filter(function (g) {
    return g.role === 'phone';
  });
}

// one person, sent to every phone. positions are rounded to the centimetre, here and there
function writePerson(id) {
  const p = people[id];
  p.x = round(p.x * 100) / 100;
  p.y = round(p.y * 100) / 100;
  if (!shared.people || typeof shared.people !== 'object') shared.people = {};
  shared.people[id] = { x: p.x, y: p.y, name: p.name, hue: p.hue, phone: p.phone };
}

function addPerson(x, y, name, hue, phone) {
  const id = 'p' + nextId++;
  people[id] = { x: x, y: y, name: name, hue: hue, phone: phone };
  writePerson(id);
  chosen = id;
}

function removePerson(id) {
  delete people[id];
  if (shared.people && typeof shared.people === 'object') delete shared.people[id];
  if (chosen === id) chosen = '';
}

function draw() {
  background(20);
  keepNamesUpToDate();

  const col = 340 * u;   // the column on the right
  view = fitFloor(floorSize, 40 * u, 60 * u, width - col - 80 * u, height - 100 * u);
  moveTheDrag();

  drawFloor(view, u);
  noStroke();
  fill(130);
  textSize(12 * u);
  textAlign(LEFT, TOP);
  text(floorSize.w + ' m across, ' + floorSize.d + ' m top to bottom. A line every metre.',
    view.x, view.y + view.d * view.s + 8 * u);
  textAlign(RIGHT, TOP);
  if (millis() - clearPressed < 2000) {
    fill(255, 200, 0);
    text('Press C again to clear the plan.', view.x + view.w * view.s, view.y + view.d * view.s + 8 * u);
  } else {
    text('A adds a person.  Arrows move the chosen dot.  Delete takes it off.  C twice clears.',
      view.x + view.w * view.s, view.y + view.d * view.s + 8 * u);
  }

  const keys = phones().map(function (g) {
    return g.key;
  });
  const list = Object.keys(people).map(function (id) {
    return Object.assign({ id: id }, people[id]);
  });

  // a line between every two people nearer than CLOSE_M
  const close = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (metresBetween(list[i], list[j]) < CLOSE_M) close.push([list[i], list[j]]);
    }
  }
  for (const pair of close) drawGap(view, pair[0], pair[1], u);
  // the chosen dot last, so it is on top
  list.sort(function (a, b) {
    return (a.id === chosen) - (b.id === chosen);
  });
  for (const p of list) {
    if (drag && drag.id === p.id && drag.off) continue;
    const away = p.phone !== '' && keys.indexOf(p.phone) < 0;
    drawPerson(view, p, u, { ring: p.id === chosen, away: away });
  }
  // the distances to the chosen dot. all of them at once crowd a group
  for (const pair of close) {
    if (pair[0].id === chosen || pair[1].id === chosen) drawGapWords(view, pair[0], pair[1], u);
  }
  drawDragged();
  drawSide(width - col + 10 * u, col - 30 * u);
}

// a phone's name and colour can change, for example after MY_NAME is set. keep the plan in step
function keepNamesUpToDate() {
  for (const g of phones()) {
    for (const id of Object.keys(people)) {
      const p = people[id];
      if (p.phone === g.key && (p.name !== String(g.name || '') || p.hue !== g.hue)) {
        p.name = String(g.name || '');
        p.hue = typeof g.hue === 'number' ? g.hue : -1;
        writePerson(id);
      }
    }
  }
}

// ---- the mouse ----

function onTheFloor(f) {
  return f.x >= 0 && f.y >= 0 && f.x <= floorSize.w && f.y <= floorSize.d;
}

// the dot under the mouse, the chosen one first
function dotAt(mx, my) {
  const ids = Object.keys(people).sort(function (a, b) {
    return (b === chosen) - (a === chosen);
  });
  for (const id of ids) {
    const s = toScreen(view, people[id]);
    const size = max(0.4 * view.s, 22 * u);
    if (dist(mx, my, s.x, s.y) < size / 2 + 6 * u) return id;
  }
  return '';
}

function mousePressed() {
  if (!view) return false;
  if (addButton && inBox(addButton)) {
    addPerson(floorSize.w / 2, floorSize.d / 2, '', -1, '');
    return false;
  }
  const id = dotAt(mouseX, mouseY);
  if (id) {
    chosen = id;
    const s = toScreen(view, people[id]);
    drag = { id: id, dx: s.x - mouseX, dy: s.y - mouseY, off: false };
    return false;
  }
  const t = tray.find(inBox);
  if (t) {
    drag = { phone: t.phone, name: t.name, hue: t.hue, dx: 0, dy: 0, off: true };
    return false;
  }
  if (onTheFloor(toFloor(view, mouseX, mouseY))) chosen = '';
  return false;
}

// while a dot is dragged it follows the mouse. off the floor, it waits to be let go
function moveTheDrag() {
  if (!drag) return;
  const f = toFloor(view, mouseX + drag.dx, mouseY + drag.dy);
  if (drag.id) {
    drag.off = !onTheFloor(f);
    const p = people[drag.id];
    if (!p) {
      drag = null;
      return;
    }
    if (!drag.off && (abs(f.x - p.x) >= 0.01 || abs(f.y - p.y) >= 0.01)) {
      p.x = f.x;
      p.y = f.y;
      writePerson(drag.id);
    }
  } else {
    drag.off = !onTheFloor(f);
  }
}

function mouseReleased() {
  if (!drag) return false;
  const f = toFloor(view, mouseX + drag.dx, mouseY + drag.dy);
  if (drag.id && !onTheFloor(f)) {
    removePerson(drag.id);
  } else if (drag.phone && onTheFloor(f)) {
    const already = Object.keys(people).find(function (id) {
      return people[id].phone === drag.phone;
    });
    if (already) {
      // that phone is on the plan already: move its dot, do not add it twice
      people[already].x = f.x;
      people[already].y = f.y;
      writePerson(already);
      chosen = already;
    } else {
      addPerson(f.x, f.y, drag.name, drag.hue, drag.phone);
    }
  }
  drag = null;
  return false;
}

function doubleClicked() {
  if (!view) return false;
  const f = toFloor(view, mouseX, mouseY);
  if (onTheFloor(f) && !dotAt(mouseX, mouseY)) addPerson(f.x, f.y, '', -1, '');
  return false;
}

// a name or a dot that is being dragged, drawn at the mouse
function drawDragged() {
  if (!drag || !drag.off) return;
  let p = drag.id ? people[drag.id] : drag;
  if (!p) return;
  const ghost = { x: (mouseX + drag.dx - view.x) / view.s, y: (mouseY + drag.dy - view.y) / view.s, name: p.name, hue: p.hue };
  drawPerson(view, ghost, u, { away: true });
  noStroke();
  fill(255, 200, 0);
  textSize(14 * u);
  textAlign(CENTER, BOTTOM);
  text(drag.id ? 'let go to take off the plan' : 'drop on the floor', mouseX + drag.dx, mouseY + drag.dy - 24 * u);
}

function inBox(b) {
  return mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h;
}

// ---- the keys ----

function keyPressed() {
  if (key === 'a' || key === 'A') {
    const f = toFloor(view, mouseX, mouseY);
    if (onTheFloor(f)) addPerson(f.x, f.y, '', -1, '');
    else addPerson(floorSize.w / 2, floorSize.d / 2, '', -1, '');
  } else if ((key === 'Delete' || key === 'Backspace') && chosen) {
    removePerson(chosen);
  } else if (key === 'c' || key === 'C') {
    if (millis() - clearPressed < 2000) {
      people = {};
      shared.people = {};
      chosen = '';
      clearPressed = 0;
    } else {
      clearPressed = millis();
    }
  } else if (chosen && people[chosen] && key.indexOf('Arrow') === 0) {
    const step = keyIsDown(SHIFT) ? 0.5 : 0.1;
    const p = people[chosen];
    if (key === 'ArrowLeft') p.x -= step;
    if (key === 'ArrowRight') p.x += step;
    if (key === 'ArrowUp') p.y -= step;
    if (key === 'ArrowDown') p.y += step;
    p.x = constrain(p.x, 0, floorSize.w);
    p.y = constrain(p.y, 0, floorSize.d);
    writePerson(chosen);
    return false;   // the arrows do not scroll the page
  }
}

// ---- the column on the right ----

function drawSide(x, w) {
  let y = 34 * u;
  noStroke();
  textAlign(LEFT, TOP);
  fill(255);
  textStyle(BOLD);
  textSize(30 * u);
  text('Fake Room', x, y);
  textStyle(NORMAL);
  y += 40 * u;
  fill(160);
  textSize(16 * u);
  text('You are the tracker. Drag each person to where they stand.', x, y, w, 44 * u);
  y += 50 * u;

  fill(shareConnected ? color(92, 224, 138) : color(255, 200, 0));
  circle(x + 7 * u, y + 9 * u, 12 * u);
  fill(200);
  textSize(14 * u);
  text(shareStatusText(), x + 22 * u, y, w - 22 * u, 40 * u);
  y += 44 * u;

  if (guestsWith('role', 'tracker').length > 0) {
    fill(255, 200, 0);
    text('Another tracker is in this room. Only one page should write the plan. Close one.', x, y, w, 54 * u);
    y += 58 * u;
  }

  fill(150);
  textStyle(BOLD);
  textSize(13 * u);
  text('ON THE PLAN  ' + Object.keys(people).length, x, y);
  textStyle(NORMAL);
  y += 22 * u;
  addButton = { x: x, y: y, w: w, h: 32 * u };
  fill(inBox(addButton) ? 60 : 44);
  rect(addButton.x, addButton.y, addButton.w, addButton.h, 6 * u);
  fill(255);
  textSize(15 * u);
  textAlign(CENTER, CENTER);
  text('+  a person with no phone', addButton.x + addButton.w / 2, addButton.y + addButton.h / 2);
  textAlign(LEFT, TOP);
  y += 42 * u;
  const p = people[chosen];
  if (p) {
    fill(255);
    textSize(15 * u);
    text(nameOf(p) + '   x ' + p.x.toFixed(2) + ' m   y ' + p.y.toFixed(2) + ' m', x, y);
  }
  y += 34 * u;

  // the phones that are here but not on the plan yet, in two columns
  const placed = Object.keys(people).map(function (id) {
    return people[id].phone;
  });
  const waiting = phones().filter(function (g) {
    return placed.indexOf(g.key) < 0;
  });
  fill(150);
  textStyle(BOLD);
  textSize(13 * u);
  text('WAITING  ' + waiting.length, x, y);
  textStyle(NORMAL);
  y += 22 * u;
  tray = [];
  if (waiting.length === 0) {
    fill(130);
    textSize(14 * u);
    text('No phones waiting. A phone that joins shows up here. Drag a name onto the floor.', x, y, w, 60 * u);
  }
  const listEnd = height - qrSize - 140 * u;   // the list stops here. the code goes under the column
  const half = (w - 8 * u) / 2;
  for (let i = 0; i < waiting.length; i++) {
    const g = waiting[i];
    const cy = y + floor(i / 2) * 34 * u;
    if (cy + 28 * u > listEnd) {
      fill(130);
      textSize(14 * u);
      text('and ' + (waiting.length - i) + ' more', x, cy);
      break;
    }
    const chip = { x: x + (i % 2) * (half + 8 * u), y: cy, w: half, h: 28 * u, phone: g.key, name: String(g.name || ''), hue: typeof g.hue === 'number' ? g.hue : -1 };
    tray.push(chip);
    fill(36);
    rect(chip.x, chip.y, chip.w, chip.h, 6 * u);
    fill(hueColour(chip.hue));
    circle(chip.x + 14 * u, chip.y + chip.h / 2, 12 * u);
    fill(255);
    textSize(15 * u);
    textAlign(LEFT, CENTER);
    text(chip.name, chip.x + 28 * u, chip.y + chip.h / 2);
    textAlign(LEFT, TOP);
  }

  // how phones join. the code sits under these words, on https
  fill(255, 200, 0);
  textStyle(BOLD);
  textSize(18 * u);
  text('Phones join here', x, height - qrSize - 110 * u);
  textStyle(NORMAL);
  fill(150);
  textSize(12 * u);
  text(shortUrl + '  room ' + roomName(), x, height - qrSize - 84 * u, w, 32 * u);
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
