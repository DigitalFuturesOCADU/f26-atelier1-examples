// ==============================================
// frame.js — downscaled camera frames for detectors that read pixels
// ==============================================
// Marker, QR and pixel detectors work on ImageData. Running them on a full
// camera frame is slow on phones, so this draws the current video frame into
// a small offscreen canvas first.
//
//   drawPhoneCamera(cam);                 // draw the feed (fit + mirror)
//   if (isNewFrame(cam)) { ... }          // once per camera frame (call once per draw)
//   const frame = grabFrame(cam, 480);    // longest side at most 480 px
//   frame.imageData                       // RGBA ImageData for the detector
//   frame.canvas                          // the offscreen canvas itself
//   frame.width, frame.height             // its size
//   const p = mapFramePoint(cam, frame, corner);  // frame px -> canvas px
//   const v = canvasToVideo(cam, mouseX, mouseY); // canvas px -> video px
//   drawOverCamera(cam, overlayImage);   // draw a frame-sized image on the video
//
// The frame is never mirrored. mapFramePoint() scales back up to video
// pixels and then uses PhoneCamera.mapPoint(), which applies the display
// fit and the mirror, so detections line up with image(cam, ...).
//
// For the p5.js Web Editor, upload this file next to sketch.js and change
// the <script src> in index.html to "frame.js".
// ==============================================

let cvFrameCanvas = null;
let cvFrameContext = null;

function grabFrame(cam, maxSide = 480) {
  const video = cam.videoElement;
  if (!cam.ready || !video || video.readyState < 2 || !video.videoWidth) {
    return null;
  }

  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const frameWidth = Math.round(video.videoWidth * scale);
  const frameHeight = Math.round(video.videoHeight * scale);

  if (!cvFrameCanvas) {
    cvFrameCanvas = document.createElement('canvas');
    cvFrameContext = cvFrameCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (cvFrameCanvas.width !== frameWidth || cvFrameCanvas.height !== frameHeight) {
    cvFrameCanvas.width = frameWidth;
    cvFrameCanvas.height = frameHeight;
  }

  cvFrameContext.drawImage(video, 0, 0, frameWidth, frameHeight);

  return {
    canvas: cvFrameCanvas,
    context: cvFrameContext,
    imageData: cvFrameContext.getImageData(0, 0, frameWidth, frameHeight),
    width: frameWidth,
    height: frameHeight,
    scale: scale
  };
}

// draw() usually runs at 60 fps and cameras deliver 30, so half the draw()
// calls see the same video frame again. isNewFrame(cam) is true once per new
// camera frame: use it to skip repeated work, or (for frame differencing)
// to avoid comparing a frame with itself.
const cvFrameCounts = new WeakMap();
let cvLastSeen = { video: null, count: -1, time: -1 };

function isNewFrame(cam) {
  const video = cam.videoElement;
  if (!cam.ready || !video || video.readyState < 2) return false;

  if (video.requestVideoFrameCallback && !cvFrameCounts.has(video)) {
    cvFrameCounts.set(video, 0);
    const countFrame = () => {
      cvFrameCounts.set(video, cvFrameCounts.get(video) + 1);
      video.requestVideoFrameCallback(countFrame);
    };
    video.requestVideoFrameCallback(countFrame);
  }

  if (cvLastSeen.video !== video) {
    cvLastSeen = { video: video, count: -1, time: -1 };
  }
  // requestVideoFrameCallback counts real frames. Without it, fall back to
  // the video clock, which also advances once per frame for camera streams.
  const count = cvFrameCounts.has(video) ? cvFrameCounts.get(video) : -1;
  const isNew = count >= 0 ? count !== cvLastSeen.count : video.currentTime !== cvLastSeen.time;
  cvLastSeen.count = count;
  cvLastSeen.time = video.currentTime;
  return isNew;
}

function mapFramePoint(cam, frame, point) {
  return cam.mapPoint(point.x / frame.scale, point.y / frame.scale);
}

// Draw the camera feed with its fit mode and mirror. Same result as
// image(cam, 0, 0), copied from p5-phone's ml5 examples. With p5.js 2.2.3,
// image(cam, ...) logs a friendly-error warning on every frame.
function drawPhoneCamera(cam) {
  const video = cam.videoElement;
  if (!cam.ready || !video || video.readyState < 2) return;
  const dims = cam.getDimensions();
  push();
  if (cam.mirror) {
    translate(width, 0);
    scale(-1, 1);
  }
  drawingContext.drawImage(video, dims.x, dims.y, dims.width, dims.height);
  pop();
}

// The reverse of cam.mapPoint(): a canvas point (a tap) to video pixels.
// inside is false when the point falls outside the drawn video.
function canvasToVideo(cam, x, y) {
  const dims = cam.getDimensions();
  if (!dims.width) return { x: 0, y: 0, inside: false };
  let localX = x - dims.x;
  const localY = y - dims.y;
  if (cam.mirror) localX = dims.width - localX;
  return {
    x: localX / dims.scaleX,
    y: localY / dims.scaleY,
    inside: localX >= 0 && localX <= dims.width && localY >= 0 && localY <= dims.height
  };
}

// Draw any image that covers the whole video frame (a mask, a depth map, a
// pixel overlay) exactly where image(cam, ...) put the video, mirror included.
function drawOverCamera(cam, overlay) {
  const dims = cam.getDimensions();
  if (!dims.width) return;
  push();
  if (cam.mirror) {
    translate(width, 0);
    scale(-1, 1);
  }
  image(overlay, dims.x, dims.y, dims.width, dims.height);
  pop();
}
