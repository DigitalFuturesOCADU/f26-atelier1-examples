// 03 Motion Detection
// Compares each camera frame with the one before it. A pixel that changed by more
// than the threshold counts as motion. The sketch paints those pixels green, marks
// the center of the motion, and shows how much of the picture is moving.
// No model is used. This is called frame differencing.
//
// Try this
//   Wave at the camera. Then hold still and watch the bar fall to zero.
//   Drag up or down anywhere on the screen to change the threshold.
//   A low threshold sees small changes, and also the camera's own noise.
//
// Key data
//   motionAmount  0 to 1. The share of pixels that changed since the last frame.
//   motionCenter  { x, y } in canvas pixels, or null when almost nothing moved.
//   threshold     How much a pixel's brightness (0 to 255) must change to count.
//
// Phone and laptop
//   This example starts on the front camera everywhere, so you can see yourself move.
//   Prop the phone up and step back. If you hold it, the whole picture moves and every
//   pixel counts as motion.
//   The camera button switches cameras when the device has two.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. Each frame is compared with the one before and then
// forgotten. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// After Golan Levin's "Frame Differencing" example for Processing's video library.
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/foundations/motion-detection/

let cam;
let previousFrame = null;
let motionAmount = 0;
let smoothedAmount = 0;
let motionCenter = null;
let motionMask = null;
let threshold = 40;

// The longest side of the small copy of the picture that is compared.
const SCAN_SIZE = 160;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // The front camera, drawn like a mirror. On a phone you can prop it up and see yourself move.
  cam = createPhoneCamera('user', true, 'contain');
  // The previous frame belongs to the old camera after a switch. Drop it.
  createCameraSwitch(cam, { onAfterSwitch: () => { previousFrame = null; } });
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
    // The camera sends about 30 frames a second and draw() runs about 60
    // times, so only compare when a new frame has arrived. Comparing a frame
    // with itself would report zero motion every other draw().
    if (isNewFrame(cam)) {
      const frame = grabFrame(cam, SCAN_SIZE);
      if (frame) detectMotion(frame);
    }
    if (motionMask) drawOverCamera(cam, motionMask);
    drawMotionCenter();
  }

  drawMeter();
  drawCameraOn(cam);
}

function detectMotion(frame) {
  const current = frame.imageData.data;

  // grabFrame() reuses one ImageData, so keep our own copy of this frame.
  if (!previousFrame || previousFrame.length !== current.length) {
    previousFrame = new Uint8ClampedArray(current);
    return;
  }

  if (!motionMask || motionMask.width !== frame.width || motionMask.height !== frame.height) {
    motionMask = createImage(frame.width, frame.height);
  }
  motionMask.loadPixels();

  let changed = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = 4 * (y * frame.width + x);
      // Compare brightness, the average of red, green and blue.
      const now = (current[index] + current[index + 1] + current[index + 2]) / 3;
      const before = (previousFrame[index] + previousFrame[index + 1] + previousFrame[index + 2]) / 3;
      const moved = Math.abs(now - before) > threshold;

      motionMask.pixels[index] = 0;
      motionMask.pixels[index + 1] = 255;
      motionMask.pixels[index + 2] = 160;
      motionMask.pixels[index + 3] = moved ? 170 : 0;

      if (moved) {
        changed += 1;
        sumX += x;
        sumY += y;
      }
    }
  }
  motionMask.updatePixels();
  previousFrame.set(current);

  motionAmount = changed / (frame.width * frame.height);
  smoothedAmount = lerp(smoothedAmount, motionAmount, 0.2);
  motionCenter = changed > 20
    ? mapFramePoint(cam, frame, { x: sumX / changed, y: sumY / changed })
    : null;
}

function drawMotionCenter() {
  if (!motionCenter) return;
  noFill();
  stroke(255);
  strokeWeight(4);
  circle(motionCenter.x, motionCenter.y, 40);
}

function drawMeter() {
  const panelHeight = 68;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);

  // Bar showing the smoothed amount of motion. 25% of the frame fills it.
  const barWidth = width - 32;
  fill(255, 40);
  rect(16, height - 24, barWidth, 8, 4);
  fill(0, 255, 160);
  rect(16, height - 24, barWidth * constrain(smoothedAmount * 4, 0, 1), 8, 4);

  textAlign(LEFT, CENTER);
  if (cam.ready) {
    fill(247);
    textSize(15);
    text('Motion ' + nf(motionAmount * 100, 1, 1) + '%. Keep the camera still.', 16, height - panelHeight + 15);
    fill(180);
    textSize(13);
    text('Threshold ' + threshold + '. Drag up or down to change it.', 16, height - panelHeight + 33);
  } else {
    fill(247);
    textSize(15);
    text('Waiting for the camera.', 16, height - panelHeight + 20);
  }
}

function mouseDragged() {
  if (cameraSwitchJustPressed()) return false;
  threshold = constrain(threshold - (mouseY - pmouseY), 5, 150);
  return false;
}

function mousePressed() {
  return false;
}

// On a laptop, the up and down arrow keys change the threshold too.
function keyPressed() {
  if (keyIsDown(UP_ARROW)) threshold = constrain(threshold + 5, 5, 150);
  if (keyIsDown(DOWN_ARROW)) threshold = constrain(threshold - 5, 5, 150);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
