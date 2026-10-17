// 08 ArUco Markers
// js-aruco2 finds ArUco markers in the camera image. A marker is a black and white
// square code. Each one has an id, so each one can control something different.
// A marker also tells you where it is, how big it looks, and how far it is turned.
//
// Markers are the most dependable way to track something. They need no model and no
// download, and they run the same on an old phone.
//
//   marker 0   Turn it like a knob. It sets the hue.
//   marker 1   Turn it like a knob. It sets the size.
//   marker 2   Show it to change the shape from a circle to a square.
//
// You need markers to try it. Print them from the dictionary ARUCO_MIP_36h12, ids 0 to 2:
// https://npuckett.github.io/browserCV-2026/markers/print-aruco.html
// Or show them on a second screen. A phone screen works too. Turn the brightness up.
// Keep the white border around each marker. Matte paper works better than glossy paper.
//
// Key data
//   markers  js-aruco2's results: [{ id, corners: [{ x, y } x4], hammingDistance }]
//            in pixels of the scanned picture. Corners run clockwise from the marker's own top left.
//   tracked  { [id]: { id, corners, center, angle, size } } in canvas pixels
//            angle runs from 0 to 360 degrees. 0 is upright. It grows as the marker turns
//            clockwise on the screen. size is the average edge length in pixels.
//
// Detector
//   new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 })
//   maxHammingDistance is how many bits of a code may be wrong and still match. The
//   default of 12 lets random patterns count as markers, so this uses a stricter 5.
//   js-aruco2 2.0.0 is plain JavaScript. It is about 40 KB and runs on any phone.
//
// Phone and laptop
//   A phone starts on the rear camera. Lay markers on a table and look down at them.
//   A laptop starts on its webcam. Hold a marker up to it.
//   Bigger markers work from farther away. SCAN_SIZE changes how small a marker can be.
//   The camera button switches cameras when the device has two.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/markers/aruco-markers/

let cam;
let detector;
let markers = [];
let tracked = {};

// The sketch parameters the markers control.
let shapeHue = 200;
let shapeSize = 80;
let useSquare = false;

const SCAN_SIZE = 640; // the longer side of the picture given to the detector
const PANEL_HEIGHT = 56;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');
  colorMode(HSB, 360, 100, 100, 100);

  // On a phone, the rear camera looks down at markers on a table.
  // On a laptop, hold markers up to the webcam, drawn like a mirror.
  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }

  // maxHammingDistance: how many bits may be wrong and still match. The
  // dictionary default (12) accepts false matches, so use a stricter value.
  detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 });
}

function draw() {
  background(220, 20, 8);
  drawPhoneCamera(cam);

  if (isNewFrame(cam)) {
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) {
      markers = detector.detect(frame.imageData);
      tracked = {};
      for (const marker of markers) {
        tracked[marker.id] = describeMarker(marker, frame);
      }
    }
  }

  useMarkersAsControls();
  for (const marker of Object.values(tracked)) drawMarker(marker);
  drawControlledShape();
  drawPanel();
  drawCameraOn(cam);
}

// Corners (frame pixels) -> canvas pixels, plus center, rotation and size.
function describeMarker(marker, frame) {
  const corners = marker.corners.map((corner) => mapFramePoint(cam, frame, corner));
  const center = {
    x: corners.reduce((sum, c) => sum + c.x, 0) / 4,
    y: corners.reduce((sum, c) => sum + c.y, 0) / 4
  };
  // The marker's top edge runs from corner 0 to corner 1, and its direction
  // is the marker's rotation. A mirrored view flips that edge left-to-right,
  // so measure it the other way round: upright reads 0° either way, and the
  // angle grows as the marker turns clockwise on screen.
  const [from, to] = cam.mirror ? [corners[1], corners[0]] : [corners[0], corners[1]];
  let angle = degrees(atan2(to.y - from.y, to.x - from.x));
  if (angle < 0) angle += 360;
  const size = (dist(corners[0].x, corners[0].y, corners[1].x, corners[1].y) +
                dist(corners[1].x, corners[1].y, corners[2].x, corners[2].y)) / 2;
  return { id: marker.id, corners: corners, center: center, angle: angle, size: size };
}

function useMarkersAsControls() {
  if (tracked[0]) shapeHue = tracked[0].angle;
  if (tracked[1]) shapeSize = map(tracked[1].angle, 0, 360, 30, maxShapeSize());
  useSquare = Boolean(tracked[2]);
}

function drawMarker(marker) {
  const c = marker.corners;
  noFill();
  stroke(140, 90, 100);
  strokeWeight(3);
  beginShape();
  for (const corner of c) vertex(corner.x, corner.y);
  endShape(CLOSE);

  // Corner 0 is the marker's own top-left: mark it so the orientation shows.
  noStroke();
  fill(0, 90, 100);
  circle(c[0].x, c[0].y, 12);

  // A knob pointer: from the center toward the marker's top edge.
  // (angle 0 = upright = pointing up, so subtract 90° for p5's 0 = right.)
  stroke(60, 90, 100);
  strokeWeight(3);
  const reach = marker.size * 0.7;
  line(marker.center.x, marker.center.y,
       marker.center.x + cos(radians(marker.angle - 90)) * reach,
       marker.center.y + sin(radians(marker.angle - 90)) * reach);

  noStroke();
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(18);
  text('id ' + marker.id, marker.center.x, marker.center.y - marker.size * 0.7 - 14);
  textSize(13);
  text(round(marker.angle) + '°', marker.center.x, marker.center.y + marker.size * 0.7 + 14);
}

function maxShapeSize() {
  return min(width, height) * 0.3;
}

// The shape the markers control, bottom right above the panel.
function drawControlledShape() {
  const x = width - maxShapeSize() / 2 - 20;
  const y = height - PANEL_HEIGHT - maxShapeSize() / 2 - 20;
  noStroke();
  fill(shapeHue, 80, 100, 85);
  if (useSquare) {
    rectMode(CENTER);
    rect(x, y, shapeSize, shapeSize, 8);
    rectMode(CORNER);
  } else {
    circle(x, y, shapeSize);
  }
}

function drawPanel() {
  noStroke();
  fill(0, 0, 0, 80);
  rect(0, height - PANEL_HEIGHT, width, PANEL_HEIGHT);
  fill(0, 0, 100);
  textAlign(LEFT, CENTER);
  textSize(15);
  const ids = Object.keys(tracked);
  if (!cam.ready) {
    text('Waiting for the camera.', 16, height - PANEL_HEIGHT / 2);
    return;
  }
  text(ids.length ? 'Markers seen: ' + ids.join(', ') + '.' : 'Show an ArUco marker to the camera.',
    16, height - PANEL_HEIGHT + 18);
  fill(0, 0, 70);
  textSize(13);
  text('0 turns the hue. 1 turns the size. 2 makes a square.', 16, height - PANEL_HEIGHT + 38);
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
