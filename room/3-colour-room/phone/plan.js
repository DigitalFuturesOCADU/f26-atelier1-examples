// plan.js: the room plan. The same file is in every Where People Are example.
// If you change it in one, copy it to the others.
//
// The plan says where everyone is, seen from above, in metres. One page writes it, the tracker.
// In 2 Fake Room the tracker is a person who drags dots. Later trackers use a camera.
// Every other page only reads it. The plan is two keys in shared:
//
//   shared.room     { w, d, by }   the floor. w is across and d is top to bottom, in metres.
//                                  by names the tracker that wrote it, such as 'fake-room'
//   shared.people   { [id]: { x, y, name, hue, phone } }   one entry for each person
//                     x, y    metres from the top left corner of the floor
//                     name    what to call them. '' for a person with no phone
//                     hue     their colour, from 0 to 360 (their slot's hue). -1 is grey
//                     phone   the key of their phone (me.key on the phone page), or ''
//
// A room holds five phones. Each phone takes a slot: a number from 1 to 5 with its own colour
// and name. The slot is who the phone is. A camera that knows the colours knows the phones.
// A sixth phone waits until one leaves.

const SLOTS = [
  { name: 'red', hue: 0 },
  { name: 'yellow', hue: 55 },
  { name: 'green', hue: 130 },
  { name: 'blue', hue: 220 },
  { name: 'pink', hue: 300 }
];

// the slot this phone should have: the one it wants, if no other phone has it,
// or else the first free one. 0 means all five are taken.
// Two phones can take the same slot at the same moment. The one whose key comes first keeps it.
function freeSlot(wanted) {
  const others = guestsWith('role', 'phone').filter(function (g) {
    return g.key !== me.key;   // an old connection of this same phone does not count
  });
  function holder(n) {
    return others.find(function (g) {
      return g.slot === n;
    });
  }
  if (wanted >= 1 && wanted <= SLOTS.length) {
    const h = holder(wanted);
    if (!h) return wanted;
    if (me.slot === wanted && String(h.key) > String(me.key)) return wanted;
  }
  for (let n = 1; n <= SLOTS.length; n++) {
    if (!holder(n)) return n;
  }
  return 0;
}

// a slot's colour at full strength, the way a phone screen shows it to a camera
function slotColour(slot) {
  colorMode(HSB, 360, 100, 100);
  const c = color(SLOTS[slot - 1].hue, 100, 100);
  colorMode(RGB, 255);
  return c;
}

// the floor, or null before a tracker has written it
function planFloor() {
  const r = shared.room;
  if (!r || !(r.w > 0) || !(r.d > 0)) return null;
  return { w: r.w, d: r.d, by: String(r.by || '') };
}

// everyone on the plan, as a list. each one has its id too
function planPeople() {
  const list = [];
  const people = shared.people;
  if (!people || typeof people !== 'object') return list;
  for (const id of Object.keys(people)) {
    const p = people[id];
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
    list.push({
      id: id,
      x: p.x,
      y: p.y,
      name: String(p.name || ''),
      hue: typeof p.hue === 'number' ? p.hue : -1,
      phone: String(p.phone || '')
    });
  }
  return list;
}

// how far apart two people on the plan are, in metres
function metresBetween(a, b) {
  return dist(a.x, a.y, b.x, b.y);
}

// what to call someone. a person with no phone has no name
function nameOf(p) {
  return p.name || 'no phone';
}

// a distance as words, like 1.4 m
function metresText(m) {
  return m.toFixed(1) + ' m';
}

// fit the floor into a box on the screen. view.s is how many pixels make a metre
function fitFloor(floor, x, y, w, h) {
  const s = min(w / floor.w, h / floor.d);
  return { x: x + (w - floor.w * s) / 2, y: y + (h - floor.d * s) / 2, s: s, w: floor.w, d: floor.d };
}

// from metres on the floor to pixels on the screen, and back
function toScreen(view, p) {
  return { x: view.x + p.x * view.s, y: view.y + p.y * view.s };
}
function toFloor(view, sx, sy) {
  return { x: (sx - view.x) / view.s, y: (sy - view.y) / view.s };
}

// a colour from a hue. -1 is grey
function hueColour(hue, alpha = 255) {
  if (hue < 0) return color(150, alpha);
  colorMode(HSB, 360, 100, 100, 255);
  const c = color(hue, 70, 100, alpha);
  colorMode(RGB, 255);
  return c;
}

// the floor: a dark rectangle with a line every metre, and the metres along the top
function drawFloor(view, k) {
  const right = view.x + view.w * view.s;
  const bottom = view.y + view.d * view.s;
  push();
  noStroke();
  fill(30);
  rect(view.x, view.y, view.w * view.s, view.d * view.s);
  stroke(52);
  strokeWeight(1);
  for (let m = 1; m < view.w; m++) line(view.x + m * view.s, view.y, view.x + m * view.s, bottom);
  for (let m = 1; m < view.d; m++) line(view.x, view.y + m * view.s, right, view.y + m * view.s);
  noFill();
  stroke(110);
  strokeWeight(2);
  rect(view.x, view.y, view.w * view.s, view.d * view.s);
  noStroke();
  fill(130);
  textSize(12 * k);
  textAlign(CENTER, BOTTOM);
  for (let m = 0; m <= view.w; m++) text(m === 0 ? '0 m' : String(m), view.x + m * view.s, view.y - 4 * k);
  pop();
}

// one person: a dot in their colour with their name under it.
// look.ring draws a white ring (you, or the chosen dot). look.away draws a broken ring
function drawPerson(view, p, k, look = {}) {
  const s = toScreen(view, p);
  const size = max(0.4 * view.s, 22 * k);   // a person is about 0.4 m across
  push();
  noStroke();
  fill(hueColour(p.hue, look.away ? 120 : 255));
  circle(s.x, s.y, size);
  if (look.ring) {
    noFill();
    stroke(255);
    strokeWeight(3 * k);
    circle(s.x, s.y, size + 8 * k);
  }
  if (look.away) {
    noFill();
    stroke(200);
    strokeWeight(2 * k);
    drawingContext.setLineDash([4 * k, 4 * k]);
    circle(s.x, s.y, size + 8 * k);
    drawingContext.setLineDash([]);
  }
  noStroke();
  fill(look.away ? 150 : 255);
  textSize(14 * k);
  textAlign(CENTER, TOP);
  text(nameOf(p) + (look.away ? ' (phone away)' : ''), s.x, s.y + size / 2 + 6 * k);
  pop();
}

// a line between two people. draw it before the people, so they sit on top of it
function drawGap(view, a, b, k) {
  const sa = toScreen(view, a);
  const sb = toScreen(view, b);
  push();
  stroke(255, 200, 0);
  strokeWeight(2 * k);
  line(sa.x, sa.y, sb.x, sb.y);
  pop();
}

// how far apart two people are, on a dark tag halfway between them. draw it after the people
function drawGapWords(view, a, b, k) {
  const sa = toScreen(view, a);
  const sb = toScreen(view, b);
  const words = metresText(metresBetween(a, b));
  push();
  textSize(13 * k);
  const w = textWidth(words) + 10 * k;
  noStroke();
  fill(20, 220);
  rect((sa.x + sb.x) / 2 - w / 2, (sa.y + sb.y) / 2 - 10 * k, w, 20 * k, 4 * k);
  fill(255, 200, 0);
  textAlign(CENTER, CENTER);
  text(words, (sa.x + sb.x) / 2, (sa.y + sb.y) / 2);
  pop();
}
