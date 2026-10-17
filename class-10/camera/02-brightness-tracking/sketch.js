// 02 Brightness Tracking
// Finds the brightest spot in the camera image. Point a phone flashlight, a lamp
// or a lit screen at the camera and the sketch follows it.
// No model is used. Each frame, it checks every pixel of a small copy of the picture.
//
// Two methods run side by side.
//   brightest  The single brightest pixel. A red cross. Simple, but it jumps around.
//   centroid   The average position of every pixel above the threshold. A yellow circle.
//              It is steadier, and its size says how big the bright spot is.
//
// Try this
//   Work in a dim room. Hold a flashlight in front of the camera and move it.
//   Drag up or down anywhere on the screen to change the threshold.
//   Keep the same light and change the threshold. Watch the yellow circle change.
//
// Key data
//   brightest  { x, y, value } in canvas pixels. value runs from 0 to 255.
//   centroid   { x, y, area } in canvas pixels. area is the share of the frame, 0 to 1. It is null
//              when nothing is above the threshold.
//   threshold  50 to 255. The cutoff for the centroid method.
//
// Phone and laptop
//   A phone starts on the rear camera. A laptop starts on its webcam, drawn like a mirror.
//   The camera button switches cameras when the device has two.
//   The first tap turns the camera on. iPhones need that tap.
//   Cameras change their exposure on their own. A strong light can darken the rest of the picture.
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// After Golan Levin's "Brightness Tracking" example for Processing's video library.
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/foundations/brightness-tracking/

let cam;
let brightest = null;
let centroid = null;
let threshold = 230;

// The longest side of the small copy of the picture that is scanned.
const SCAN_SIZE = 240;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // A phone starts on the rear camera, so you can point it at lights.
  // A laptop webcam faces you, so it is drawn like a mirror.
  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }
}

function draw() {
  background(16, 19, 24);

  if (cam.ready) {
    drawPhoneCamera(cam);
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) {
      findBrightness(frame);
      drawResults();
    }
  }

  drawPanel();
  drawCameraOn(cam);
}

function findBrightness(frame) {
  const data = frame.imageData.data;
  let bestValue = -1;
  let bestX = 0;
  let bestY = 0;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = 4 * (y * frame.width + x);
      // Perceived brightness: green counts most, blue least.
      const value = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];

      if (value > bestValue) {
        bestValue = value;
        bestX = x;
        bestY = y;
      }
      if (value >= threshold) {
        sumX += x;
        sumY += y;
        count += 1;
      }
    }
  }

  const bestPoint = mapFramePoint(cam, frame, { x: bestX, y: bestY });
  brightest = { x: bestPoint.x, y: bestPoint.y, value: bestValue };

  if (count > 0) {
    const center = mapFramePoint(cam, frame, { x: sumX / count, y: sumY / count });
    centroid = { x: center.x, y: center.y, area: count / (frame.width * frame.height) };
  } else {
    centroid = null;
  }
}

function drawResults() {
  // Brightest pixel: small crosshair
  stroke(255, 80, 80);
  strokeWeight(2);
  line(brightest.x - 14, brightest.y, brightest.x + 14, brightest.y);
  line(brightest.x, brightest.y - 14, brightest.x, brightest.y + 14);

  // Centroid: circle sized by the bright area
  if (centroid) {
    noFill();
    stroke(255, 220, 0);
    strokeWeight(4);
    circle(centroid.x, centroid.y, 30 + sqrt(centroid.area) * min(width, height));
  }
}

function drawPanel() {
  const panelHeight = 68;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);

  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Waiting for the camera.';
  if (cam.ready && brightest) {
    message = 'Brightest ' + round(brightest.value) + '. ' +
      (centroid ? 'Bright area ' + nf(centroid.area * 100, 1, 1) + '%.' : 'Nothing above the threshold.');
  }
  text(message, 16, height - panelHeight / 2 - 10);
  fill(180);
  textSize(13);
  text('Threshold ' + threshold + '. Drag up or down to change it.', 16, height - panelHeight / 2 + 12);
}

// Drag vertically anywhere to change the threshold. Works with mouse and touch.
function mouseDragged() {
  if (cameraSwitchJustPressed()) return false;
  threshold = constrain(threshold - (mouseY - pmouseY), 50, 255);
  return false;
}

function mousePressed() {
  return false;
}

// On a laptop, the up and down arrow keys change the threshold too.
function keyPressed() {
  if (keyIsDown(UP_ARROW)) threshold = constrain(threshold + 5, 50, 255);
  if (keyIsDown(DOWN_ARROW)) threshold = constrain(threshold - 5, 50, 255);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
