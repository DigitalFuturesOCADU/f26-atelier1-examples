// 07 Gesture Recognizer
// MediaPipe's GestureRecognizer finds hands, their 21 points, and a name for what each
// hand is doing. Here the gestures are controls. You draw in the air.
//
//   Pointing_Up   Point your index finger up to draw with the fingertip.
//   Open_Palm     Show an open palm to clear the drawing.
//   Thumb_Up      Show a thumbs up to change the colour.
//
// The other built-in gestures are Closed_Fist, Thumb_Down, Victory and ILoveYou.
// None means a hand that is not making any of them.
//
// Try this
//   Draw a shape, then clear it. Then try a fist, a victory sign and a thumbs down.
//   Each one is only a label on the hand. Make them do something in your own sketch.
//
// Key data
//   result.gestures    for each hand: [{ categoryName, score }], best guess first
//   result.handedness  for each hand: [{ categoryName: 'Left' | 'Right', score }]
//   result.landmarks   for each hand: 21 of { x, y, z }. x and y run from 0 to 1.
//   hands              [{ gesture, score, side, points }] with points in canvas pixels
//   An action runs once when a gesture starts, not on every frame you hold it.
//
// Model
//   MediaPipe tasks-vision 1.1.0. The model is gesture_recognizer, float16, about 8 MB.
//   The MediaPipe wasm file is about 3 MB over the network (12 MB unpacked). All of it
//   downloads the first time, so use Wi-Fi. The browser keeps it for next time.
//   It uses the GPU, and the CPU if it must.
//   MediaPipe loads here the way Golan Levin's p5 sketches load it, with import():
//   https://editor.p5js.org/golan/sketches/0XkgzZGe8
//
// Phone and laptop
//   This example starts on the front camera everywhere. Hold the phone at arm's length,
//   or prop it up, so your hand stays in view.
//   The camera button switches to the rear camera.
//   The first tap turns the camera on. iPhones need that tap.
//
// Nothing is recorded or saved. The drawing is only on the screen, and it is gone when
// you close the page. The camera image stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Also in browserCV-2026:
// https://npuckett.github.io/browserCV-2026/p5/detection/mp-gesture-recognizer/

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const COLORS = ['#ffd200', '#ff4f7b', '#3fd0ff', '#7dff6a', '#ffffff'];

let cam;
let recognizer = null;
let delegate = '';
let result = null;
let hands = [];
let lastTimestamp = 0;

let drawing;            // p5.Graphics that keeps the strokes
let colorIndex = 0;
let previousTip = null; // last fingertip position while drawing
let previousGesture = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');
  drawing = createGraphics(width, height);

  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }

  loadRecognizer();
}

async function loadRecognizer() {
  try {
    setLoading('Loading MediaPipe');
    const { GestureRecognizer, FilesetResolver } = await import(MP_URL + '/vision_bundle.mjs');
    const vision = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');

    setLoading('Downloading the model (about 11 MB)');
    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2
    };
    try {
      recognizer = await GestureRecognizer.createFromOptions(vision, options);
      delegate = 'GPU';
    } catch (gpuError) {
      options.baseOptions.delegate = 'CPU';
      recognizer = await GestureRecognizer.createFromOptions(vision, options);
      delegate = 'CPU';
    }
    clearLoading();
  } catch (error) {
    setError('The model did not load. Check the Wi-Fi, then reload the page. ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  const video = cam.videoElement;
  if (recognizer && isNewFrame(cam) && video.videoWidth > 0) {
    lastTimestamp = Math.max(performance.now(), lastTimestamp + 1);
    result = recognizer.recognizeForVideo(video, lastTimestamp);
    hands = toHands(result, video);
    useGestures();
  }

  image(drawing, 0, 0);
  for (const hand of hands) drawHand(hand);
  drawPanel();
  // The start box covers the middle until the camera is on, so the loading message waits for it.
  if (cam.ready) drawStatus();
  drawCameraOn(cam);
}

// Landmarks are normalized (0 to 1). Scale to video pixels, then map to the canvas.
function toHands(recognition, video) {
  return recognition.landmarks.map((landmarks, i) => {
    const best = recognition.gestures[i][0];
    return {
      gesture: best ? best.categoryName : 'None',
      score: best ? best.score : 0,
      side: recognition.handedness[i][0].categoryName,
      points: landmarks.map((p) => cam.mapPoint(p.x * video.videoWidth, p.y * video.videoHeight))
    };
  });
}

// Turn the first hand's gesture into actions.
function useGestures() {
  const hand = hands[0];
  const gesture = hand ? hand.gesture : 'None';

  if (gesture === 'Pointing_Up') {
    const tip = hand.points[8]; // index fingertip
    if (previousTip) {
      drawing.stroke(COLORS[colorIndex]);
      drawing.strokeWeight(10);
      drawing.line(previousTip.x, previousTip.y, tip.x, tip.y);
    }
    previousTip = tip;
  } else {
    previousTip = null;
  }

  // Act once when a gesture starts, not on every frame it is held.
  if (gesture !== previousGesture) {
    if (gesture === 'Open_Palm') drawing.clear();
    if (gesture === 'Thumb_Up') colorIndex = (colorIndex + 1) % COLORS.length;
  }
  previousGesture = gesture;
}

function drawHand(hand) {
  noStroke();
  fill(255, 160);
  for (const point of hand.points) circle(point.x, point.y, 7);

  // Label near the wrist
  const wrist = hand.points[0];
  const label = hand.gesture + ' ' + round(hand.score * 100) + '%';
  textSize(15);
  textAlign(CENTER, CENTER);
  fill(0, 180);
  rect(wrist.x - textWidth(label) / 2 - 8, wrist.y + 14, textWidth(label) + 16, 26, 6);
  fill(255);
  text(label, wrist.x, wrist.y + 27);
}

function drawPanel() {
  const panelHeight = 56;
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - panelHeight, width, panelHeight);

  // the colour you are drawing with
  fill(COLORS[colorIndex]);
  circle(30, height - panelHeight / 2, 22);

  textAlign(LEFT, CENTER);
  fill(247);
  textSize(15);
  if (cam.ready) {
    text('Point up to draw. Open palm to clear.', 52, height - panelHeight + 18);
    fill(180);
    textSize(13);
    text('Thumbs up for a new colour.', 52, height - panelHeight + 38);
    if (delegate) {
      textAlign(RIGHT, CENTER);
      text(delegate, width - 16, height - panelHeight + 38);
    }
  } else {
    text('Waiting for the camera.', 52, height - panelHeight / 2);
  }
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Keep the strokes: copy the old drawing into a layer of the new size.
  // max(1, ...) because a hidden window can briefly report a size of 0.
  const resized = createGraphics(max(1, width), max(1, height));
  resized.image(drawing, 0, 0);
  drawing = resized;
}
