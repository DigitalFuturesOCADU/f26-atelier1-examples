// 04 Hand Pose
// ml5 HandPose finds up to two hands and 21 points on each one.
// This sketch follows two of those points, the thumb tip and the index fingertip.
// It measures the distance and the angle between them. A short distance is a pinch.
//
// Try this
//   Hold your hand up and watch the 21 points follow it.
//   Pinch your thumb and finger together. The line turns yellow and says Pinch.
//   Change pointIndexA and pointIndexB to follow any two of the 21 points.
//   Tap the screen to hide the video. Only the points are left.
//
// Key data
//   hands          ml5's results. Each hand has keypoints (21 of { x, y, name }, in video
//                  pixels), keypoints3D, handedness ('Left' or 'Right') and confidence.
//   pointA, pointB the two followed keypoints, in canvas pixels
//   pinchDistance  the distance between them, in canvas pixels
//   pinchAngle     the angle from A to B in degrees. 0 means pointing right.
//
// The 21 points
//   0 wrist, thumb 1 to 4, index 5 to 8, middle 9 to 12, ring 13 to 16, pinky 17 to 20.
//   The last number of each finger is its tip.
//   handedness assumes a mirrored picture, and this camera picture is not mirrored.
//   So Left can mean your right hand. Test it with your own hand before you use it.
//
// Model
//   ml5 1.4.0 with the mediapipe runtime. The model files download from jsDelivr the
//   first time. That is about 9 MB over the network (15 MB unpacked), so use Wi-Fi.
//   The browser keeps them for next time.
//   A recent phone runs it at 15 to 30 frames a second.
//
// Phone and laptop
//   This example starts on the front camera everywhere. The camera button switches to
//   the rear camera, to follow someone else's hands.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Adapted from p5-phone's examples/ml5/PHONE_HandPose_two_points.
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/foundations/ml5-handpose/

let cam;
let handPose;
let hands = [];
let showVideo = true;

// Change these to follow any two of the 21 points.
let pointIndexA = 4;   // thumb tip
let pointIndexB = 8;   // index finger tip
let pointA = null;
let pointB = null;
let pinchDistance = 0;
let pinchAngle = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // Hands are easiest with the front camera, on a phone and on a laptop.
  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam, {
    onBeforeSwitch: () => { if (handPose) handPose.detectStop(); hands = []; },
    onAfterSwitch: () => { if (handPose) handPose.detectStart(cam.videoElement, gotHands); }
  });
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }

  setLoading('Waiting for the camera');
  cam.onReady(() => {
    setLoading('Loading HandPose');
    // runtime 'mediapipe' loads from jsDelivr in a second or two.
    // flipped false: PhoneCamera's map helpers already handle the mirror.
    const options = { maxHands: 2, runtime: 'mediapipe', flipped: false };
    // In a p5 sketch, start detecting from ml5's ready callback, not after await.
    handPose = ml5.handPose(options, () => {
      handPose.detectStart(cam.videoElement, gotHands);
      clearLoading();
    });
  });
}

function gotHands(results) {
  hands = results || [];
}

function draw() {
  background(16, 19, 24);
  if (showVideo) drawPhoneCamera(cam);

  pointA = null;
  pointB = null;

  for (const hand of hands) {
    // All 21 keypoints, small and faint
    for (const keypoint of cam.mapKeypoints(hand.keypoints)) {
      noStroke();
      fill(255, 255, 255, 140);
      circle(keypoint.x, keypoint.y, 8);
    }
  }

  if (hands.length > 0) {
    pointA = cam.mapKeypoint(hands[0].keypoints[pointIndexA]);
    pointB = cam.mapKeypoint(hands[0].keypoints[pointIndexB]);
    pinchDistance = dist(pointA.x, pointA.y, pointB.x, pointB.y);
    pinchAngle = degrees(atan2(pointB.y - pointA.y, pointB.x - pointA.x));
    drawMeasurement();
  }

  drawPanel();
  drawStatus();
  drawCameraOn(cam);
}

function drawMeasurement() {
  // The pinch size scales with the screen, so it feels the same on any device.
  const isPinching = pinchDistance < min(width, height) * 0.06;

  stroke(isPinching ? color(255, 210, 0) : color(255, 165, 0));
  strokeWeight(isPinching ? 6 : 3);
  line(pointA.x, pointA.y, pointB.x, pointB.y);

  noStroke();
  fill(255, 60, 60);
  circle(pointA.x, pointA.y, 22);
  fill(60, 120, 255);
  circle(pointB.x, pointB.y, 22);

  fill(255);
  textAlign(CENTER, BOTTOM);
  textSize(14);
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;
  text(round(pinchDistance) + ' px, ' + round(pinchAngle) + '°' + (isPinching ? '. Pinch.' : ''), midX, midY - 14);
}

function drawPanel() {
  const panelHeight = 56;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);
  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Show your hand.';
  if (!cam.ready) message = 'Waiting for the camera.';
  else if (hands.length > 0) message = hands.length + (hands.length > 1 ? ' hands.' : ' hand.');
  text(message, 16, height - panelHeight + 18);
  fill(180);
  textSize(13);
  text('Tap to ' + (showVideo ? 'hide' : 'show') + ' the video.', 16, height - panelHeight + 38);
}

function mousePressed() {
  if (cameraSwitchJustPressed()) return false;
  if (cam.ready) showVideo = !showVideo;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
