// 03 · Trails That Stay
// Class 6's Tilt to Trail, with a memory. The phone is a brush. Tilt it and the mark rolls
// across the screen, and fades, as before. That fading is a memory too, but it only lasts
// a few seconds and it is gone on reload.
// Now the phone also keeps the path the brush took on each visit. Open the page again and
// your earlier paths are there, faint, under the new one. The oldest is the faintest.
// The live trail is on a layer of its own, and it fades to see-through instead of to dark,
// so the earlier paths always show under it.
//
// What is kept is a list of visits. Each visit is an object: when it started, and its points.
//   [ { t: 1762094040123, points: [[0.512, 0.334], [0.518, 0.341], ...] }, ... ]
// A point is x and y from 0 to 1, so a path fits any screen.
// The list becomes one line of text with JSON.stringify, as in 02 How Long Since.
//
// The retention rule: the last 8 visits are kept. A new visit pushes out the oldest.
// Like the other sketches, the memory is on this phone, in this browser, and nowhere else.

const KEY = 'class14-trails-that-stay'; // the name it is kept under. start it with your project's name

// the feel of the piece. change these before you change anything else.
let fade = 12;         // how fast the live trail forgets. 0 never forgets, 255 forgets at once
let speed = 0.4;       // how far a full tilt pushes the brush each frame
let friction = 0.96;   // 1 rolls forever, 0.8 stops quickly
let thinnest = 2;      // line weight when the brush is slow
let thickest = 28;     // line weight when it is fast
let maxVisits = 8;     // the retention rule: how many visits are kept
let maxPoints = 400;   // points kept for one visit. the newest are kept, the oldest go
let everyFrames = 4;   // keep a point every 4 frames, not every frame

let x, y;              // where the brush is
let px, py;            // where it was last frame
let vx = 0;            // how fast it is moving
let vy = 0;
let restX = null;      // the forward tilt that counts as level. set by the first reading
let lastMoved = 0;     // when the brush last moved, in milliseconds

let past = [];         // earlier visits, oldest first. read once in setup()
let visit;             // this visit: { t, points }
let ghosts;            // the earlier paths, drawn once into a layer of their own
let live;              // the live trail, on a layer that fades to see-through
let changed = false;   // has this visit got new points since the last save?
let topHeight = 78;    // the labels at the top
let barHeight = 56;    // the forget bar at the bottom

// a laptop has no motion sensors. this turns true when the first real reading arrives.
let motionArrived = false;
window.addEventListener('devicemotion', function (event) {
  let g = event.accelerationIncludingGravity;
  if (g && g.x !== null) {
    motionArrived = true;
  }
});

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableGyroTap('Tap to turn on motion');
  angleMode(DEGREES);
  colorMode(HSB, 360, 100, 100, 255);
  makeLive();

  x = width / 2;
  y = height / 2;
  px = x;
  py = y;

  // what did earlier visits leave? keep room for this one: the oldest go first
  past = loadVisits();
  while (past.length > maxVisits - 1) {
    past.shift();
  }
  visit = { t: Date.now(), points: [] };
  drawGhosts();
}

function draw() {
  // 1. the veil: erase a little of the live trail each frame, so it fades to see-through
  live.noStroke();
  live.erase(fade);
  live.rect(0, 0, width, height);
  live.noErase();

  // 2. the background, then the earlier visits. they never fade
  background(0, 0, 8);
  image(ghosts, 0, 0);

  // 3. read the tilt as a push. the fallback: a finger pulls the brush toward it.
  let pushX = 0;
  let pushY = 0;
  if (window.sensorsEnabled && motionArrived) {
    // however you are holding the phone when motion turns on counts as level
    if (restX === null) {
      restX = rotationX;
    }
    pushX = constrain(rotationY, -45, 45) / 45;
    pushY = constrain(rotationX - restX, -45, 45) / 45;
  }
  if (mouseIsPressed && mouseY > topHeight && mouseY < height - barHeight) {
    pushX = constrain((mouseX - x) / 200, -1, 1);
    pushY = constrain((mouseY - y) / 200, -1, 1);
  }

  // 4. the push changes the speed, friction takes some away, the speed moves the brush
  vx = (vx + pushX * speed) * friction;
  vy = (vy + pushY * speed) * friction;
  px = x;
  py = y;
  x = constrain(x + vx, 0, width);
  y = constrain(y + vy, topHeight, height - barHeight);

  // 5. the mark: faster is thicker, and the colour turns with the direction of travel
  let fast = dist(px, py, x, y);
  live.stroke(atan2(vy, vx) + 180, 70, 100);
  live.strokeWeight(map(fast, 0, 15, thinnest, thickest, true));
  live.line(px, py, x, y);
  // erasing a little at a time leaves a faint smear behind. once the brush has rested
  // for two seconds, the trail has faded anyway, so wipe the layer clean
  if (fast > 0.5) {
    lastMoved = millis();
  } else if (millis() - lastMoved > 2000) {
    live.clear();
  }
  image(live, 0, 0);

  // 6. remember where the brush is, every few frames, but only when it has moved
  if (frameCount % everyFrames === 0 && fast > 0.5) {
    visit.points.push([round(x / width, 3), round(y / height, 3)]);
    if (visit.points.length > maxPoints) {
      visit.points.shift();
    }
    changed = true;
  }
  // and write it down once a second, not every frame
  if (changed && frameCount % 60 === 0) {
    saveVisits();
  }

  drawLabels();
}

// the label sits on a dark band so the trail never hides it, and the forget bar at the bottom
function drawLabels() {
  noStroke();
  fill(0, 0, 8);
  rect(0, 0, width, topHeight);
  fill(0, 0, 100);
  textSize(15);
  if (!window.sensorsEnabled) {
    text('tap to turn on motion', 16, 26);
  } else if (!motionArrived) {
    text('no motion here. hold a finger down to steer', 16, 26);
  } else {
    text('tilt to draw. then reload the page', 16, 26);
  }
  fill(45, 100, 100);
  textSize(13);
  if (past.length === 0) {
    text('this phone remembers no earlier visits yet', 16, 48);
  } else {
    text('this phone remembers ' + past.length + ' earlier ' + (past.length === 1 ? 'visit' : 'visits') +
      ' · the oldest ' + howLong(Date.now() - past[0].t) + ' ago', 16, 48);
    text('kept as ' + nf(storedLength() / 1000, 1, 1) + ' KB of text', 16, 66);
  }

  fill(0, 0, 18);
  rect(0, height - barHeight, width, barHeight);
  fill(0, 0, 80);
  textSize(15);
  text('forget · tap here and this phone forgets every visit', 16, height - barHeight + 33);
}

// a new, empty layer for the live trail
function makeLive() {
  live = createGraphics(width, height);
  live.colorMode(HSB, 360, 100, 100, 255);
}

// draw the earlier visits once, into their own layer. the oldest is the faintest
function drawGhosts() {
  ghosts = createGraphics(width, height);
  ghosts.colorMode(HSB, 360, 100, 100, 255);
  ghosts.noFill();
  ghosts.strokeWeight(2);
  for (let i = 0; i < past.length; i++) {
    let points = past[i].points;
    let age = past.length - 1 - i; // 0 for the last visit, more for older ones
    ghosts.stroke(0, 0, 100, map(age, 0, maxVisits - 1, 150, 35)); // older is fainter
    ghosts.beginShape();
    for (let j = 0; j < points.length; j++) {
      ghosts.vertex(points[j][0] * width, points[j][1] * height);
    }
    ghosts.endShape();
  }
}

// read the list of visits. text in, objects out
function loadVisits() {
  try {
    let saved = localStorage.getItem(KEY);
    if (saved === null) {
      return [];
    }
    return JSON.parse(saved);
  } catch (e) {
    return []; // storage is blocked, or the text was not JSON
  }
}

// write the earlier visits and this one as one line of text
function saveVisits() {
  let all = past.slice(); // a copy, so this visit is not added to past twice
  if (visit.points.length > 0) {
    all.push(visit);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) { }
  changed = false;
}

// how many characters of text are kept
function storedLength() {
  try {
    let saved = localStorage.getItem(KEY);
    return saved === null ? 0 : saved.length;
  } catch (e) {
    return 0;
  }
}

// how long a number of milliseconds is, in words: '3 minutes', '1 day'
function howLong(ms) {
  let seconds = floor(ms / 1000);
  if (seconds < 60) {
    return seconds + 's';
  }
  let minutes = floor(seconds / 60);
  if (minutes < 60) {
    return minutes + ' min';
  }
  let hours = floor(minutes / 60);
  if (hours < 24) {
    return hours + ' h';
  }
  return floor(hours / 24) + ' days';
}

function mousePressed() {
  // a tap on the bar: forget every visit, this one too
  if (mouseY > height - barHeight) {
    try {
      localStorage.removeItem(KEY);
    } catch (e) { }
    past = [];
    visit = { t: Date.now(), points: [] };
    changed = false;
    drawGhosts();
    makeLive();
  }
  return false;
}

// leaving the page: write down the last few points
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden' && visit && changed) {
    saveVisits();
  }
});

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeLive();
  drawGhosts();
}
