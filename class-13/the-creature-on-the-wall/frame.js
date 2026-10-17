// ==============================================
// frame.js: downscaled camera frames for detectors that read pixels
// ==============================================
// Marker detectors work on ImageData. Running them on a full camera frame is
// slow on a phone, so this draws the current video frame into a small
// offscreen canvas first.
//
//   if (isNewFrame(cam)) { ... }          // once per camera frame (call once per frame)
//   const frame = grabFrame(cam, 640);    // longest side at most 640 px
//   frame.imageData                       // RGBA ImageData for the detector
//   frame.width, frame.height             // its size
//   frame.scale                           // frame pixels per video pixel (1 or less)
//
// The frame is never mirrored.
//
// Copied from browserCV-2026 shared/frame.js. The p5.js drawing helpers in
// that file are left out, because this sketch has no p5.
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

// The animation loop usually runs at 60 fps and cameras deliver 30, so half
// the frames see the same video frame again. isNewFrame(cam) is true once per
// new camera frame: use it to skip repeated work.
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
