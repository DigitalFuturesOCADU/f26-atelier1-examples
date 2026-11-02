// 3 Colour Room
// Where People Are. A laptop camera looks at the room and finds the five colours. Each phone
// shows its colour, edge to edge, and its person holds it up to the camera. The colour says who.
// Where the colour is in the picture says where. This page writes the room plan, so every phone
// knows where everyone stands.
//
// Class 10's Color Tracking followed one colour. This follows five. Each pixel goes to the
// nearest of the five colours, and each colour takes its biggest patch. Class 10 averaged every
// matching pixel, so a red shirt across the room would pull the red phone's spot toward it.
// Here the biggest patch wins.
//
// The setup is most of the work. Do it in this order:
//   1 The floor. Tape the four corners of a rectangle on the floor. Measure it. Put it in
//     ROOM_W and ROOM_D, or add ?w=5&d=4 to the address.
//   2 The camera. Put the laptop up high at one end, tilted down, so it sees the whole floor.
//     Higher is better: people hide each other less.
//   3 The corners. Ask someone to stand on each taped corner and hold their phone at chest
//     height. Drag that corner of the yellow outline onto their phone. Now the outline maps
//     the picture to the floor, at the height people hold their phones.
//   4 The colours. Press 1 to 5, then click that colour in the picture. The camera's red is
//     never quite the phone's red, and the light in the room changes it again.
//   5 The light. Press M to see what the camera counts as each colour. If a phone shows white
//     in the middle, turn its brightness down. Keep coloured walls and windows out of the picture.
// This page keeps the corners and the colours on this laptop, so a reload does not undo the setup.
//
// Try this:
//   Join with two phones, using the code on the right. Hold them up and walk around. Each phone
//   shows how far the other one is. Open 1 The Room Plan's projector page to see everyone.
//   Hold up a coloured card instead of a phone. The camera puts it on the plan, with no phone.
//   Turn your back to the camera, phone in front of you. When does it lose you?
//
// Mouse:  drag a corner of the yellow outline      after 1 to 5, click that colour in the picture
// Keys:   1 to 5  pick a colour      M  what the camera counts as each colour
//         - and +  the tolerance      R twice  put the corners and colours back
//
// The camera picture stays on this laptop. Only the spots on the floor go to the room.
//
// Key data:
//   targets   the five colours as the camera sees them: [{ r, g, b }], one for each slot
//   corners   the floor's four corners in the picture: [{ x, y }], from 0 to 1 across and down
//   seen      what the camera found in the last frame: { [slot]: { x, y, size } }, from 0 to 1
//   people    the plan this page writes: { [name]: { x, y, name, hue, phone } }, in metres

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'room-plan';   // your room. the phones use the same one

// the feel of the piece. change these before you change anything else.
const ROOM_W = 6;           // the floor, across, in metres
const ROOM_D = 4;           // the floor, top to bottom, in metres
const TOLERANCE = 70;       // how far a pixel's colour can be from a target and still count
const MIN_SIZE = 20;        // the smallest patch that counts, in pixels of the scanned picture
const LOST_S = 1;           // a colour the camera has not seen for this long leaves the plan
const FOLLOW = 0.4;         // from 0 to 1: how far a spot moves toward each new sighting

// the longest side of the small copy of the picture that is scanned. smaller is faster and rougher
const SCAN_SIZE = 200;

let cam;
let floorSize;        // { w, d, by }: the floor this page writes to shared.room
let targets = [];     // the five colours as the camera sees them
let corners = [];     // the floor's corners in the picture: 0,0  w,0  w,d  0,d
let floorMap = null;   // the map from the picture to the floor
let pictureMap = null; // and back
let tolerance = TOLERANCE;
let seen = {};        // the biggest patch of each colour in the last frame
let spots = {};       // each colour on the floor, smoothed: { [slot]: { x, y, last } }
let people = {};      // the plan, as this page last wrote it
let picking = 0;      // the slot whose colour the next click picks
let showMask = false;
let maskImage = null;
let dragCorner = -1;
let resetPressed = 0;
let pic = null;       // where the picture is on the screen
let swatches = [];    // where each colour is drawn on the right, for the mouse
let labels = null;    // the colour of each scanned pixel: 0 for none, or a slot
let visited = null;
let queue = null;
let joinUrl = '';
let shortUrl = '';
let u = 1;            // one size unit. 1 is a 1280 by 720 screen
let qrSize = 150;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont('system-ui');
  sizeThePage();

  const q = new URLSearchParams(location.search);
  floorSize = { w: Number(q.get('w')) || ROOM_W, d: Number(q.get('d')) || ROOM_D, by: 'colour-room' };
  loadTheSetup();

  // the laptop's camera, not mirrored: left in the picture is left in the room, seen from the camera
  cam = createPhoneCamera('user', false, 'contain');
  enableCameraTap('Click to turn on the camera. Nothing is recorded.');

  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'room-plan',
    shared: { room: floorSize, people: {} },
    me: { role: 'tracker', by: 'colour-room' }
  });
  shareConnect().catch(function () {});   // a laptop needs no tap to join

  // the code takes a phone to this example's phone page, with the server and the room
  const phonePage = new URL('phone/', location.href);
  joinUrl = getShareJoinUrl(phonePage.href).replace(/%3A/gi, ':').replace(/%2F/gi, '/');
  shortUrl = phonePage.host + '\n' + phonePage.pathname;
  if (canShowCode()) showJoinCode();
}

function sizeThePage() {
  u = min(width / 1280, height / 720);
  qrSize = round(150 * u);
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

// this runs each time the page joins the room. The camera starts the plan fresh:
// it writes only what it sees
function shareReady() {
  shared.room = floorSize;
  shared.people = {};
  people = {};
}

// the phones in the room, in slot order
function phones() {
  return guestsWith('role', 'phone').filter(function (g) {
    return g.slot >= 1 && g.key;
  }).sort(function (a, b) {
    return a.slot - b.slot;
  });
}

function draw() {
  background(20);
  pic = placeThePicture();

  // the camera delivers 30 frames a second and draw() runs at 60, so scan only new frames
  if (isNewFrame(cam)) {
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) {
      seen = findColours(frame);
      followColours();
      if (showMask) makeMask(frame);
    }
  }
  forgetLostColours();
  writeThePlan();

  drawThePicture();
  drawTheFloorOnThePicture();
  drawTheColoursSeen();
  drawSide(pic.x + pic.w + 30 * u, width - pic.x - pic.w - 50 * u);
  drawCameraOn(cam);
}

// ---- finding the colours ----

// one pass over the scanned picture: each pixel goes to the nearest target, if it is near enough.
// then the biggest patch of each colour
function findColours(frame) {
  const data = frame.imageData.data;
  const w = frame.width;
  const h = frame.height;
  const n = w * h;
  if (!labels || labels.length !== n) {
    labels = new Uint8Array(n);
    visited = new Uint8Array(n);
    queue = new Int32Array(n);
  }
  const limit = tolerance * tolerance;
  for (let i = 0; i < n; i++) {
    let best = 0;
    let bestDistance = limit;
    for (let s = 0; s < targets.length; s++) {
      const dr = data[i * 4] - targets[s].r;
      const dg = data[i * 4 + 1] - targets[s].g;
      const db = data[i * 4 + 2] - targets[s].b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDistance) {
        bestDistance = d;
        best = s + 1;
      }
    }
    labels[i] = best;
  }

  // a patch: start at a pixel with a colour, then spread to its neighbours of the same colour
  visited.fill(0);
  const found = {};
  for (let i = 0; i < n; i++) {
    const slot = labels[i];
    if (slot === 0 || visited[i]) continue;
    let head = 0;
    let tail = 0;
    let sumX = 0;
    let sumY = 0;
    queue[tail++] = i;
    visited[i] = 1;
    while (head < tail) {
      const j = queue[head++];
      const x = j % w;
      const y = (j - x) / w;
      sumX += x;
      sumY += y;
      for (const next of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]) {
        if (next >= 0 && !visited[next] && labels[next] === slot) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    if (tail >= MIN_SIZE && (!found[slot] || tail > found[slot].size)) {
      found[slot] = { x: (sumX / tail + 0.5) / w, y: (sumY / tail + 0.5) / h, size: tail };
    }
  }
  return found;
}

// each colour the camera sees becomes a spot on the floor. A new sighting moves the spot
// part of the way, so it does not shake
function followColours() {
  if (!floorMap) return;
  for (const slot of Object.keys(seen)) {
    const p = applyMap(floorMap, seen[slot]);
    // well off the floor is someone outside the tape, or something that is not a person
    if (p.x < -0.5 || p.y < -0.5 || p.x > floorSize.w + 0.5 || p.y > floorSize.d + 0.5) continue;
    p.x = constrain(p.x, 0, floorSize.w);
    p.y = constrain(p.y, 0, floorSize.d);
    const spot = spots[slot];
    if (spot) {
      spot.x = lerp(spot.x, p.x, FOLLOW);
      spot.y = lerp(spot.y, p.y, FOLLOW);
      spot.last = millis();
    } else {
      spots[slot] = { x: p.x, y: p.y, last: millis() };
    }
  }
}

function forgetLostColours() {
  for (const slot of Object.keys(spots)) {
    if (millis() - spots[slot].last > LOST_S * 1000) delete spots[slot];
  }
}

// the plan: one person for each colour on the floor. A phone with that slot puts its name and key
// on it. A colour with no phone, a card or a shirt, is a person with no phone.
// Only a change of 2 cm or more is sent
function writeThePlan() {
  if (!shareConnected) return;
  if (!shared.people || typeof shared.people !== 'object') shared.people = {};
  const here = phones();
  for (let slot = 1; slot <= SLOTS.length; slot++) {
    const id = SLOTS[slot - 1].name;
    const spot = spots[slot];
    if (!spot) {
      if (people[id]) {
        delete people[id];
        delete shared.people[id];
      }
      continue;
    }
    const phone = here.find(function (g) {
      return g.slot === slot;
    });
    const next = {
      x: round(spot.x * 100) / 100,
      y: round(spot.y * 100) / 100,
      name: phone ? String(phone.name || id) : id,
      hue: SLOTS[slot - 1].hue,
      phone: phone ? phone.key : ''
    };
    const old = people[id];
    if (!old || abs(old.x - next.x) >= 0.02 || abs(old.y - next.y) >= 0.02 ||
      old.name !== next.name || old.phone !== next.phone) {
      people[id] = next;
      shared.people[id] = Object.assign({}, next);
    }
  }
}

// ---- the map from the picture to the floor ----

// Four points in the picture and the same four on the floor fix a map between them, called a
// homography. A phone uses the same maths to straighten a photo of a page.
// It returns nine numbers, or null if the four points do not make a shape
function makeMap(from, to) {
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const a = from[i];
    const b = to[i];
    rows.push([a.x, a.y, 1, 0, 0, 0, -a.x * b.x, -a.y * b.x, b.x]);
    rows.push([0, 0, 0, a.x, a.y, 1, -a.x * b.y, -a.y * b.y, b.y]);
  }
  // solve the eight equations, one unknown at a time
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let r = c + 1; r < 8; r++) {
      if (abs(rows[r][c]) > abs(rows[pivot][c])) pivot = r;
    }
    if (abs(rows[pivot][c]) < 1e-9) return null;
    [rows[c], rows[pivot]] = [rows[pivot], rows[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = rows[r][c] / rows[c][c];
      for (let k = c; k < 9; k++) rows[r][k] -= f * rows[c][k];
    }
  }
  const h = [];
  for (let r = 0; r < 8; r++) h.push(rows[r][8] / rows[r][r]);
  h.push(1);
  return h;
}

function applyMap(h, p) {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

function floorCorners() {
  return [
    { x: 0, y: 0 },
    { x: floorSize.w, y: 0 },
    { x: floorSize.w, y: floorSize.d },
    { x: 0, y: floorSize.d }
  ];
}

function makeTheMaps() {
  floorMap = makeMap(corners, floorCorners());
  pictureMap = makeMap(floorCorners(), corners);
}

// ---- the setup, kept on this laptop ----

function startingSetup() {
  corners = [{ x: 0.25, y: 0.4 }, { x: 0.75, y: 0.4 }, { x: 0.95, y: 0.92 }, { x: 0.05, y: 0.92 }];
  targets = SLOTS.map(function (s, i) {
    const c = slotColour(i + 1);
    return { r: red(c), g: green(c), b: blue(c) };
  });
}

function loadTheSetup() {
  startingSetup();
  try {
    const kept = JSON.parse(localStorage.getItem('colour-room-setup') || 'null');
    if (kept && kept.corners && kept.corners.length === 4) corners = kept.corners;
    if (kept && kept.targets && kept.targets.length === SLOTS.length) targets = kept.targets;
  } catch (e) {
    // a private window can say no. the setup lasts until a reload
  }
  makeTheMaps();
}

function saveTheSetup() {
  try {
    localStorage.setItem('colour-room-setup', JSON.stringify({ corners: corners, targets: targets }));
  } catch (e) {
    // a private window can say no
  }
}

// ---- the mouse and the keys ----

// a point on the screen, as a point in the picture from 0 to 1
function screenToPicture(sx, sy) {
  return { x: (sx - pic.x) / pic.w, y: (sy - pic.y) / pic.h };
}
function pictureToScreen(p) {
  return { x: pic.x + p.x * pic.w, y: pic.y + p.y * pic.h };
}

function mousePressed() {
  if (!pic) return false;
  const swatch = swatches.find(function (b) {
    return mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h;
  });
  if (swatch) {
    picking = swatch.slot;
    return false;
  }
  for (let i = 0; i < 4; i++) {
    const s = pictureToScreen(corners[i]);
    if (dist(mouseX, mouseY, s.x, s.y) < 20 * u) {
      dragCorner = i;
      return false;
    }
  }
  const p = screenToPicture(mouseX, mouseY);
  const inside = p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
  if (picking && inside) {
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) {
      targets[picking - 1] = averageColourAt(frame, p.x * frame.width, p.y * frame.height, 2);
      saveTheSetup();
      picking = 0;
    }
  }
  return false;
}

function mouseDragged() {
  if (dragCorner < 0) return;
  const p = screenToPicture(mouseX, mouseY);
  corners[dragCorner] = { x: constrain(p.x, 0, 1), y: constrain(p.y, 0, 1) };
  makeTheMaps();
  return false;
}

function mouseReleased() {
  if (dragCorner >= 0) saveTheSetup();
  dragCorner = -1;
}

// the average colour of a small square, so one noisy pixel does not decide. From Class 10
function averageColourAt(frame, cx, cy, radius) {
  const data = frame.imageData.data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = Math.floor(cy) - radius; y <= Math.floor(cy) + radius; y++) {
    for (let x = Math.floor(cx) - radius; x <= Math.floor(cx) + radius; x++) {
      if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) continue;
      const i = 4 * (y * frame.width + x);
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  return { r: round(r / count), g: round(g / count), b: round(b / count) };
}

function keyPressed() {
  if (key >= '1' && key <= String(SLOTS.length)) {
    picking = Number(key);
  } else if (key === 'Escape') {
    picking = 0;
  } else if (key === 'm' || key === 'M') {
    showMask = !showMask;
  } else if (key === '-') {
    tolerance = constrain(tolerance - 10, 10, 200);
  } else if (key === '+' || key === '=') {
    tolerance = constrain(tolerance + 10, 10, 200);
  } else if (key === 'r' || key === 'R') {
    if (millis() - resetPressed < 2000) {
      startingSetup();
      makeTheMaps();
      saveTheSetup();
      resetPressed = 0;
    } else {
      resetPressed = millis();
    }
  }
}

// ---- drawing ----

// the picture fills the space left of the column, at the camera's shape
function placeThePicture() {
  const video = cam.videoElement;
  const aspect = video && video.videoWidth ? video.videoWidth / video.videoHeight : 4 / 3;
  const boxW = width - 420 * u;
  const boxH = height - 40 * u;
  const w = min(boxW, boxH * aspect);
  return { x: 20 * u, y: 20 * u + (boxH - w / aspect) / 2, w: w, h: w / aspect };
}

function drawThePicture() {
  noStroke();
  fill(32);
  rect(pic.x, pic.y, pic.w, pic.h);
  const video = cam.videoElement;
  if (cam.ready && video && video.readyState >= 2) {
    drawingContext.drawImage(video, pic.x, pic.y, pic.w, pic.h);
  } else {
    fill(160);
    textAlign(CENTER, CENTER);
    textSize(18 * u);
    text('Waiting for the camera.', pic.x + pic.w / 2, pic.y + pic.h / 2);
  }
  if (showMask && maskImage) {
    fill(0, 210);
    rect(pic.x, pic.y, pic.w, pic.h);
    drawingContext.imageSmoothingEnabled = false;
    image(maskImage, pic.x, pic.y, pic.w, pic.h);
    drawingContext.imageSmoothingEnabled = true;
  }
}

// what the camera counts as each colour, one scanned pixel at a time
function makeMask(frame) {
  if (!maskImage || maskImage.width !== frame.width || maskImage.height !== frame.height) {
    maskImage = createImage(frame.width, frame.height);
  }
  const colours = SLOTS.map(function (s, i) {
    return slotColour(i + 1);
  });
  maskImage.loadPixels();
  for (let i = 0; i < labels.length; i++) {
    const slot = labels[i];
    const c = slot ? colours[slot - 1] : null;
    maskImage.pixels[i * 4] = c ? red(c) : 0;
    maskImage.pixels[i * 4 + 1] = c ? green(c) : 0;
    maskImage.pixels[i * 4 + 2] = c ? blue(c) : 0;
    maskImage.pixels[i * 4 + 3] = c ? 255 : 0;
  }
  maskImage.updatePixels();
}

// the floor drawn back onto the picture: a line every metre. If the lines sit on the tape,
// the corners are right
function drawTheFloorOnThePicture() {
  if (!pictureMap) return;
  push();
  stroke(255, 200, 0, 90);
  strokeWeight(1);
  for (let m = 1; m < floorSize.w; m++) floorLine(m, 0, m, floorSize.d);
  for (let m = 1; m < floorSize.d; m++) floorLine(0, m, floorSize.w, m);
  stroke(255, 200, 0);
  strokeWeight(2 * u);
  noFill();
  beginShape();
  for (const c of corners) {
    const s = pictureToScreen(c);
    vertex(s.x, s.y);
  }
  endShape(CLOSE);
  const names = ['0, 0', floorSize.w + ', 0', floorSize.w + ', ' + floorSize.d, '0, ' + floorSize.d];
  for (let i = 0; i < 4; i++) {
    const s = pictureToScreen(corners[i]);
    fill(dragCorner === i ? color(255, 200, 0) : color(20, 200));
    stroke(255, 200, 0);
    strokeWeight(2 * u);
    circle(s.x, s.y, 18 * u);
    noStroke();
    fill(255, 200, 0);
    textSize(12 * u);
    textAlign(CENTER, BOTTOM);
    text(names[i] + ' m', s.x, s.y - 12 * u);
  }
  pop();
}

function floorLine(x1, y1, x2, y2) {
  const a = pictureToScreen(applyMap(pictureMap, { x: x1, y: y1 }));
  const b = pictureToScreen(applyMap(pictureMap, { x: x2, y: y2 }));
  line(a.x, a.y, b.x, b.y);
}

// a ring round each colour the camera sees, then where it is on the floor.
// the labels go on top of every ring. two people side by side: the second label goes under the first
function drawTheColoursSeen() {
  push();
  for (const slot of Object.keys(seen)) {
    const s = pictureToScreen(seen[slot]);
    noFill();
    stroke(slotColour(Number(slot)));
    strokeWeight(4 * u);
    circle(s.x, s.y, 44 * u);
    stroke(255);
    strokeWeight(1.5 * u);
    circle(s.x, s.y, 50 * u);
  }
  const placed = [];
  for (const slot of Object.keys(seen)) {
    const s = pictureToScreen(seen[slot]);
    const spot = spots[slot];
    const words = SLOTS[slot - 1].name + (spot ? '   ' + spot.x.toFixed(1) + ', ' + spot.y.toFixed(1) + ' m' : '   off the floor');
    textSize(14 * u);
    const w = textWidth(words) + 12 * u;
    const box = { x: s.x - w / 2, y: s.y + 30 * u, w: w, h: 22 * u };
    while (placed.some(function (b) {
      return box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h;
    })) {
      box.y += 24 * u;
    }
    placed.push(box);
    noStroke();
    fill(20, 220);
    rect(box.x, box.y, box.w, box.h, 4 * u);
    fill(255);
    textAlign(CENTER, CENTER);
    text(words, s.x, box.y + box.h / 2);
  }
  pop();
}

// ---- the column on the right ----

function drawSide(x, w) {
  let y = 34 * u;
  noStroke();
  textAlign(LEFT, TOP);
  fill(255);
  textStyle(BOLD);
  textSize(30 * u);
  text('Colour Room', x, y);
  textStyle(NORMAL);
  y += 40 * u;
  fill(160);
  textSize(16 * u);
  text('A camera finds each colour and writes where it stands.', x, y, w, 44 * u);
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

  // the five colours as the camera sees them. a tick: seen now
  fill(150);
  textStyle(BOLD);
  textSize(13 * u);
  text('THE COLOURS  ' + Object.keys(spots).length + ' ON THE FLOOR', x, y);
  textStyle(NORMAL);
  y += 22 * u;
  swatches = [];
  const size = min(56 * u, (w - 4 * 10 * u) / 5);
  for (let i = 0; i < SLOTS.length; i++) {
    const b = { x: x + i * (size + 10 * u), y: y, w: size, h: size, slot: i + 1 };
    swatches.push(b);
    fill(targets[i].r, targets[i].g, targets[i].b);
    stroke(picking === i + 1 ? 255 : 60);
    strokeWeight(picking === i + 1 ? 3 * u : 1);
    rect(b.x, b.y, b.w, b.h, 6 * u);
    noStroke();
    fill(20, 200);
    circle(b.x + 12 * u, b.y + 12 * u, 18 * u);
    fill(255);
    textSize(12 * u);
    textAlign(CENTER, CENTER);
    text(String(i + 1), b.x + 12 * u, b.y + 12 * u);
    fill(seen[i + 1] ? 255 : 120);
    textAlign(CENTER, TOP);
    text(SLOTS[i].name + (seen[i + 1] ? ' ✓' : ''), b.x + b.w / 2, b.y + b.h + 4 * u);
  }
  textAlign(LEFT, TOP);
  y += size + 26 * u;

  textSize(14 * u);
  if (picking) {
    fill(255, 200, 0);
    text('Click ' + SLOTS[picking - 1].name + ' in the picture. Esc to stop.', x, y, w, 40 * u);
  } else if (millis() - resetPressed < 2000) {
    fill(255, 200, 0);
    text('Press R again to put the corners and colours back.', x, y, w, 40 * u);
  } else {
    fill(150);
    text('Press 1 to 5, then click that colour in the picture. M shows what the camera counts. ' +
      '- and + change the tolerance (' + tolerance + ').', x, y, w, 80 * u);
  }
  y += 84 * u;

  fill(150);
  textSize(14 * u);
  const here = phones().length;
  text(here + (here === 1 ? ' phone' : ' phones') + ' in the room. Drag the yellow corners onto the tape.', x, y, w, 40 * u);

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
