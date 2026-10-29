// Example 5: Face to Board (the laptop side)
// The camera watches your face. Tilt your head, and a servo on the Arduino tilts with it.
// Open your mouth, and the LED matrix on the board flashes.
// Made for a laptop and its webcam, in Chrome. A phone in Chrome on Android works too.
//
// It is the Class 10 example 05 Face Mesh with Bluetooth added. The face part is the same:
// ml5 FaceMesh finds 468 points on the face, and two numbers come from them.
//   headTilt    the angle of the line between the cheeks, in degrees. 0 is a level head
//   mouthOpen   the gap between the lips divided by the width of the face. 0 is closed
// This sketch turns them into two values for the board:
//   tilt    the head tilt as a servo angle, 0 to 180. 90 is a level head
//   mouth   true while the mouth is open past MOUTH_OPEN
//
// Arduino code for the board: FaceToBoard.zip
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/5-face-to-board/FaceToBoard.zip
// This sketch on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/l83G5eNmq
//
// Nothing is recorded or saved. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.

// 1. YOUR BOARD NUMBER
// Three digits, the same as BOARD_NUMBER in the Arduino code.
// It starts at 900, the class demo board. Change '900' at the end of the line below to your
// number. (The first part lets a page address such as ...?board=901 choose the board. Leave it.)
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '900';

// 2. THE ADDRESSES (UUIDs). They match the Arduino code.
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const TILT_UUID = '19b10001-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const MOUTH_UUID = '19b10004-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

// 3. THE FEEL
const TILT_RANGE = 30;     // degrees of head tilt, left or right, that turn the servo all the way
const MOUTH_OPEN = 0.25;   // mouthOpen above this counts as open. Try 0.15 to 0.4

// the face (from 05 Face Mesh)
let cam;
let faceMesh;
let faces = [];
let mouthOpen = 0;
let headTilt = 0;

// what goes to the board, and what it has now
let tilt = 90;
let mouth = false;
let sentTilt = -1;
let sentMouth = null;
let sending = false;
let connectButton;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');

  // 4. SET UP BLUETOOTH: one service, two values, both written by this page
  bleSetup({
    serviceUUID: SERVICE_UUID,
    characteristics: [
      { name: 'tilt', uuid: TILT_UUID, type: 'uint8', write: true },
      { name: 'mouth', uuid: MOUTH_UUID, type: 'bool', write: true }
    ]
  });
  connectButton = createButton('Connect');
  connectButton.position(20, 20);
  connectButton.mousePressed(connectOrDisconnect);

  // 5. THE CAMERA AND THE FACE MODEL (from 05 Face Mesh)
  cam = createPhoneCamera('user', true, 'contain');
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');
  setLoading('Waiting for the camera');
  cam.onReady(() => {
    setLoading('Loading FaceMesh');
    const options = { maxFaces: 1, refineLandmarks: false, runtime: 'mediapipe', flipped: false };
    faceMesh = ml5.faceMesh(options, () => {
      faceMesh.detectStart(cam.videoElement, gotFaces);
      clearLoading();
    });
  });
  lockGestures();

  // on a laptop, a QR code of this page so you can open it on your phone. In the Web Editor, save first
  showDesktopQr({ label: 'Open on your phone', size: 120 });
}

function gotFaces(results) {
  faces = results || [];
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  // 6. MEASURE THE FACE (from 05 Face Mesh)
  if (faces.length > 0) {
    const points = cam.mapKeypoints(faces[0].keypoints);
    const upperLip = points[13];
    const lowerLip = points[14];
    const leftSide = points[234];
    const rightSide = points[454];

    const faceWidth = dist(leftSide.x, leftSide.y, rightSide.x, rightSide.y);
    const lipGap = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
    mouthOpen = lerp(mouthOpen, lipGap / faceWidth, 0.4);
    const [screenLeft, screenRight] = leftSide.x < rightSide.x ? [leftSide, rightSide] : [rightSide, leftSide];
    headTilt = degrees(atan2(screenRight.y - screenLeft.y, screenRight.x - screenLeft.x));

    // 7. TURN THEM INTO VALUES FOR THE BOARD
    // the servo turns the wrong way? Swap 0 and 180
    tilt = round(map(headTilt, -TILT_RANGE, TILT_RANGE, 0, 180, true));
    mouth = mouthOpen > MOUTH_OPEN;

    // the cheek line and the lips, as in 05 Face Mesh
    stroke(255, 165, 0);
    strokeWeight(2);
    line(leftSide.x, leftSide.y, rightSide.x, rightSide.y);
    stroke(mouth ? color(255, 60, 60) : color(60, 120, 255));
    strokeWeight(5);
    line(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  }

  // 8. SEND WHAT CHANGED
  if (bleConnected && !sending) {
    sendToBoard();
  }

  drawPanel();
  drawStatus();      // the loading spinner, from loading.js
  drawCameraOn(cam);
}

// one write at a time. The mouth goes first: a flash should not wait for the servo
async function sendToBoard() {
  sending = true;
  if (mouth !== sentMouth) {
    const value = mouth;
    if (await bleWrite('mouth', value)) sentMouth = value;
  } else if (tilt !== sentTilt) {
    const value = tilt;
    if (await bleWrite('tilt', value)) sentTilt = value;
  }
  sending = false;
}

// the board just connected: send both again
function bleReady() {
  sentTilt = -1;
  sentMouth = null;
}

function connectOrDisconnect() {
  if (bleConnected) {
    bleDisconnect();
  } else {
    bleConnect();   // opens the list of boards. Pick Board- and your number
  }
}

function drawPanel() {
  const panelHeight = 64;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);
  fill(247);
  textSize(16);
  textAlign(LEFT, CENTER);
  let message = 'Show your face.';
  if (!cam.ready) message = 'Waiting for the camera.';
  else if (faces.length > 0) message = 'tilt ' + tilt + '   mouth ' + (mouth ? 'open' : 'closed') + '   (' + nf(mouthOpen, 1, 2) + ')';
  text(message, 16, height - panelHeight + 20);
  fill(180);
  textSize(14);
  let words = 'Not connected. Looking for Board-' + BOARD_NUMBER;
  if (bleConnected) words = 'Connected to ' + bleDeviceName;
  if (!bleSupported) words = 'No Bluetooth here. Use Chrome on a laptop or on Android.';
  text(words, 16, height - panelHeight + 44);
  connectButton.html(bleConnected ? 'Disconnect' : 'Connect');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
