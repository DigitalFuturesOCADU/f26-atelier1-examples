// 01 Color Tracking
// Tap the camera image to pick a colour. The sketch then follows that colour.
// No model is used. Each frame, it checks every pixel of a small copy of the picture.
// Pixels close to your colour are marked in magenta. A box and a circle show where they are.
//
// Try this
//   Tap a plain, bright colour. A green ball or a red cup works well.
//   Press the + and - buttons to change the tolerance. A bigger number accepts more colours.
//   Light changes every colour. If it loses the colour, tap again.
//
// Key data
//   targetColor  { r, g, b } picked by tapping, or null before the first tap
//   tolerance    how far a pixel's colour can be from the target and still count
//   matchCount   how many scanned pixels matched this frame
//   tracked      { x, y, box: { x, y, w, h } } in canvas pixels, or null. x and y are the centre:
//                the average position of every matching pixel. They show under the circle.
//
// Phone and laptop
//   A phone starts on the rear camera. A laptop starts on its webcam, drawn like a mirror.
//   The camera button switches cameras when the device has two.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Ported from p5-phone's camera/01_color_tracking. Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/foundations/color-tracking/

let cam;
let targetColor = null;
let tolerance = 60;
let matchCount = 0;
let tracked = null;
let matchMask = null;

// The longest side of the small copy of the picture that is scanned.
// Smaller is faster and noisier.
const SCAN_SIZE = 240;
// Fewer matching pixels than this counts as "not found".
const MIN_MATCHES = 30;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // A phone starts on the rear camera, so you can point it at things.
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
  background('#101318');

  if (cam.ready) {
    drawPhoneCamera(cam);
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame && targetColor) {
      trackColor(frame);
      drawOverCamera(cam, matchMask);
      drawTracked();
    }
  }

  drawPanel();
  drawCameraOn(cam);
}

// ----------------------------------------------
// The tracking itself: one pass over the pixels
// ----------------------------------------------
function trackColor(frame) {
  const pixelsIn = frame.imageData.data;
  const toleranceSquared = tolerance * tolerance;

  if (!matchMask || matchMask.width !== frame.width || matchMask.height !== frame.height) {
    matchMask = createImage(frame.width, frame.height);
  }
  matchMask.loadPixels();

  let sumX = 0;
  let sumY = 0;
  let minX = frame.width;
  let minY = frame.height;
  let maxX = 0;
  let maxY = 0;
  matchCount = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = 4 * (y * frame.width + x);
      const dr = pixelsIn[index] - targetColor.r;
      const dg = pixelsIn[index + 1] - targetColor.g;
      const db = pixelsIn[index + 2] - targetColor.b;
      const isMatch = dr * dr + dg * dg + db * db < toleranceSquared;

      // Matching pixels show as a translucent magenta overlay.
      matchMask.pixels[index] = 255;
      matchMask.pixels[index + 1] = 0;
      matchMask.pixels[index + 2] = 255;
      matchMask.pixels[index + 3] = isMatch ? 150 : 0;

      if (isMatch) {
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        matchCount += 1;
      }
    }
  }
  matchMask.updatePixels();

  if (matchCount < MIN_MATCHES) {
    tracked = null;
    return;
  }

  // Frame pixels -> canvas pixels. mapFramePoint() handles fit and mirroring,
  // so the corners can swap sides. Take min/max afterwards.
  const center = mapFramePoint(cam, frame, { x: sumX / matchCount, y: sumY / matchCount });
  const cornerA = mapFramePoint(cam, frame, { x: minX, y: minY });
  const cornerB = mapFramePoint(cam, frame, { x: maxX, y: maxY });
  tracked = {
    x: center.x,
    y: center.y,
    box: {
      x: Math.min(cornerA.x, cornerB.x),
      y: Math.min(cornerA.y, cornerB.y),
      w: Math.abs(cornerB.x - cornerA.x),
      h: Math.abs(cornerB.y - cornerA.y)
    }
  };
}

// ----------------------------------------------
// Picking the target colour
// ----------------------------------------------
function mousePressed() {
  if (cameraSwitchJustPressed() || !cam.ready) return false;

  if (hitToleranceButton(mouseX, mouseY)) return false;

  const frame = grabFrame(cam, SCAN_SIZE);
  const videoPoint = canvasToVideo(cam, mouseX, mouseY);
  if (frame && videoPoint.inside) {
    targetColor = averageColorAt(frame, videoPoint.x * frame.scale, videoPoint.y * frame.scale, 3);
  }
  return false;
}

// Average a small square around (cx, cy) so one noisy pixel doesn't decide.
function averageColorAt(frame, cx, cy, radius) {
  const data = frame.imageData.data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = Math.floor(cy) - radius; y <= Math.floor(cy) + radius; y += 1) {
    for (let x = Math.floor(cx) - radius; x <= Math.floor(cx) + radius; x += 1) {
      if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) continue;
      const index = 4 * (y * frame.width + x);
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
  }
  return { r: r / count, g: g / count, b: b / count };
}

// ----------------------------------------------
// Drawing
// ----------------------------------------------
function drawTracked() {
  if (!tracked) return;
  noFill();
  stroke(255);
  strokeWeight(3);
  rect(tracked.box.x, tracked.box.y, tracked.box.w, tracked.box.h, 4);

  fill(targetColor.r, targetColor.g, targetColor.b);
  stroke(255);
  strokeWeight(4);
  circle(tracked.x, tracked.y, 36);

  // the centre's x and y, under the circle
  xyLabel(tracked, 36, color(255));
}

// A point's x and y, like "x 120, y 340", on a dark box drawn `below` pixels under it
// (a negative number puts it above). The box stays on the screen.
function xyLabel(point, below, textColor) {
  const words = 'x ' + round(point.x) + ', y ' + round(point.y);
  textSize(14);
  textStyle(NORMAL);
  const w = textWidth(words) + 14;
  const cx = constrain(point.x, w / 2 + 4, width - w / 2 - 4);
  const cy = constrain(point.y + below, 15, height - 90); // clear of the panel at the bottom
  noStroke();
  fill(0, 0, 0, 180);
  rect(cx - w / 2, cy - 11, w, 22, 6);
  fill(textColor);
  textAlign(CENTER, CENTER);
  text(words, cx, cy);
}

// Bottom panel: target swatch, match count, and -/+ buttons for tolerance.
function toleranceButtons() {
  const size = 44;
  const y = height - 12 - size;
  return {
    minus: { x: width - 2 * size - 22, y: y, size: size },
    plus: { x: width - size - 12, y: y, size: size }
  };
}

function hitToleranceButton(x, y) {
  const buttons = toleranceButtons();
  for (const [name, button] of Object.entries(buttons)) {
    if (x > button.x && x < button.x + button.size && y > button.y && y < button.y + button.size) {
      tolerance = constrain(tolerance + (name === 'plus' ? 10 : -10), 10, 200);
      return true;
    }
  }
  return false;
}

function drawPanel() {
  const panelHeight = 68;
  const middle = height - panelHeight / 2;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);

  textAlign(LEFT, CENTER);
  textSize(15);
  fill(247);
  if (!cam.ready) {
    text('Waiting for the camera.', 16, middle);
  } else if (!targetColor) {
    text('Tap the image to pick a colour.', 16, middle);
  } else {
    // the colour you picked
    fill(targetColor.r, targetColor.g, targetColor.b);
    stroke(255);
    strokeWeight(2);
    rect(16, middle - 16, 32, 32, 5);
    noStroke();
    fill(247);
    text(tracked ? 'Tracking at x ' + round(tracked.x) + ', y ' + round(tracked.y) + '.' : 'Not found.', 60, middle - 10);
    fill(180);
    textSize(13);
    text(matchCount + ' pixels. Tolerance ' + tolerance + '.', 60, middle + 12);
  }

  const buttons = toleranceButtons();
  for (const [name, button] of Object.entries(buttons)) {
    fill(255);
    rect(button.x, button.y, button.size, button.size, 8);
    fill(17);
    textAlign(CENTER, CENTER);
    textSize(24);
    text(name === 'plus' ? '+' : '−', button.x + button.size / 2, button.y + button.size / 2);
  }
}

function keyPressed() {
  if (keyIsDown(UP_ARROW)) tolerance = constrain(tolerance + 10, 10, 200);
  if (keyIsDown(DOWN_ARROW)) tolerance = constrain(tolerance - 10, 10, 200);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
