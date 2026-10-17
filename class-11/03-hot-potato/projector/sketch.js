// 03 Hot Potato: Projector
// Share. One potato, one phone at a time. The phone that holds it shakes to throw it. This
// page picks a random other phone to catch it. If the time runs out, the holder is burned,
// and a new round starts. Each throw takes a little time off the clock.
//
// The rule: Share keeps only the last thing written, so this page is the only one that writes
// shared, and a phone only sends an event when it throws.
//
// The clock: this page keeps the time. It tells the holder how many milliseconds are left,
// and the holder's phone counts down from there. No phone clock is ever compared with
// another clock.
//
// Run this on the laptop that is on the projector, and open only one projector page for a room.
// Keep it on the screen. The game runs in draw(), and a browser tab that is hidden stops it.
// Phones join with the code on the right.
//
// Try this:
//   Throw as soon as you get it. Then hold it as long as you dare.
//   Close one phone's page while it holds the potato. This page gives the potato to someone else.
//   Keys: R starts a new round, C clears the list of who got burned.
//
// Key data:
//   shared.round   { state, holder, msLeft, turn, burnedId, burnedName }
//                  state is 'waiting', 'play' or 'burned'. holder is a phone id
//   shared.burns   how many times each name has been burned
//   shareEvent('throw', { id })   a phone says it threw. this page checks it was the holder

const ROOM = 'hot-potato';

// the feel of the piece. change these before you change anything else.
let startSeconds = 10;   // how long the first holder has
let shortest = 4;        // the shortest time anyone gets
let shrink = 0.5;        // each throw takes this many seconds off
let burnedPause = 3.5;   // how long the page shows who got burned, in seconds

let state = 'waiting';   // 'waiting' for two phones, 'play', or 'burned'
let holder = '';         // the id of the phone that has the potato
let turn = 0;            // throws since the last burn
let deadlineAt = 0;      // when the time runs out, on this page's clock
let burnedId = '';
let burnedName = '';
let burnedAt = 0;
let burns = {};          // name to how many times that name was burned
let seats = [];          // phone ids in the order they joined. they sit round a ring
let flight = null;       // { from, to, at } a potato in the air

function setup() {
  createCanvas(windowWidth, windowHeight);
  projectorSetup(ROOM, '03 Hot Potato', { round: { state: 'waiting', holder: '', msLeft: 0, turn: 0 }, burns: {} });
  layoutProjector();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutProjector();
  showJoinCode();
}

// this runs each time the page joins the room, and again if it has to join again
function shareReady() {
  if (state !== 'waiting') {
    // this page was running and joined again. the room has the old round, so say where it is now
    shared.burns = burns;
    publish();
    return;
  }
  // the room may be mid game, if this page was reloaded. keep the holder and the list
  const r = shared.round;
  if (shared.burns && typeof shared.burns === 'object') {
    burns = JSON.parse(JSON.stringify(shared.burns));
  }
  if (r && r.state === 'play' && r.holder) {
    state = 'play';
    holder = r.holder;
    turn = r.turn || 0;
    deadlineAt = millis() + (r.msLeft || holdSeconds() * 1000);
  } else {
    publish();
  }
}

function draw() {
  background(20);
  keepSeats();
  runTheGame();

  drawTitle('Shake your phone to throw the potato. Do not be holding it when time runs out.');
  drawRing();
  drawCentre();
  drawBurned();
  drawJoinColumn('THROWS', turn);
}

// a phone sends one event when it throws. this page checks it and decides
function shareEvent(name, data) {
  if (name !== 'throw' || state !== 'play' || !data || data.id !== holder) {
    return;
  }
  const others = phoneList().filter(function (g) {
    return g.id !== holder;
  });
  if (others.length === 0) {
    return;
  }
  const to = random(others).id;
  flight = { from: holder, to: to, at: millis() };
  turn += 1;
  passTo(to);
}

// the whole game, once a frame. 1. wait for two phones. 2. watch the clock. 3. start again.
function runTheGame() {
  if (!shareConnected) {
    return;
  }
  const phones = phoneList();
  if (state === 'waiting') {
    if (phones.length >= 2) {
      startRound();
    }
  } else if (state === 'play') {
    const holderHere = phones.some(function (g) {
      return g.id === holder;
    });
    if (phones.length < 2) {
      state = 'waiting';
      holder = '';
      publish();
    } else if (!holderHere) {
      // the holder left. someone else gets the potato, with a full clock
      const others = phones.filter(function (g) {
        return g.id !== holder;
      });
      passTo(random(others).id);
    } else if (millis() >= deadlineAt) {
      burn();
    }
  } else if (state === 'burned') {
    if (millis() - burnedAt > burnedPause * 1000) {
      state = 'waiting';
      publish();
    }
  }
}

// each throw takes time off the clock, down to a shortest time
function holdSeconds() {
  return max(shortest, startSeconds - turn * shrink);
}

function startRound() {
  turn = 0;
  const phones = phoneList();
  passTo(random(phones).id);
}

function passTo(id) {
  state = 'play';
  holder = id;
  deadlineAt = millis() + holdSeconds() * 1000;
  publish();
}

function burn() {
  state = 'burned';
  burnedId = holder;
  burnedName = nameOf(holder);
  burnedAt = millis();
  burns[burnedName] = (burns[burnedName] || 0) + 1;
  shared.burns = burns;
  holder = '';
  publish();
}

// the whole round goes in shared as one object, so a phone never sees half of a change
function publish() {
  if (!shareConnected) {
    return;
  }
  shared.round = {
    state: state,
    holder: holder,
    msLeft: state === 'play' ? round(max(0, deadlineAt - millis())) : 0,
    turn: turn,
    burnedId: state === 'burned' ? burnedId : '',
    burnedName: state === 'burned' ? burnedName : ''
  };
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    turn = 0;
    state = 'waiting';
    holder = '';
    publish();
  }
  if (key === 'c' || key === 'C') {
    burns = {};
    if (shareConnected) {
      shared.burns = {};
    }
  }
}

// ---- drawing ----

// phones sit round a ring in the order they joined
function keepSeats() {
  const here = phoneList().map(function (g) {
    return g.id;
  });
  seats = seats.filter(function (id) {
    return here.indexOf(id) >= 0;
  });
  here.forEach(function (id) {
    if (seats.indexOf(id) < 0) {
      seats.push(id);
    }
  });
}

function ringCentre() {
  return {
    x: arena.x + arena.w * 0.5,
    y: arena.y + arena.h * 0.5,
    r: min(arena.w, arena.h) * 0.4
  };
}

function seatPosition(id) {
  const c = ringCentre();
  const i = seats.indexOf(id);
  const a = -HALF_PI + (i / max(1, seats.length)) * TWO_PI;
  return { x: c.x + cos(a) * c.r, y: c.y + sin(a) * c.r, angle: a };
}

function drawRing() {
  const c = ringCentre();
  const n = seats.length;
  noFill();
  stroke(40);
  strokeWeight(3 * u);
  circle(c.x, c.y, c.r * 2);

  const d = constrain((TWO_PI * c.r / max(n, 1)) * 0.6, 24 * u, 90 * u);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < n; i++) {
    const id = seats[i];
    const p = seatPosition(id);
    const isHolder = state === 'play' && id === holder && !(flight && flight.to === id && millis() - flight.at < 350);
    const isBurned = state === 'burned' && id === burnedId;
    noStroke();
    if (isBurned) {
      fill(255, 90, 77);
    } else if (isHolder) {
      fill(255, 200, 0);
    } else {
      fill(70);
    }
    circle(p.x, p.y, d);

    // the name sits outside the ring
    const lx = p.x + cos(p.angle) * (d * 0.5 + 30 * u);
    const ly = p.y + sin(p.angle) * (d * 0.5 + 20 * u);
    fill(isHolder || isBurned ? 255 : 150);
    textSize((isHolder ? 34 : 24) * u);
    textStyle(isHolder ? BOLD : NORMAL);
    textAlign(cos(p.angle) > 0.3 ? LEFT : (cos(p.angle) < -0.3 ? RIGHT : CENTER), CENTER);
    text(nameOf(id), lx, ly);
    textStyle(NORMAL);
  }

  // the potato at the holder's seat, or in the air between two seats
  if (state === 'play' && seats.indexOf(holder) >= 0) {
    let pos = seatPosition(holder);
    if (flight && flight.to === holder && millis() - flight.at < 350 && seats.indexOf(flight.from) >= 0) {
      const t = (millis() - flight.at) / 350;
      const a = seatPosition(flight.from);
      pos = { x: lerp(a.x, pos.x, t), y: lerp(a.y, pos.y, t) - sin(t * PI) * 90 * u };
    }
    const left = max(0, (deadlineAt - millis()) / 1000);
    const wobble = left < 2 ? sin(millis() / 40) * 4 * u : 0;
    drawPotato(pos.x + wobble, pos.y, 1.3 * d, 1 - constrain(left / holdSeconds(), 0, 1));
  }
  textAlign(LEFT, BASELINE);
}

// a potato: a lumpy oval with a few dark eyes. heat is 0 for cool, 1 for about to burn
function drawPotato(x, y, size, heat) {
  push();
  translate(x, y);
  rotate(-0.4);
  noStroke();
  fill(lerpColor(color('#c99a5b'), color('#e8472f'), heat));
  ellipse(0, 0, size * 1.25, size * 0.9);
  ellipse(-size * 0.2, size * 0.05, size * 0.8, size * 0.85);
  fill(0, 0, 0, 70);
  ellipse(-size * 0.2, -size * 0.08, size * 0.12, size * 0.08);
  ellipse(size * 0.15, size * 0.12, size * 0.1, size * 0.07);
  ellipse(size * 0.3, -size * 0.1, size * 0.09, size * 0.06);
  pop();
}

function drawCentre() {
  const c = ringCentre();
  noStroke();
  textAlign(CENTER, CENTER);
  if (state === 'waiting') {
    fill(255);
    textSize(52 * u);
    const n = phoneList().length;
    let words = n < 2 ? 'Waiting for two phones.\nScan the code to join.' : 'New round';
    if (serverProblem) {
      words = 'No server yet';
    }
    text(words, c.x, c.y);
  } else if (state === 'play') {
    const left = max(0, (deadlineAt - millis()) / 1000);
    fitText(nameOf(holder), 130 * u, c.r * 1.5);
    fill(255);
    textStyle(BOLD);
    text(nameOf(holder), c.x, c.y - 70 * u);
    textStyle(NORMAL);
    fill(GREY);
    textSize(36 * u);
    text('has the potato', c.x, c.y + 10 * u);
    fill(left < 2 ? color(255, 90, 77) : color(AMBER));
    textStyle(BOLD);
    textSize(120 * u);
    text(left.toFixed(1), c.x, c.y + 120 * u);
    textStyle(NORMAL);
  } else {
    fill(255, 90, 77);
    textStyle(BOLD);
    textSize(120 * u);
    text('BURNED', c.x, c.y - 60 * u);
    fitText(burnedName, 100 * u, c.r * 1.5);
    fill(255);
    text(burnedName, c.x, c.y + 60 * u);
    textStyle(NORMAL);
    fill(GREY);
    textSize(32 * u);
    text('New round soon', c.x, c.y + 140 * u);
  }
  textAlign(LEFT, BASELINE);
}

// set the text size as big as can be, but no wider than w
function fitText(str, biggest, w) {
  textStyle(BOLD);
  let size = biggest;
  textSize(size);
  while (textWidth(str) > w && size > 20) {
    size -= 4;
    textSize(size);
  }
  textStyle(NORMAL);
}

// the list of who has been burned, in the left margin
function drawBurned() {
  const names = Object.keys(burns).sort(function (a, b) {
    return burns[b] - burns[a];
  });
  noStroke();
  textAlign(LEFT, BASELINE);
  fill(GREY);
  textSize(26 * u);
  text('BURNED', arena.x + 8 * u, arena.y + 36 * u);
  textSize(34 * u);
  fill(names.length ? 255 : GREY);
  if (names.length === 0) {
    text('Nobody yet', arena.x + 8 * u, arena.y + 80 * u);
  }
  for (let i = 0; i < min(names.length, 9); i++) {
    text(names[i] + '   ' + burns[names[i]], arena.x + 8 * u, arena.y + (80 + i * 42) * u);
  }
}
