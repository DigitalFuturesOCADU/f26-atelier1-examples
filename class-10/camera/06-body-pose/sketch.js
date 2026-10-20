// 06 Body Pose
// ml5 BodyPose finds 33 points on a body, with the BlazePose model.
// This sketch draws the skeleton. It checks whether each wrist is above its shoulder.
//
// Try this
//   Step back so your upper body is in view. Raise one arm, then the other.
//   A raised wrist gets a yellow ring, and the panel at the bottom says up.
//   This model works best with one person in view.
//   Tap the screen to hide the video. Only the skeleton is left.
//
// Key data
//   poses       ml5's results. Each pose has keypoints (33 of { x, y, confidence, name },
//               in video pixels), keypoints3D, and each point by name, like pose.left_wrist.
//   connections pairs of point numbers for drawing the skeleton, from bodyPose.getSkeleton()
//   leftArmUp, rightArmUp  true when that wrist is above its shoulder. Both points need a
//               confidence above CONFIDENCE (0.3). The line through each shoulder shows the
//               test: a wrist above its line counts as up, and the line turns yellow.
//
// The points
//   0 nose, 11 and 12 shoulders, 13 and 14 elbows, 15 and 16 wrists, 23 and 24 hips,
//   25 and 26 knees, 27 and 28 ankles. Odd numbers are the person's left side.
//   The picture is mirrored like a mirror, so your left arm shows on the left of the screen.
//
// Model
//   ml5 1.4.0 with the mediapipe runtime. modelType 'lite' is the fastest model.
//   The model files download from jsDelivr the first time. That is about 6.5 MB over the
//   network (11 MB unpacked), so use Wi-Fi. The browser keeps them for next time.
//   'full' and 'heavy' are more exact and much bigger.
//
// Phone and laptop
//   This example starts on the front camera everywhere. Prop the phone up and step back a
//   few steps. The camera button switches to the rear camera, to follow someone else.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Adapted from p5-phone's examples/ml5/PHONE_BodyPose_two_points.
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/foundations/ml5-bodypose/

let cam;
let bodyPose;
let poses = [];
let connections = [];
let showVideo = true;

let leftArmUp = false;
let rightArmUp = false;

// Points the model is less sure about than this are ignored.
const CONFIDENCE = 0.3;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam, {
    onBeforeSwitch: () => { if (bodyPose) bodyPose.detectStop(); poses = []; },
    onAfterSwitch: () => { if (bodyPose) bodyPose.detectStart(cam.videoElement, gotPoses); }
  });
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }

  setLoading('Waiting for the camera');
  cam.onReady(() => {
    setLoading('Loading BodyPose');
    const options = {
      runtime: 'mediapipe',
      modelType: 'lite',       // 'lite' is fastest. 'full' and 'heavy' are more accurate.
      enableSmoothing: true,
      flipped: false
    };
    bodyPose = ml5.bodyPose('BlazePose', options, () => {
      connections = bodyPose.getSkeleton();
      bodyPose.detectStart(cam.videoElement, gotPoses);
      clearLoading();
    });
  });
}

function gotPoses(results) {
  poses = results || [];
}

function draw() {
  background(16, 19, 24);
  if (showVideo) drawPhoneCamera(cam);

  leftArmUp = false;
  rightArmUp = false;

  for (const pose of poses) {
    const points = cam.mapKeypoints(pose.keypoints);

    // Skeleton lines between confident keypoints
    stroke(255, 200);
    strokeWeight(3);
    for (const [a, b] of connections) {
      if (points[a].confidence > CONFIDENCE && points[b].confidence > CONFIDENCE) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    noStroke();
    fill(0, 220, 255);
    for (const point of points) {
      if (point.confidence > CONFIDENCE) circle(point.x, point.y, 10);
    }
  }

  if (poses.length > 0) {
    const points = poses[0].keypoints;
    // Compare in video coordinates: "above" means a smaller y.
    leftArmUp = isAbove(points[15], points[11]);
    rightArmUp = isAbove(points[16], points[12]);
    const leftShoulder = cam.mapKeypoint(points[11]);
    const rightShoulder = cam.mapKeypoint(points[12]);
    drawShoulderLine(leftShoulder, rightShoulder, leftArmUp);
    drawShoulderLine(rightShoulder, leftShoulder, rightArmUp);
    highlightWrist(cam.mapKeypoint(points[15]), leftArmUp);
    highlightWrist(cam.mapKeypoint(points[16]), rightArmUp);
  }

  drawPanel();
  drawStatus();
  drawCameraOn(cam);
}

function isAbove(wrist, shoulder) {
  return wrist.confidence > CONFIDENCE && shoulder.confidence > CONFIDENCE && wrist.y < shoulder.y;
}

// The test for one arm, drawn: a level line through the shoulder, reaching out past the arm.
// A wrist above the line counts as up. (Above means a smaller y, on the screen too.)
function drawShoulderLine(shoulder, otherShoulder, isUp) {
  if (shoulder.confidence < CONFIDENCE) return;
  const out = shoulder.x < otherShoulder.x ? -1 : 1; // away from the body, on the screen
  const reach = max(140, abs(shoulder.x - otherShoulder.x) * 1.8);
  const endX = constrain(shoulder.x + out * reach, 10, width - 10);
  stroke(isUp ? color(255, 210, 0) : color(255, 255, 255, 170));
  strokeWeight(isUp ? 4 : 2);
  line(shoulder.x - out * 20, shoulder.y, endX, shoulder.y);

  // at the outer end: up above the line, down below it
  noStroke();
  fill(isUp ? color(255, 210, 0) : color(255, 255, 255, 200));
  textSize(13);
  textStyle(NORMAL);
  textAlign(out > 0 ? RIGHT : LEFT, CENTER);
  text('up', endX, shoulder.y - 12);
  text('down', endX, shoulder.y + 12);
}

function highlightWrist(wrist, isUp) {
  if (wrist.confidence < CONFIDENCE) return;
  noFill();
  stroke(isUp ? color(255, 210, 0) : color(255, 255, 255, 120));
  strokeWeight(isUp ? 6 : 2);
  circle(wrist.x, wrist.y, isUp ? 60 : 36);
}

function drawPanel() {
  const panelHeight = 56;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);
  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Step back. Show your upper body.';
  if (!cam.ready) message = 'Waiting for the camera.';
  else if (poses.length > 0) {
    // Point 15 is the person's left wrist. With the mirrored front camera it
    // appears on the left of the screen, like a mirror.
    message = 'Left arm ' + (leftArmUp ? 'up' : 'down') + '. Right arm ' + (rightArmUp ? 'up' : 'down') + '.';
  }
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
