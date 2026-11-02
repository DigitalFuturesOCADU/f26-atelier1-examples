// ==============================================
// camera-on.js: a small "Camera on" mark in the corner of the screen
// ==============================================
// A red dot and the words "Camera on" show while the camera is running.
// This is for the person in front of the camera. They can see it is watching.
// Every camera example in Class 10 uses this same file.
//
//   drawCameraOn(cam);   // call it LAST in draw(), so it sits on top
//
// It checks the camera stream itself, so it shows only while a video track is live.
// It sits in the top right corner. On a laptop it moves left of the QR code while
// the QR code is showing.
//
// These sketches do not record or save the camera image. It stays on this device.
//
// For the p5.js Web Editor, upload this file next to sketch.js and add
// <script src="camera-on.js"></script> to index.html.
// ==============================================

// true while the camera stream has a live video track
function cameraIsOn(cam) {
  const video = cam && cam.videoElement;
  const stream = video && video.srcObject;
  if (!stream || !stream.getVideoTracks) return false;
  return stream.getVideoTracks().some((track) => track.readyState === 'live');
}

function drawCameraOn(cam) {
  if (!cameraIsOn(cam)) return;

  // This draws straight on the canvas, so the sketch's colorMode, text size and
  // transforms never change how it looks.
  const ctx = drawingContext;
  ctx.save();
  const density = pixelDensity();
  ctx.setTransform(density, 0, 0, density, 0, 0);

  const label = 'Camera on';
  ctx.font = '600 13px system-ui, sans-serif';
  const labelWidth = ctx.measureText(label).width;
  const boxHeight = 26;
  const boxWidth = 10 + 10 + 6 + labelWidth + 10;

  // Top right corner. A laptop QR code sits there too, so step left of it.
  let right = width - 14;
  const qr = document.getElementById('p5phoneDesktopQr');
  if (qr) right = Math.min(right, qr.getBoundingClientRect().left - 10);
  const left = right - boxWidth;
  const top = 14;

  // a dark pill so the words can be read over any picture
  const radius = boxHeight / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.arcTo(left + boxWidth, top, left + boxWidth, top + boxHeight, radius);
  ctx.arcTo(left + boxWidth, top + boxHeight, left, top + boxHeight, radius);
  ctx.arcTo(left, top + boxHeight, left, top, radius);
  ctx.arcTo(left, top, left + boxWidth, top, radius);
  ctx.closePath();
  ctx.fill();

  // the red dot, then the words
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(left + 10 + 5, top + boxHeight / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + 10 + 10 + 6, top + boxHeight / 2 + 0.5);
  ctx.restore();
}
