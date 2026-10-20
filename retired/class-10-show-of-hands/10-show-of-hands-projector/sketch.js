// 10 · Show of Hands: Projector
// One camera looks at the class. Every phone in the picture shows a marker (09 Show of Hands: Phone),
// and the marker says which seat it is and whether it votes A or B.
// This page finds them all, counts them, and shows where in the room each vote is.
// There is no network between the phones and this page. The camera is the only link.
// The camera knows where you sit. The network, in Class 13, only knows what you sent.
//
// Run it on a laptop on the projector, or on a phone on a tripod (it starts on the rear camera).
// Point the camera at the class. Phones must show their whole screen to it.
//
// What to try
//   Raise a few phones, then lower them. A phone counts for 0.7 seconds after the camera last saw it,
//   so the numbers do not flicker.
//   space   hold the count. The picture and the numbers freeze until you press space again
//   r       reset. Forget every phone
//   m       flip the picture like a mirror. Left and right always mean the picture on screen
//   s       change the scan size. A bigger scan finds smaller or farther markers but runs slower.
//           The numbers at the bottom show how fast it runs
//
// The id scheme (09 and 10 must agree)
//   marker id 1 to 99      vote A, and the id is the seat number
//   marker id 101 to 199   vote B, and the seat number is the id minus 100
//   so  vote = id < 100 ? 'A' : 'B'   and   seat = id % 100
//   Dictionary ARUCO_MIP_36h12, read with js-aruco2 at maxHammingDistance 5. Other ids are ignored.
//
// Key data
//   markers   js-aruco2 output for one camera frame: [{ id, corners: [{ x, y } x4], hammingDistance }]
//   phones    every phone seen lately: { seat, vote, cx, cy, size, corners, lastSeen, hits }
//             positions are in units of the frame's width, so they do not change with the scan size
//   A seat counts once. If a seat's marker flickers between its A id and its B id, the latest one wins.
//   Two phones with the same seat number still count twice if they are in different places.

// the feel of the piece. change these before you change anything else.
let scanSize = 1280;            // the longest side, in pixels, of the picture given to the detector
const SCAN_SIZES = [640, 960, 1280, 1920];
let seenMs = 700;               // how long a phone still counts after the camera last saw it
let neededSightings = 2;        // it must be seen in this many camera frames, so a false marker is ignored
let mirrorView = false;         // false: the picture as the camera sees it

const COLORS = {
  A: [255, 149, 0],             // orange
  B: [25, 184, 255]             // blue
};
const WHITE = [255, 255, 255];

let cam;
let detector;
let phones = [];                // every phone seen lately
let held = null;                // while the count is held: { phones }
let lastFrame = null;           // the camera picture most recently given to the detector

let detections = 0;             // how many pictures were searched this second
let detectionsPerSecond = 0;
let rateAt = 0;
let detectMs = 0;               // how long one search takes, in milliseconds (smoothed)
const askedTracks = new WeakSet();

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(min(displayDensity(), 2));
  lockGestures();
  textFont('system-ui');

  // The laptop's own camera faces the class. A phone on a tripod uses its rear camera.
  // The picture is not mirrored. (Detection never uses the mirrored picture anyway.)
  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, false, 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to start the camera');

  // maxHammingDistance: how many bits may be wrong and still match. The dictionary's own limit (12)
  // lets false matches through, so use a stricter one.
  detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 });

  showPhonePageQr();
}

// A small QR code in the corner opens the phone page. It is the page next door, so the address is built
// from this page's own address. (Only on a laptop. A page in an iframe or a phone would not show it.)
function showPhonePageQr() {
  if (!window.isDesktop || window.self !== window.top) return;
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (location.protocol !== 'https:' && !local) return;
  const phonePage = new URL('../09-show-of-hands-phone/', location.href).href;
  showDesktopQr({
    url: phonePage,
    position: 'bottom-right',
    size: 120,
    label: 'Open the phone page',
    closable: false
  });
}

function qrIsShowing() {
  return Boolean(document.getElementById('p5phoneDesktopQr'));
}

// ---------- finding the markers ----------

function draw() {
  background(16);
  const now = millis();

  askForBigPicture();
  if (!held && isNewFrame(cam)) lookForMarkers(now);
  if (!held) forget(now);
  countTheRate(now);

  const where = layout();
  const pic = pictureRect(where.area);
  where.strip.x = pic.x;
  where.strip.w = pic.w;

  const shown = shownPhones();
  const counts = tally(shown);

  drawPicture(pic);
  drawPhones(pic, shown);
  drawHeldBadge(pic);
  drawTally(where.tally, counts, where.wide);
  drawStrip(where.strip, shown, counts);
  drawHelp(where.help);
}

function lookForMarkers(now) {
  const frame = grabFrame(cam, scanSize);
  if (!frame) return;

  const started = performance.now();
  const markers = detector.detect(frame.imageData);
  detectMs = lerp(detectMs, performance.now() - started, 0.2);
  detections++;
  lastFrame = frame;

  for (const marker of markers) noteSighting(marker, frame, now);
}

// A marker was found. Work out whose it is, and remember where it was and when.
function noteSighting(marker, frame, now) {
  const id = marker.id;
  const seat = id % 100;
  if (id >= 200 || seat === 0) return; // not one of ours

  // corners, centre and size, all in units of the frame's width
  const corners = marker.corners.map(function (c) {
    return { u: c.x / frame.width, v: c.y / frame.width };
  });
  const cx = corners.reduce(function (sum, c) { return sum + c.u; }, 0) / 4;
  const cy = corners.reduce(function (sum, c) { return sum + c.v; }, 0) / 4;
  const size = (dist(corners[0].u, corners[0].v, corners[1].u, corners[1].v) +
                dist(corners[1].u, corners[1].v, corners[2].u, corners[2].v)) / 2;

  // The same seat, close by, is the same phone. The same seat far away is a second phone
  // that picked the same number.
  let phone = phones.find(function (p) {
    return p.seat === seat && dist(p.cx, p.cy, cx, cy) < max(p.size, size) * 3;
  });
  if (!phone) {
    phone = { seat: seat, hits: [] };
    phones.push(phone);
  }

  phone.vote = id < 100 ? 'A' : 'B'; // the latest sighting wins
  phone.cx = cx;
  phone.cy = cy;
  phone.size = size;
  phone.corners = corners;
  phone.lastSeen = now;
  if (phone.hits[phone.hits.length - 1] !== now) phone.hits.push(now);
}

// let go of phones the camera has not seen for a while
function forget(now) {
  phones = phones.filter(function (p) { return now - p.lastSeen < seenMs; });
  for (const p of phones) {
    p.hits = p.hits.filter(function (t) { return now - t < seenMs; });
  }
}

function isRaised(p) {
  return p.hits.length >= neededSightings;
}

function shownPhones() {
  return held ? held.phones : phones.filter(isRaised);
}

// Add up the votes, and split them into the left and right half of the picture on screen.
function tally(list) {
  const counts = { A: 0, B: 0, total: list.length, left: { A: 0, B: 0 }, right: { A: 0, B: 0 } };
  for (const p of list) {
    counts[p.vote]++;
    const half = screenU(p.cx) < 0.5 ? counts.left : counts.right;
    half[p.vote]++;
  }
  return counts;
}

// Cameras often start small. Ask for a bigger picture once per camera, so far markers have more pixels.
function askForBigPicture() {
  const video = cam.ready ? cam.videoElement : null;
  const stream = video ? video.srcObject : null;
  const track = stream && stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
  if (!track || askedTracks.has(track)) return;
  askedTracks.add(track);
  track.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 } }).catch(function () {});
}

function countTheRate(now) {
  if (now - rateAt >= 1000) {
    detectionsPerSecond = detections;
    detections = 0;
    rateAt = now;
  }
}

// ---------- where things go on screen ----------

function layout() {
  const wide = width >= height;
  const helpH = max(26, height * 0.04);
  const qrRoom = qrIsShowing() ? 214 : 0; // the QR code sits in the bottom right corner of the page
  if (wide) {
    const panelW = max(300, width * 0.3);
    const stripH = height * 0.2;
    const left = width - panelW;
    return {
      wide: true,
      area: { x: 0, y: 0, w: left, h: height - stripH - helpH },
      strip: { x: 0, y: height - stripH - helpH, w: left, h: stripH },
      help: { x: 12, y: height - helpH, w: left - 24, h: helpH },
      tally: { x: left, y: 0, w: panelW, h: height - qrRoom }
    };
  }
  const tallyH = height * 0.24;
  const stripH = height * 0.16;
  return {
    wide: false,
    area: { x: 0, y: tallyH, w: width, h: height - tallyH - stripH - helpH },
    strip: { x: 0, y: height - stripH - helpH, w: width, h: stripH },
    help: { x: 12, y: height - helpH, w: width - 24, h: helpH },
    tally: { x: 0, y: 0, w: width, h: tallyH }
  };
}

// The camera picture, as large as fits in the area without stretching.
function pictureRect(area) {
  const video = cam.ready ? cam.videoElement : null;
  const vw = video && video.videoWidth ? video.videoWidth : 16;
  const vh = video && video.videoHeight ? video.videoHeight : 9;
  const pad = 10;
  const scaleToFit = min((area.w - 2 * pad) / vw, (area.h - 2 * pad) / vh);
  const w = vw * scaleToFit;
  const h = vh * scaleToFit;
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w: w, h: h };
}

// 0 at the left of the picture on screen, 1 at the right
function screenU(u) {
  return mirrorView ? 1 - u : u;
}

// a point in the frame (units of the frame's width) to a point on the canvas
function toScreen(pic, u, v) {
  return { x: pic.x + screenU(u) * pic.w, y: pic.y + v * pic.w };
}

// ---------- drawing ----------

function drawPicture(pic) {
  noStroke();
  fill(0);
  rect(pic.x, pic.y, pic.w, pic.h);

  // while the count is held, show the last picture that was searched, so what you see is what was counted
  const source = held ? (lastFrame && lastFrame.canvas) : (cam.ready ? cam.videoElement : null);
  if (source && (held || source.readyState >= 2)) {
    push();
    if (mirrorView) {
      translate(pic.x * 2 + pic.w, 0);
      scale(-1, 1);
    }
    drawingContext.drawImage(source, pic.x, pic.y, pic.w, pic.h);
    pop();
  } else {
    fill(150);
    textAlign(CENTER, CENTER);
    textSize(max(14, height * 0.03));
    text('Waiting for the camera', pic.x + pic.w / 2, pic.y + pic.h / 2);
  }

  // a faint line down the middle shows where the left half ends
  stroke(255, 255, 255, 70);
  strokeWeight(1);
  line(pic.x + pic.w / 2, pic.y, pic.x + pic.w / 2, pic.y + pic.h);
}

// While the count is held, say so on top of everything else in the picture.
function drawHeldBadge(pic) {
  if (!held) return;
  const label = 'COUNT HELD. Press space to let go.';
  const h = max(30, height * 0.05);
  textSize(max(14, height * 0.028));
  textStyle(BOLD);
  const w = textWidth(label) + 28;
  noStroke();
  fill(255);
  const y = pic.y + pic.h - h - 10;
  rect(pic.x + pic.w / 2 - w / 2, y, w, h, 6);
  fill(16);
  textAlign(CENTER, CENTER);
  text(label, pic.x + pic.w / 2, y + h / 2);
  textStyle(NORMAL);
}

// Outline each phone in its vote colour and label it with its seat and vote.
function drawPhones(pic, list) {
  const labelSize = constrain(pic.w * 0.017, 11, 24);
  textSize(labelSize);
  textAlign(CENTER, CENTER);
  for (const p of list) {
    const c = COLORS[p.vote];
    const points = p.corners.map(function (corner) { return toScreen(pic, corner.u, corner.v); });

    stroke(c[0], c[1], c[2]);
    strokeWeight(max(2, pic.w * 0.003));
    fill(c[0], c[1], c[2], 40);
    beginShape();
    for (const point of points) vertex(point.x, point.y);
    endShape(CLOSE);

    const centre = toScreen(pic, p.cx, p.cy);
    const topEdge = min(points.map(function (point) { return point.y; }));
    const label = p.seat + ' ' + p.vote;
    const w = textWidth(label) + 12;
    const h = labelSize + 8;
    const x = constrain(centre.x, pic.x + w / 2, pic.x + pic.w - w / 2);
    const y = max(pic.y + h / 2, topEdge - h / 2 - 4);
    noStroke();
    fill(0, 0, 0, 190);
    rect(x - w / 2, y - h / 2, w, h, 4);
    fill(c[0], c[1], c[2]);
    text(label, x, y);
  }
}

// The tally. Big numbers, readable from the back of the room, and a bar for each vote.
// On a wide screen it is three rows at the right. On a tall screen it is three columns along the top.
function drawTally(box, counts, wide) {
  const items = [
    { label: 'A', n: counts.A, color: COLORS.A, bar: true },
    { label: 'B', n: counts.B, color: COLORS.B, bar: true },
    { label: 'raised', n: counts.total, color: WHITE, bar: false }
  ];

  const cellW = wide ? box.w : box.w / 3;
  const cellH = wide ? box.h / 3 : box.h;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const x = box.x + (wide ? 0 : i * cellW);
    const y = box.y + (wide ? i * cellH : 0);
    const pad = max(8, min(cellH, cellW) * 0.08);
    const c = item.color;

    noStroke();
    fill(24);
    rect(x + 3, y + 3, cellW - 6, cellH - 6);

    fill(c[0], c[1], c[2]);
    textStyle(BOLD);
    if (wide) {
      // the label at the left, the number at the right
      const middle = y + cellH * (item.bar ? 0.42 : 0.5);
      textAlign(LEFT, CENTER);
      textSize(item.bar ? cellH * 0.5 : cellH * 0.2);
      text(item.label, x + pad, middle);
      textAlign(RIGHT, CENTER);
      textSize(min(cellH * 0.66, cellW * 0.55));
      text(item.n, x + cellW - pad, middle);
    } else {
      // the label at the top, the number under it
      textAlign(CENTER, CENTER);
      textSize(min(cellH * 0.22, cellW * 0.2));
      text(item.label, x + cellW / 2, y + cellH * 0.18);
      textSize(min(cellH * 0.5, cellW * 0.5));
      text(item.n, x + cellW / 2, y + cellH * (item.bar ? 0.5 : 0.55));
    }
    textStyle(NORMAL);

    if (item.bar) {
      const share = counts.total > 0 ? item.n / counts.total : 0;
      const barY = y + cellH * 0.8;
      const barH = cellH * 0.1;
      fill(50);
      rect(x + pad, barY, cellW - 2 * pad, barH);
      fill(c[0], c[1], c[2]);
      rect(x + pad, barY, (cellW - 2 * pad) * share, barH);
    }
  }
}

// Where the votes are. Each raised phone is a dot at its place across the room.
// A dots run along the top lane, B dots along the bottom lane. The middle line splits left from right.
function drawStrip(box, list, counts) {
  noStroke();
  fill(24);
  rect(box.x, box.y + 4, box.w, box.h - 8);

  const textH = max(22, box.h * 0.3);
  const leftText = 'left side: ' + counts.left.A + ' A, ' + counts.left.B + ' B';
  const rightText = 'right side: ' + counts.right.A + ' A, ' + counts.right.B + ' B';
  textStyle(BOLD);
  textSize(fitTextSize(textH * 0.62, 12, 30, [leftText, rightText], box.w / 2 - 20));
  fill(WHITE[0], WHITE[1], WHITE[2]);
  textAlign(LEFT, CENTER);
  text(leftText, box.x + 12, box.y + 4 + textH / 2);
  textAlign(RIGHT, CENTER);
  text(rightText, box.x + box.w - 12, box.y + 4 + textH / 2);
  textStyle(NORMAL);

  // the middle line
  stroke(255, 255, 255, 90);
  strokeWeight(1);
  line(box.x + box.w / 2, box.y + 4 + textH, box.x + box.w / 2, box.y + box.h - 4);

  const laneTop = box.y + 4 + textH;
  const laneH = (box.h - 8 - textH) / 2;
  const d = constrain(laneH * 0.5, 8, 26);
  const step2 = d * 0.9; // sideways and up-down spacing for dots in the same lane
  const lanes = { A: [], B: [] };
  for (const p of list) lanes[p.vote].push(box.x + screenU(p.cx) * box.w);

  noStroke();
  for (const vote of ['A', 'B']) {
    const c = COLORS[vote];
    const laneY = laneTop + (vote === 'A' ? 0 : laneH);
    const maxRows = max(1, floor((laneH - d) / step2) + 1);
    const rowEnds = []; // right edge of the last dot in each row
    lanes[vote].sort(function (a, b) { return a - b; });
    fill(c[0], c[1], c[2]);
    for (const dotX of lanes[vote]) {
      // the first row where this dot does not touch the last one. if every row is full, stack on the last
      let row = 0;
      while (row < maxRows - 1 && rowEnds[row] !== undefined && dotX - d / 2 < rowEnds[row]) row++;
      rowEnds[row] = dotX + d / 2;
      circle(dotX, laneY + d / 2 + 2 + row * step2, d);
    }
  }
}

function drawHelp(box) {
  const keys = 'space: ' + (held ? 'let go' : 'hold') + '   r: reset   m: mirror ' + (mirrorView ? '(on)' : '(off)') + '   s: scan size';
  const frameWide = lastFrame ? lastFrame.width : 0;
  const stats = 'scan ' + frameWide + ' px   ' + detectionsPerSecond + ' per second   ' + round(detectMs) + ' ms';
  textStyle(NORMAL);
  textSize(fitTextSize(constrain(height * 0.02, 11, 18), 9, 18, [keys], box.w));
  noStroke();
  fill(150);
  textAlign(LEFT, CENTER);
  text(keys, box.x, box.y + box.h / 2);
  // the speed numbers only if there is room beside the keys
  if (textWidth(keys) + textWidth(stats) + 30 < box.w) {
    textAlign(RIGHT, CENTER);
    fill(110);
    text(stats, box.x + box.w, box.y + box.h / 2);
  }
}

// the biggest text size, from the top of the range down, at which every string fits in the width
function fitTextSize(biggest, smallest, cap, strings, maxWidth) {
  let size = min(biggest, cap);
  textSize(size);
  while (size > smallest && strings.some(function (t) { return textWidth(t) > maxWidth; })) {
    size -= 1;
    textSize(size);
  }
  return size;
}

// ---------- keys ----------

function keyPressed() {
  if (key === ' ') {
    if (held) {
      held = null;
    } else {
      held = { phones: phones.filter(isRaised).map(copyPhone) };
    }
  }
  if (key === 'r' || key === 'R') {
    phones = [];
    held = null;
  }
  if (key === 'm' || key === 'M') mirrorView = !mirrorView;
  if (key === 's' || key === 'S') {
    const next = (SCAN_SIZES.indexOf(scanSize) + 1) % SCAN_SIZES.length;
    scanSize = SCAN_SIZES[next];
  }
  return false;
}

function copyPhone(p) {
  return { seat: p.seat, vote: p.vote, cx: p.cx, cy: p.cy, size: p.size, corners: p.corners };
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
