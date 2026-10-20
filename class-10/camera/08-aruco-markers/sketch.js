// 08 ArUco Markers
// Shows every ArUco marker the camera can see. A marker is a black and white square code.
// Each one has a number. The sketch outlines each marker and shows its number, how far
// it is turned and how big it looks. Then it measures every pair of markers: the
// distance between them and the angle of the line that joins them.
//
// The same number can be in view twice. Hold paper marker 7 next to a phone showing 7
// (09 Marker on a Screen) and you see both, side by side. Copies of one number are
// named 7a, 7b, 7c, from left to right, so you can tell them apart.
//
// Try this
//   Hold up two markers. Move them apart and together. Watch the distance.
//   Turn one marker like a knob. Watch its turn.
//   Move one marker around the other. Watch the angle of the line.
//   Compare paper and a phone screen with the same number. Try far away, glare and dim light.
//   Cover a corner of the white border with a finger and watch the marker disappear.
//
// Key data
//   markers  every marker in view, a list: [{ id, name, corners, center, angle, size }]
//            in canvas pixels. Two markers with the same id are two entries.
//            name is the id, or 7a, 7b... when that number is in view more than once.
//            angle is the marker's own turn, 0 to 360 degrees. Upright is 0. It grows
//            as the marker turns clockwise on the screen.
//            size is the length of one side in pixels. It shrinks as the marker moves away.
//   pairs    every pair of markers in view: [{ a, b, pixels, cm, angle }]
//            a is the marker with the lower number (or the one on the left, if the numbers match).
//            pixels is the distance between the two centres.
//            cm is an estimate of that distance (see MARKER_MM).
//            angle is the direction of the line from a to b, 0 to 360 degrees.
//            0 points right, and it grows clockwise on the screen.
//
// The markers
//   Dictionary ARUCO_MIP_36h12, numbers 0 to 249. The class sheets have 0 to 36, each at
//   120, 60 and 30 mm. Print them at 100% with Fit to page off:
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-10/markers/aruco-markers-0-36-letter.pdf
//   Or show one on a phone with 09 Marker on a Screen. Turn the brightness all the way up.
//   Keep the white border around each marker.
//
// Detector
//   new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 })
//   maxHammingDistance is how many bits of a code may be wrong and still match. The
//   default of 12 lets random patterns count as markers, so this uses a stricter 5.
//   js-aruco2 2.0.0 is plain JavaScript. It is about 40 KB and runs on any phone.
//
// Phone and laptop
//   A phone starts on the rear camera. A laptop starts on its webcam, drawn like a mirror.
//   The camera button switches cameras when the device has two.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/markers/aruco-markers/

// The width of the black square on your printed markers, in mm: 120, 60 or 30.
// The distance in cm uses it. It assumes both markers are this size and face the camera.
const MARKER_MM = 60;

const SCAN_SIZE = 640;  // the longer side of the picture given to the detector
const MAX_LISTED = 6;   // pairs listed in the panel at the bottom

let cam;
let detector;
let markers = [];
let pairs = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // A phone starts on the rear camera, so you can point it at markers.
  // A laptop webcam faces you, so it is drawn like a mirror.
  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }

  detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 });
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  if (isNewFrame(cam)) {
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) {
      const found = detector.detect(frame.imageData);
      markers = found.map((marker) => describeMarker(marker, frame));
      nameMarkers(markers);
      pairs = measurePairs(markers);
    }
  }

  for (const pair of pairs) drawPair(pair);
  for (const marker of markers) drawMarker(marker);
  drawPanel();
  drawCameraOn(cam);
}

// One marker from the detector, in canvas pixels: its corners, centre, turn and size.
function describeMarker(marker, frame) {
  const corners = marker.corners.map((corner) => mapFramePoint(cam, frame, corner));
  const center = {
    x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
    y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4
  };
  // The marker's top edge runs from corner 0 to corner 1. Its direction is the turn.
  // A mirrored view flips that edge, so measure it the other way round.
  const [from, to] = cam.mirror ? [corners[1], corners[0]] : [corners[0], corners[1]];
  const angle = angleOf(from, to);
  const size = (dist(corners[0].x, corners[0].y, corners[1].x, corners[1].y) +
                dist(corners[1].x, corners[1].y, corners[2].x, corners[2].y)) / 2;
  return { id: marker.id, corners: corners, center: center, angle: angle, size: size };
}

// A marker's name is its number. When a number is in view more than once,
// the copies get a letter from left to right: 7a, 7b, 7c.
function nameMarkers(list) {
  for (const marker of list) {
    const same = list.filter((other) => other.id === marker.id);
    same.sort((p, q) => p.center.x - q.center.x);
    marker.name = same.length === 1 ? String(marker.id) : marker.id + 'abcdefghij'[same.indexOf(marker)];
  }
}

// Every pair of markers in view, once each.
function measurePairs(list) {
  const result = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      let a = list[i];
      let b = list[j];
      // a is the lower number. Same number: a is the one on the left.
      if (b.id < a.id || (b.id === a.id && b.center.x < a.center.x)) [a, b] = [b, a];
      const pixels = dist(a.center.x, a.center.y, b.center.x, b.center.y);
      // One marker side is MARKER_MM wide, so pixels / side * MARKER_MM is the distance in mm.
      const side = (a.size + b.size) / 2;
      const cm = pixels / side * MARKER_MM / 10;
      result.push({ a: a, b: b, pixels: pixels, cm: cm, angle: angleOf(a.center, b.center) });
    }
  }
  return result;
}

// The direction from one point to another: 0 points right, and it grows clockwise
// on the screen (the canvas y axis points down). 0 to 360 degrees.
function angleOf(from, to) {
  let angle = degrees(atan2(to.y - from.y, to.x - from.x));
  if (angle < 0) angle += 360;
  return angle;
}

function drawMarker(marker) {
  noFill();
  stroke(0, 230, 120);
  strokeWeight(4);
  beginShape();
  for (const corner of marker.corners) vertex(corner.x, corner.y);
  endShape(CLOSE);

  // the number, big, in the middle
  const big = constrain(marker.size * 0.45, 22, 120);
  label(marker.name, marker.center.x, marker.center.y, big, true);

  // its own turn and size, under it
  const below = marker.center.y + marker.size * 0.5 + 22;
  label(round(marker.angle) + '°  ·  ' + round(marker.size) + ' px', marker.center.x, below, 14, false);
}

function drawPair(pair) {
  stroke(255, 210, 0);
  strokeWeight(3);
  line(pair.a.center.x, pair.a.center.y, pair.b.center.x, pair.b.center.y);

  // The label sits in the middle of the line, in the gap between the two markers.
  // When the gap is too small it would cover a marker, so it is only in the panel.
  const words = round(pair.pixels) + ' px  ·  about ' + round(pair.cm) + ' cm  ·  ' + round(pair.angle) + '°';
  textSize(14);
  textStyle(NORMAL);
  const gap = pair.pixels - (pair.a.size + pair.b.size) * 0.75; // the line between the markers' corners
  const turn = radians(pair.angle);
  const across = abs((textWidth(words) + 12) * cos(turn)) + abs(20 * sin(turn)); // how much line the label covers
  if (across + 10 > gap) return;
  const midX = (pair.a.center.x + pair.b.center.x) / 2;
  const midY = (pair.a.center.y + pair.b.center.y) / 2;
  label(words, midX, midY, 14, false);
}

// White text on a dark box, so it reads over any picture.
function label(words, x, y, size, bold) {
  textSize(size);
  textStyle(bold ? BOLD : NORMAL);
  const w = textWidth(words) + size * 0.8;
  const h = size * 1.4;
  noStroke();
  fill(0, 0, 0, 170);
  rect(x - w / 2, y - h / 2, w, h, 6);
  fill(255);
  textAlign(CENTER, CENTER);
  text(words, x, y);
}

// The panel at the bottom: which markers are in view, then one line per pair.
function drawPanel() {
  const lines = [];
  if (!cam.ready) {
    lines.push('Waiting for the camera.');
  } else if (markers.length === 0) {
    lines.push('Show an ArUco marker to the camera.');
  } else {
    lines.push(markers.length + (markers.length === 1 ? ' marker: ' : ' markers: ') +
               markers.map((marker) => marker.name).join(', '));
    for (const pair of pairs.slice(0, MAX_LISTED)) {
      lines.push(pair.a.name + ' to ' + pair.b.name + ':  ' + round(pair.pixels) + ' px,  about ' +
                 round(pair.cm) + ' cm,  ' + round(pair.angle) + '°');
    }
    if (pairs.length > MAX_LISTED) lines.push('and ' + (pairs.length - MAX_LISTED) + ' more pairs');
  }

  const lineHeight = 20;
  const panelHeight = lines.length * lineHeight + 20;
  noStroke();
  fill(0, 0, 0, 200);
  rect(0, height - panelHeight, width, panelHeight);
  fill(255);
  textStyle(NORMAL);
  textSize(15);
  textAlign(LEFT, CENTER);
  lines.forEach((words, i) => text(words, 16, height - panelHeight + 10 + lineHeight * (i + 0.5)));
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
