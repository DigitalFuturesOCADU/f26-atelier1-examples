// 05 Face Mesh
// ml5 FaceMesh finds 468 points on a face.
// This sketch measures the gap between the upper and lower lip and divides it by the
// width of the face. The value stays the same whether the face is near or far.
// It also measures how far the head tilts.
//
// Try this
//   Open your mouth slowly. Watch the red line and the meter at the bottom.
//   Tilt your head left and right. A level head reads 0.
//   Tap the screen to hide the video. Only the points are left.
//
// Key data
//   faces      ml5's results. Each face has keypoints (468 of { x, y, z }, in video pixels),
//              a box, and named regions such as lips and leftEye.
//   mouthOpen  lip gap divided by face width. About 0 when closed and 0.5 wide open.
//   headTilt   the angle of the line between the cheeks, in degrees.
//
// Useful points
//   4 nose tip, 13 upper lip, 14 lower lip, 152 chin, 234 and 454 the sides of the face.
//
// Model
//   ml5 1.4.0 with the mediapipe runtime. The model files download from jsDelivr the
//   first time. That is about 5 MB over the network (10 MB unpacked), so use Wi-Fi.
//   The browser keeps them for next time.
//
// Phone and laptop
//   This example starts on the front camera everywhere. Hold the phone at arm's length
//   so the whole face is in view. The camera button switches to the rear camera.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Adapted from p5-phone's examples/ml5/PHONE_FaceMesh_two_points.
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/foundations/ml5-facemesh/

let cam;
let faceMesh;
let faces = [];
let showVideo = true;

let upperLipIndex = 13;
let lowerLipIndex = 14;
let leftSideIndex = 234;
let rightSideIndex = 454;

let mouthOpen = 0;
let headTilt = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam, {
    onBeforeSwitch: () => { if (faceMesh) faceMesh.detectStop(); faces = []; },
    onAfterSwitch: () => { if (faceMesh) faceMesh.detectStart(cam.videoElement, gotFaces); }
  });
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }

  setLoading('Waiting for the camera');
  cam.onReady(() => {
    setLoading('Loading FaceMesh');
    const options = { maxFaces: 1, refineLandmarks: false, runtime: 'mediapipe', flipped: false };
    faceMesh = ml5.faceMesh(options, () => {
      faceMesh.detectStart(cam.videoElement, gotFaces);
      clearLoading();
    });
  });
}

function gotFaces(results) {
  faces = results || [];
}

function draw() {
  background(16, 19, 24);
  if (showVideo) drawPhoneCamera(cam);

  if (faces.length > 0) {
    const points = cam.mapKeypoints(faces[0].keypoints);

    // The whole mesh as faint dots
    noStroke();
    fill(255, 255, 255, 90);
    for (const point of points) {
      circle(point.x, point.y, 3);
    }

    const upperLip = points[upperLipIndex];
    const lowerLip = points[lowerLipIndex];
    const leftSide = points[leftSideIndex];
    const rightSide = points[rightSideIndex];

    const faceWidth = dist(leftSide.x, leftSide.y, rightSide.x, rightSide.y);
    const lipGap = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
    // Smooth a little so the value doesn't flicker.
    mouthOpen = lerp(mouthOpen, lipGap / faceWidth, 0.4);
    // Measure tilt from whichever cheek is on the left of the screen. The
    // mirrored front camera swaps them, and a level head should read 0°.
    const [screenLeft, screenRight] = leftSide.x < rightSide.x ? [leftSide, rightSide] : [rightSide, leftSide];
    headTilt = degrees(atan2(screenRight.y - screenLeft.y, screenRight.x - screenLeft.x));

    // Face width line
    stroke(255, 165, 0);
    strokeWeight(2);
    line(leftSide.x, leftSide.y, rightSide.x, rightSide.y);

    // Lip gap, coloured by how open the mouth is
    stroke(lerpColor(color(60, 120, 255), color(255, 60, 60), constrain(mouthOpen * 3, 0, 1)));
    strokeWeight(5);
    line(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  }

  drawPanel();
  drawStatus();
  drawCameraOn(cam);
}

function drawPanel() {
  const panelHeight = 56;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);

  // Meter for mouth openness
  fill(255, 40);
  rect(16, height - 14, width - 32, 6, 3);
  fill(255, 90, 90);
  rect(16, height - 14, (width - 32) * constrain(mouthOpen * 2, 0, 1), 6, 3);

  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Show your face.';
  if (!cam.ready) message = 'Waiting for the camera.';
  else if (faces.length > 0) message = 'Mouth ' + nf(mouthOpen, 1, 2) + '. Tilt ' + round(headTilt) + '°.';
  text(message, 16, height - panelHeight + 14);
  fill(180);
  textSize(13);
  text('Tap to ' + (showVideo ? 'hide' : 'show') + ' the video.', 16, height - panelHeight + 32);
}

function mousePressed() {
  if (cameraSwitchJustPressed()) return false;
  if (cam.ready) showVideo = !showVideo;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
