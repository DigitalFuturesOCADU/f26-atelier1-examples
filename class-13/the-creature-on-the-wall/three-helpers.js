// ==============================================
// three-helpers.js: two small helpers for three.js camera sketches
// ==============================================
// Needs window.THREE (set by the page's module loader, three-phone style).
//
//   const f = matchCameraToVideo(camera, cam, renderer, 60);
//       Sets a PerspectiveCamera's field of view and aspect so 3D objects line up
//       with a three-phone camera feed shown with mode 'cover' (cam.attachBackground).
//       Returns the focal length in video pixels, for pose estimation.
//
//   IS_PHONE
//       true on phones and tablets. p5-phone has window.isMobile. three-phone 0.2.0
//       does not, so this repeats p5-phone's checks.
//
// Copied from browserCV-2026 shared/three-helpers.js. Its label helper is left out.
// ==============================================

// Same checks as p5-phone's _isMobileDevice(): mobile user agent, iPadOS
// (a Mac user agent with touch), or a finger as the main pointer.
const IS_PHONE = (() => {
  const ua = navigator.userAgent || '';
  return /android|iphone|ipod|mobile|windows phone/i.test(ua) ||
    (/mac/i.test(ua) && navigator.maxTouchPoints > 1) ||
    window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && !window.matchMedia('(any-pointer: fine)').matches);
})();

// A camera's field of view is rarely known exactly. Most laptop webcams and
// phone cameras fall between 55 and 75 degrees across; 60 is a fair guess.
function matchCameraToVideo(camera, cam, renderer, horizontalFovDegrees) {
  const video = cam.videoElement;
  if (!video || !video.videoWidth) return null;
  const canvas = { w: renderer.domElement.clientWidth, h: renderer.domElement.clientHeight };
  // Focal length in video pixels, from the assumed horizontal field of view.
  const focal = (video.videoWidth / 2) / Math.tan(THREE.MathUtils.degToRad(horizontalFovDegrees) / 2);
  // 'cover' scales the video to fill the canvas and crops the rest. Work out
  // how many video pixels tall the visible part is.
  const scale = Math.max(canvas.w / video.videoWidth, canvas.h / video.videoHeight);
  const visibleHeight = canvas.h / scale;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((visibleHeight / 2) / focal));
  camera.aspect = canvas.w / canvas.h;
  camera.updateProjectionMatrix();
  return focal;
}
