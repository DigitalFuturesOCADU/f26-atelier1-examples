// 01 Crowd Tilt: Projector
// Share. Every phone in the room is a tilt sensor, and this page adds them all up.
// One ball rolls on the class's average tilt. Get it into the ring and hold it there
// for 2 seconds. Nobody can do it alone. If half the room tilts left and half tilts
// right, the ball does not move.
//
// The rule: Share keeps only the last thing written, so each phone keeps its own tilt in me,
// this page adds them up, and this page is the only one that writes shared.
//
// Run this on the laptop that is on the projector, and open only one projector page for a room.
// Phones join with the code on the right.
//
// Try this:
//   Tilt one phone. A faint line from the ball is your part. Its colour is the colour of
//   the dot on your phone. The small circle in the corner shows every phone as a dot.
//   Tilt every phone the same way. The big amber arrow is the average.
//   Keys: N is a new ring, R starts again.
//
// Key data:
//   guests[i].x and guests[i].y  one phone's tilt, from -1 to 1. x is left to right.
//                                y is top to bottom, like the screen
//   classAverage                 { x, y, n } the average of all the phones. n is how many
//   shared.average               the same thing, for any page that wants to read it
//   shared.hits                  how many times the class has got it
//   shareEmit('hit')             tells every phone, so they can buzz

const ROOM = 'crowd-tilt';

// the feel of the piece. change these before you change anything else.
let pull = 1.0;         // how hard a full tilt pulls the ball
let drag = 1.5;         // how fast the ball slows down. bigger is heavier
let bounce = 0.35;      // how much speed the ball keeps when it hits a wall, from 0 to 1
let holdSeconds = 2;    // how long the class must hold the ball in the ring
let ringSize = 0.1;     // the size of the ring, as a share of the shorter side of the space

// the average tilt of the whole class. other pages read this
let classAverage = { x: 0, y: 0, n: 0 };

// the ball and the ring. every position is in units of the shorter side of the space
let ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
let ring = { x: 0.3, y: 0.3 };
let holdTimer = 0;      // seconds the ball has been inside the ring
let celebrate = 0;      // counts down while GOT IT is on screen
let hits = 0;
let joinedBefore = false; // true once this page has been in the room
let sentAverage = { x: 99, y: 99, n: -1 };
let sentAt = 0;
let trail = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  // join the room as the projector. the page address can carry ?shareHost= and ?room=
  projectorSetup(ROOM, '01 Crowd Tilt', { hits: 0 });
  layoutProjector();
  newRing();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutProjector();
  showJoinCode();
}

// this runs each time the page joins the room, and again if it has to join again
function shareReady() {
  // a page that was just opened takes the score the room already has, if it was reloaded.
  // a page that was running and joined again knows the score better than the room does
  if (!joinedBefore && typeof shared.hits === 'number') {
    hits = shared.hits;
  }
  joinedBefore = true;
  shared.hits = hits;
  shared.average = { x: 0, y: 0, n: 0 };
}

function draw() {
  const dt = min(deltaTime / 1000, 0.05);
  background(20);

  addUpTheClass();
  rollTheBall(dt);
  checkTheRing(dt);
  shareTheAverage();

  drawTitle('Tilt your phone together. Roll the ball into the ring and hold it there.');
  drawArena();
  drawTiltMap();
  drawRing();
  drawPulls();
  drawBall();
  drawGotIt();
  drawJoinColumn('GOT IT', hits);
}

// 1. read every phone. 2. average them. 3. keep the answer where other pages can see it.
function addUpTheClass() {
  const phones = phoneList();
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < phones.length; i++) {
    sx += phones[i].x || 0;
    sy += phones[i].y || 0;
  }
  // a phone that has not tilted yet still counts. the class is everyone who joined
  const n = phones.length;
  classAverage = { x: 0, y: 0, n: n };
  if (n > 0) {
    classAverage.x = sx / n;
    classAverage.y = sy / n;
  }
  window.classAverage = classAverage;
}

// the ball rolls downhill on a tray that the whole class is tilting
function rollTheBall(dt) {
  const aw = arena.w / min(arena.w, arena.h); // the space is wider than it is tall
  const ah = arena.h / min(arena.w, arena.h);
  const r = 0.04;

  ball.vx += classAverage.x * pull * dt;
  ball.vy += classAverage.y * pull * dt;
  const slow = exp(-drag * dt);
  ball.vx *= slow;
  ball.vy *= slow;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x < r) {
    ball.x = r;
    ball.vx = abs(ball.vx) * bounce;
  }
  if (ball.x > aw - r) {
    ball.x = aw - r;
    ball.vx = -abs(ball.vx) * bounce;
  }
  if (ball.y < r) {
    ball.y = r;
    ball.vy = abs(ball.vy) * bounce;
  }
  if (ball.y > ah - r) {
    ball.y = ah - r;
    ball.vy = -abs(ball.vy) * bounce;
  }

  trail.push({ x: ball.x, y: ball.y });
  if (trail.length > 40) {
    trail.shift();
  }
}

// the whole ball must be inside the ring. if it slips out, the timer runs backwards
function checkTheRing(dt) {
  if (celebrate > 0) {
    celebrate -= dt;
    if (celebrate <= 0) {
      newRing();
    }
    return;
  }
  const inside = dist(ball.x, ball.y, ring.x, ring.y) + 0.04 <= ringSize;
  if (inside && classAverage.n > 0) {
    holdTimer += dt;
  } else {
    holdTimer = max(0, holdTimer - dt * 2);
  }
  if (holdTimer >= holdSeconds) {
    hits += 1;
    celebrate = 2;
    holdTimer = 0;
    if (shareConnected) {
      shared.hits = hits;
      shareEmit('hit', { hits: hits });
    }
  }
}

function newRing() {
  const aw = arena.w / min(arena.w, arena.h);
  const ah = arena.h / min(arena.w, arena.h);
  for (let tries = 0; tries < 30; tries++) {
    ring.x = random(0.2, aw - 0.2);
    ring.y = random(0.2, ah - 0.2);
    // not near the ball, and not in the corner where the tilt map sits
    if (dist(ring.x, ring.y, ball.x, ball.y) > 0.4 && dist(ring.x, ring.y, 0.15, ah - 0.15) > 0.35) {
      break;
    }
  }
  holdTimer = 0;
}

// this page is the only one that writes shared. about five times a second, and only when it changed
function shareTheAverage() {
  if (!shareConnected || millis() - sentAt < 200) {
    return;
  }
  const changed = abs(classAverage.x - sentAverage.x) > 0.02 ||
    abs(classAverage.y - sentAverage.y) > 0.02 ||
    classAverage.n !== sentAverage.n;
  if (changed) {
    shared.average = {
      x: round(classAverage.x * 100) / 100,
      y: round(classAverage.y * 100) / 100,
      n: classAverage.n
    };
    sentAverage = { x: classAverage.x, y: classAverage.y, n: classAverage.n };
    sentAt = millis();
  }
}

// ---- drawing ----

// space units to pixels
function px(x) {
  return arena.x + x * min(arena.w, arena.h);
}
function py(y) {
  return arena.y + y * min(arena.w, arena.h);
}
function unit() {
  return min(arena.w, arena.h);
}

function drawArena() {
  noFill();
  stroke(60);
  strokeWeight(3 * u);
  rect(arena.x, arena.y, arena.w, arena.h);
  stroke(34);
  strokeWeight(2 * u);
  line(arena.x + arena.w / 2, arena.y, arena.x + arena.w / 2, arena.y + arena.h);
  line(arena.x, arena.y + arena.h / 2, arena.x + arena.w, arena.y + arena.h / 2);
}

// a small copy of every phone's pad, so each person can find their own dot. the ring is the average
function drawTiltMap() {
  const r = 0.11 * unit();
  const cx = arena.x + r + 0.04 * unit();
  const cy = arena.y + arena.h - r - 0.04 * unit();
  noStroke();
  fill(20, 20, 20, 200);
  circle(cx, cy, r * 2 + 12 * u);
  noFill();
  stroke(70);
  strokeWeight(3 * u);
  circle(cx, cy, r * 2);
  stroke(45);
  strokeWeight(2 * u);
  line(cx - r, cy, cx + r, cy);
  line(cx, cy - r, cx, cy + r);
  const phones = phoneList();
  noStroke();
  for (let i = 0; i < phones.length; i++) {
    fill(color('hsla(' + (phones[i].hue || 0) + ', 85%, 65%, 0.8)'));
    circle(cx + (phones[i].x || 0) * r, cy + (phones[i].y || 0) * r, 0.03 * unit());
  }
  if (classAverage.n > 0) {
    noFill();
    stroke(255, 200, 0);
    strokeWeight(4 * u);
    circle(cx + classAverage.x * r, cy + classAverage.y * r, 0.05 * unit());
  }
  noStroke();
  fill(GREY);
  textAlign(CENTER, BASELINE);
  textSize(20 * u);
  text('Each dot is a phone', cx, cy - r - 12 * u);
  textAlign(LEFT, BASELINE);
}

function drawRing() {
  const cx = px(ring.x);
  const cy = py(ring.y);
  const d = ringSize * 2 * unit();
  const progress = holdTimer / holdSeconds;
  if (celebrate > 0) {
    // the ring opens out and fades
    const t = 1 - celebrate / 2;
    noFill();
    stroke(255, 200, 0, 255 * (1 - t));
    strokeWeight(8 * u);
    circle(cx, cy, d * (1 + t * 1.2));
    return;
  }
  noStroke();
  fill(255, 200, 0, 28 + progress * 60);
  circle(cx, cy, d);
  noFill();
  stroke(255, 200, 0, 140);
  strokeWeight(5 * u);
  circle(cx, cy, d);
  if (progress > 0) {
    stroke(255, 200, 0);
    strokeWeight(14 * u);
    arc(cx, cy, d + 24 * u, d + 24 * u, -HALF_PI, -HALF_PI + TWO_PI * progress);
  }
}

// every phone pulls on the ball. one faint line each, in the colour of its dot
function drawPulls() {
  // lines never leave the space
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(arena.x, arena.y, arena.w, arena.h);
  drawingContext.clip();
  const bx = px(ball.x);
  const by = py(ball.y);
  const len = 0.2 * unit();
  const phones = phoneList();
  strokeWeight(4 * u);
  for (let i = 0; i < phones.length; i++) {
    const g = phones[i];
    const c = color('hsla(' + (g.hue || 0) + ', 85%, 65%, 0.45)');
    stroke(c);
    const tx = bx + (g.x || 0) * len;
    const ty = by + (g.y || 0) * len;
    line(bx, by, tx, ty);
    noStroke();
    fill(c);
    circle(tx, ty, 14 * u);
    strokeWeight(4 * u);
  }

  // the class average, drawn at the same scale
  if (classAverage.n > 0) {
    const ax = classAverage.x * len;
    const ay = classAverage.y * len;
    const m = sqrt(ax * ax + ay * ay);
    if (m > 3 * u) {
      stroke(255, 200, 0);
      strokeWeight(8 * u);
      line(bx, by, bx + ax, by + ay);
      noStroke();
      fill(255, 200, 0);
      arrowHead(bx + ax, by + ay, atan2(ay, ax), 26 * u);
    }
  }
  drawingContext.restore();
}

function drawBall() {
  noStroke();
  for (let i = 0; i < trail.length; i++) {
    fill(255, 255, 255, (i / trail.length) * 40);
    circle(px(trail[i].x), py(trail[i].y), 0.06 * unit() * (i / trail.length));
  }
  fill(255);
  circle(px(ball.x), py(ball.y), 0.08 * unit());
}

function drawGotIt() {
  if (celebrate > 0) {
    fill(255, 200, 0, 255 * min(1, celebrate * 2));
    noStroke();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(180 * u);
    text('GOT IT', arena.x + arena.w / 2, arena.y + arena.h / 2);
    textStyle(NORMAL);
    textAlign(LEFT, BASELINE);
    return;
  }
  if (classAverage.n === 0 && !serverProblem) {
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(54 * u);
    text('Waiting for phones. Scan the code to join.', arena.x + arena.w / 2, arena.y + arena.h * 0.75);
    textAlign(LEFT, BASELINE);
  }
}

function keyPressed() {
  if (key === 'n' || key === 'N') {
    newRing();
  }
  if (key === 'r' || key === 'R') {
    ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    hits = 0;
    if (shareConnected) {
      shared.hits = 0;
    }
    newRing();
  }
}
