// ble-kit.js
// You don't need to change this file. It connects, shows the status, and keeps the screen on.
// The same file sits in every Bluetooth example folder, so a copy of one folder has everything.
//
// What it gives sketch.js:
//   bleKitSetup()                 call it in setup(), after bleSetup(). It makes the Connect button.
//                                 On a laptop it also shows a code that opens the page on a phone
//   bleKitSetup({ tilt: true })   the same, and the Connect tap also switches on tilt
//   bleKitFrame()                 call it first in draw(). It sets k and keeps the button in step
//   drawTitle(title, hint)        the page name and one line of help, across the top
//   drawStatus(ink)               one line about the connection, at the bottom
//   hasTilt                       true once the phone has sent a real tilt reading
//   tiltHint(phone, mouse)        one line of help for a page that is driven by tilt
//   mouseHasMoved()               false until the mouse first moves. It reads 0, 0 until then
//   k                             one design unit for this screen
//   midY                          the middle of the space above the Connect button
//   AMBER, GREY, INK              the colours

const AMBER = '#ffc800';
const GREY = '#9a9a9a';
const INK = '#cfcfcf';

const NO_BLUETOOTH = 'This browser has no Bluetooth. Use Chrome on Android or a laptop. On an iPhone, open this page in the Bluefy app.';

let k = 1;
let midY = 300;
let connectButton;
let shownLabel = '';
let askForTilt = false;
let hasTilt = false;
let wakeLock = null;

// a laptop sends one empty tilt reading. p5-phone drops it. A phone sends real ones
window.addEventListener('deviceorientation', function (e) {
  if (e.beta !== null) {
    hasTilt = true;
  }
});

function bleKitSetup(options = {}) {
  askForTilt = options.tilt === true;

  // Web Bluetooth only starts from a tap on the page. This button is that tap
  connectButton = createButton('Connect');
  connectButton.id('connect');
  connectButton.mouseClicked(connectTapped);

  // on a laptop, show a code that opens this page on a phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr({ label: 'Open on your phone', size: 120 });
  }
}

function bleKitFrame() {
  // the bottom 130 pixels belong to the Connect button and the status line
  k = min(width / 390, (height - 130) / 570);
  midY = (height - 130) * 0.467;
  updateConnectButton();
}

async function connectTapped() {
  keepAwake();
  if (bleConnected) {
    bleDisconnect();
    return;
  }
  if (askForTilt) {
    await allowTilt();   // an iPhone asks first, and only from a tap
  }
  bleConnect();
}

async function allowTilt() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      await DeviceOrientationEvent.requestPermission();
    } catch (e) {
      // no tilt. the mouse or a finger still works
    }
  }
}

// the button follows the connection
function updateConnectButton() {
  const busy = bleStatus === 'requesting' || bleStatus === 'connecting';
  let label = bleConnected ? 'Disconnect' : 'Connect';
  if (busy) {
    label = 'Connecting';
  }
  if (label !== shownLabel) {
    shownLabel = label;
    connectButton.html(label);
  }
  connectButton.elt.disabled = busy;
  connectButton.elt.hidden = !bleSupported;
}

// one line about the connection
function statusLine() {
  if (window.isSecureContext === false) {
    return bleError || 'Web Bluetooth requires HTTPS.';   // a plain http page cannot use Bluetooth
  }
  if (!bleSupported) {
    return NO_BLUETOOTH;
  }
  if (bleConnected) {
    return 'Connected to ' + bleDeviceName;
  }
  if (bleStatus === 'requesting' || bleStatus === 'connecting') {
    return 'Connecting';
  }
  if (bleError) {
    return bleError;
  }
  return 'Not connected';
}

// the page name and one line of help, across the top
function drawTitle(title, hint, ink = 255, soft = GREY) {
  noStroke();
  fill(ink);
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(26 * k);
  text(title, 0, 28 * k, width);
  textStyle(NORMAL);
  fill(soft);
  textSize(17 * k);
  text(hint, width * 0.075, 68 * k, width * 0.85);
}

// the status line is the lowest thing on the screen. The Connect button sits just above it
function drawStatus(ink) {
  fill(ink);
  noStroke();
  textAlign(CENTER, BOTTOM);
  textStyle(NORMAL);
  textSize(max(15, 16 * k));
  text(statusLine(), width * 0.075, height - 116, width * 0.85, 100);
}

// phone and mouse say what to do, such as 'Tilt your phone left and right.' and 'Move the mouse left and right.'
function tiltHint(phone, mouse) {
  if (hasTilt) {
    return phone;
  }
  if (!isMobile) {
    return 'No tilt sensor here. ' + mouse;
  }
  return bleSupported ? phone + ' On an iPhone, press Connect first and allow motion.' : 'Drag a finger on the screen.';
}

function mouseHasMoved() {
  return mouseX !== 0 || mouseY !== 0;
}

// a phone that locks its screen loses the Bluetooth link. ask it to stay awake
async function keepAwake() {
  if (!('wakeLock' in navigator) || (wakeLock && !wakeLock.released)) {
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {
    wakeLock = null;
  }
}
// the lock ends when the page is hidden. ask again when it comes back
document.addEventListener('visibilitychange', function () {
  if (wakeLock && document.visibilityState === 'visible') {
    keepAwake();
  }
});

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
