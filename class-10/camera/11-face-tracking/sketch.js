// 11 Face Tracking
// Finds every face the camera can see and puts a box on each one. Made for a laptop
// at the front of a room, looking at everyone. It works on a phone too.
// MediaPipe's Face Detector: a small, fast model (BlazeFace, about 0.2 MB).
//
// The model is made for faces near the camera, within about 2 metres. To reach the back
// of a room, the sketch also checks the picture in pieces: a grid of overlapping tiles.
// In a tile, a face far away is big enough to find. Then the results are joined and the
// doubles (one face found in two tiles) are dropped.
//
// Try this
//   Run it on a laptop at the front of the room, facing everyone. Count the boxes.
//   Tap the screen, or press the space bar, to switch the tiles off and on. Compare the count.
//   Faces at the back still missing? Add ?grid=8x5 to the address. Slow? Try ?grid=4x3.
//   Each box shows how sure the model is. ?min=0.5 shows less sure ones too: some are not faces.
//   Turn your head away, cover your face, walk to the back. When does your box go?
//
// Key data
//   faces   every face found: [{ x, y, w, h, score }] in canvas pixels. x and y are the
//           top left of the box. score is how sure the model is, 0 to 1.
//   tiles   true when the picture is also checked in TILE_COLS x TILE_ROWS tiles
//
// Phone and laptop
//   A laptop uses its webcam, drawn like a mirror. A phone starts on the rear camera.
//   The camera button switches cameras when the device has two.
//   The first tap turns the camera on. iPhones need that tap.
//   The sketch asks the camera for 1280 x 720. More pixels let it find smaller faces.
//
// Nothing is recorded or saved. The camera image stays on this device.
// It finds faces. It does not know who anyone is.
// A small red dot and the words "Camera on" show in the corner while the camera runs.

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

// The grid of tiles, across and down. More, smaller tiles find faces farther away, but
// each tile takes time. Change it in the address without editing: ?grid=6x4
const GRID = (new URLSearchParams(location.search).get('grid') || '6x4').split('x').map(Number);
const TILE_COLS = GRID[0] || 6;
const TILE_ROWS = GRID[1] || 4;
const OVERLAP = 0.3;     // each tile reaches this far into its neighbours, so no face is cut in two
// Faces the model is less sure of than this are left out, 0 to 1. Lower finds more faces,
// and more hands and windows that look like faces. In the address: ?min=0.5
const MIN_SCORE = Number(new URLSearchParams(location.search).get('min')) || 0.6;

let cam;
let detector = null;
let delegate = '';
let faces = [];
let tiles = true;
let tileCanvas;          // a scratch canvas that holds one tile of the picture at a time
let askedForHD = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // A laptop webcam faces the room, drawn like a mirror. A phone starts on its rear camera.
  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to turn on the camera. Nothing is recorded.');

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }

  tileCanvas = document.createElement('canvas');
  loadDetector();
}

async function loadDetector() {
  try {
    setLoading('Loading MediaPipe');
    const { FaceDetector, FilesetResolver } = await import(MP_URL + '/vision_bundle.mjs');
    const vision = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');

    setLoading('Downloading the model');
    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'IMAGE',          // one picture at a time: the whole frame, then each tile
      minDetectionConfidence: MIN_SCORE
    };
    try {
      detector = await FaceDetector.createFromOptions(vision, options);
      delegate = 'GPU';
    } catch (gpuError) {
      options.baseOptions.delegate = 'CPU';
      detector = await FaceDetector.createFromOptions(vision, options);
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
  if (cam.ready && !askedForHD) askForHD(video);
  if (detector && isNewFrame(cam) && video.videoWidth > 0) {
    faces = findFaces(video);
  }

  for (let i = 0; i < faces.length; i++) drawFace(faces[i], i + 1);
  drawPanel();
  // The start box covers the middle until the camera is on, so the loading message waits for it.
  if (cam.ready) drawStatus();
  drawCameraOn(cam);
}

// Ask the camera for more pixels once it runs. If it can't, it keeps what it has.
function askForHD(video) {
  askedForHD = true;
  const track = video && video.srcObject && video.srcObject.getVideoTracks()[0];
  if (track && track.applyConstraints) {
    track.applyConstraints({ width: { ideal: 1280 }, height: { ideal: 720 } }).catch(() => {});
  }
}

// Every face in the picture, in canvas pixels.
function findFaces(video) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  let found = [];

  // 1. the whole picture: faces near the camera
  found = found.concat(facesIn(video, 0, 0, vw, vh, video));

  // 2. each tile: faces far away
  if (tiles) {
    const tileW = vw / TILE_COLS;
    const tileH = vh / TILE_ROWS;
    for (let row = 0; row < TILE_ROWS; row++) {
      for (let col = 0; col < TILE_COLS; col++) {
        const x0 = max(0, (col - OVERLAP) * tileW);
        const y0 = max(0, (row - OVERLAP) * tileH);
        const x1 = min(vw, (col + 1 + OVERLAP) * tileW);
        const y1 = min(vh, (row + 1 + OVERLAP) * tileH);
        tileCanvas.width = round(x1 - x0);
        tileCanvas.height = round(y1 - y0);
        tileCanvas.getContext('2d').drawImage(video, x0, y0, x1 - x0, y1 - y0, 0, 0, tileCanvas.width, tileCanvas.height);
        found = found.concat(facesIn(tileCanvas, x0, y0, x1 - x0, y1 - y0, video));
      }
    }
  }

  return dropDoubles(found).map(toCanvas);
}

// The faces the model finds in one picture, moved into video pixels.
// (x0, y0) is where that picture starts in the video.
function facesIn(picture, x0, y0, w, h, video) {
  const result = detector.detect(picture);
  const scaleX = w / (picture.width || picture.videoWidth);
  const scaleY = h / (picture.height || picture.videoHeight);
  return result.detections.map((d) => ({
    x: x0 + d.boundingBox.originX * scaleX,
    y: y0 + d.boundingBox.originY * scaleY,
    w: d.boundingBox.width * scaleX,
    h: d.boundingBox.height * scaleY,
    score: d.categories[0].score
  }));
}

// One face found twice (in the whole picture and in a tile, in two tiles that overlap, or
// in pieces where a tile cuts it): keep the surer box and drop any box mostly inside it.
function dropDoubles(list) {
  list.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const face of list) {
    if (!kept.some((other) => overlap(face, other) > 0.4)) kept.push(face);
  }
  return kept;
}

// How much of the smaller box lies inside the other: 0 is none of it, 1 is all of it.
function overlap(a, b) {
  const w = min(a.x + a.w, b.x + b.w) - max(a.x, b.x);
  const h = min(a.y + a.h, b.y + b.h) - max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / min(a.w * a.h, b.w * b.h);
}

// Video pixels -> canvas pixels. cam.mapPoint() handles the fit and the mirror,
// so the corners can swap sides. Take the smaller and larger afterwards.
function toCanvas(face) {
  const a = cam.mapPoint(face.x, face.y);
  const b = cam.mapPoint(face.x + face.w, face.y + face.h);
  return {
    x: min(a.x, b.x),
    y: min(a.y, b.y),
    w: abs(b.x - a.x),
    h: abs(b.y - a.y),
    score: face.score
  };
}

function drawFace(face, number) {
  noFill();
  stroke(255, 40, 40);
  strokeWeight(2);
  rect(face.x, face.y, face.w, face.h);

  // a small red tag above the box: its number and how sure the model is
  const words = 'FACE ' + number + ' · ' + round(face.score * 100) + '%';
  textSize(11);
  textStyle(BOLD);
  const tw = textWidth(words) + 8;
  noStroke();
  fill(255, 40, 40);
  rect(face.x, face.y - 16, tw, 16);
  fill(255);
  textAlign(LEFT, CENTER);
  text(words, face.x + 4, face.y - 8);
  textStyle(NORMAL);
}

function drawPanel() {
  const panelHeight = 56;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);
  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Waiting for the camera.';
  if (cam.ready && detector) message = faces.length + (faces.length === 1 ? ' face.' : ' faces.');
  text(message, 16, height - panelHeight + 18);
  fill(180);
  textSize(13);
  const video = cam.videoElement;
  const size = video && video.videoWidth ? video.videoWidth + ' x ' + video.videoHeight + '. ' : '';
  text(size + (tiles ? 'Whole picture and ' + TILE_COLS * TILE_ROWS + ' tiles.' : 'Whole picture only.') +
       ' Tap to switch.', 16, height - panelHeight + 38);
  if (delegate) {
    textAlign(RIGHT, CENTER);
    text(delegate, width - 16, height - panelHeight + 38);
  }
}

function mousePressed() {
  if (cameraSwitchJustPressed()) return false;
  if (cam.ready) tiles = !tiles;
  return false;
}

function keyPressed() {
  if (key === ' ') tiles = !tiles;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
