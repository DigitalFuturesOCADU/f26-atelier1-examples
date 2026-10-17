// ==============================================
// camera-switch.js — front/rear camera button for a p5-phone PhoneCamera
// ==============================================
// Adapted from the camera button in p5-phone's
// examples/ml5/PHONE_HandPose_two_points/sketch.js.
//
//   createCameraSwitch(cam, {
//     onBeforeSwitch() { model.detectStop(); },   // both optional
//     onAfterSwitch()  { model.detectStart(cam.videoElement, gotResults); }
//   });
//
// Sketches that pass cam.videoElement to the model every frame need no
// callbacks: the switch replaces the <video>, and the next frame uses it.
//
// The front camera is mirrored and the rear camera is not. Desktop webcams
// usually have only one camera, so the button hides itself when the browser
// reports a single video input.
//
// A tap on the button also reaches the sketch's mousePressed(). Call
// cameraSwitchJustPressed() there to ignore that tap.
//
// For the p5.js Web Editor, upload this file next to sketch.js and change
// the <script src> in index.html to "camera-switch.js".
// ==============================================

let cameraSwitchButton = null;
let cameraSwitching = false;
let cameraSwitchPressedAt = 0;

function createCameraSwitch(cam, callbacks = {}) {
  cameraSwitchButton = createButton(cameraSwitchLabel(cam));
  cameraSwitchButton.position(14, 14);
  cameraSwitchButton.style('position', 'fixed');
  cameraSwitchButton.style('z-index', '20');
  cameraSwitchButton.style('padding', '12px 14px');
  cameraSwitchButton.style('font', '700 15px system-ui, sans-serif');
  cameraSwitchButton.style('border', '0');
  cameraSwitchButton.style('border-radius', '8px');
  cameraSwitchButton.style('background', '#ffffff');
  cameraSwitchButton.style('color', '#111111');
  cameraSwitchButton.style('box-shadow', '0 4px 14px rgba(0, 0, 0, 0.25)');
  cameraSwitchButton.hide();
  cameraSwitchButton.mousePressed(() => switchCamera(cam, callbacks));

  // Only show the button once the camera is running and a second camera exists.
  // This polls instead of using cam.onReady(), because PhoneCamera keeps a
  // single onReady callback and the sketch needs it to start its model.
  const waitForFirstFrame = setInterval(async () => {
    if (cam.ready && cam.videoElement && cam.videoElement.readyState >= 2) {
      clearInterval(waitForFirstFrame);
      if (await countVideoInputs() > 1) {
        cameraSwitchButton.show();
      }
    }
  }, 250);

  return cameraSwitchButton;
}

async function countVideoInputs() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput').length;
  } catch (error) {
    return 1;
  }
}

function cameraSwitchLabel(cam) {
  return cam.active === 'environment' ? 'Front camera' : 'Rear camera';
}

async function switchCamera(cam, callbacks = {}) {
  cameraSwitchPressedAt = Date.now();
  if (cameraSwitching) return;

  cameraSwitching = true;
  if (callbacks.onBeforeSwitch) callbacks.onBeforeSwitch();

  const useRear = cam.active !== 'environment';
  cam.mirror = !useRear;
  cam.active = useRear ? 'environment' : 'user';
  cameraSwitchButton.html(cameraSwitchLabel(cam));

  await waitForCameraReady(cam);
  cameraSwitching = false;
  if (callbacks.onAfterSwitch) callbacks.onAfterSwitch();
}

function waitForCameraReady(cam) {
  return new Promise((resolve) => {
    let attempts = 0;
    const checkReady = () => {
      if (cam.ready && cam.videoElement && cam.videoElement.readyState >= 2) {
        resolve();
      } else if (attempts > 100) {
        resolve();
      } else {
        attempts += 1;
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
}

function cameraSwitchJustPressed() {
  return Date.now() - cameraSwitchPressedAt < 400;
}
