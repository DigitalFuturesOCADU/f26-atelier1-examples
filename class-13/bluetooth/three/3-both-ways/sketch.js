// Example 3: Both Ways, in three.js
// The same as the p5 version, with a 3D servo arm.
//   phone to board: tilt the phone left and right, and the servo turns (0 to 180)
//   board to phone: the light sensor sets how bright the scene is (0 to 1023)
// On a laptop, move the mouse left and right instead of tilting.
//
// The Bluetooth part is the same as in p5: three-phone has bleSetup(), bleConnect(),
// bleWrite() and bleReceive(), with the same names. Only the drawing is three.js.
// The board runs the same Arduino code as the p5 version: BothWays.zip
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/3-both-ways/BothWays.zip

// 1. YOUR BOARD NUMBER. Three digits, the same as BOARD_NUMBER in the Arduino code.
// It starts at 900, the class demo board. Change '900' at the end of the line below to your
// number. (The first part lets a page address such as ...?board=901 choose the board. Leave it.)
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '900';

// 2. THE ADDRESSES (UUIDs). The same as in the p5 version.
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const ANGLE_UUID = '19b10001-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const LIGHT_UUID = '19b10002-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

let renderer, scene, camera, arm, lamp;
let angle = 90;        // PHONE TO BOARD: the angle to send, 0 to 180
let lastSent = -1;
let sending = false;
let light = 0;         // BOARD TO PHONE: the last light reading, 0 to 1023

function init() {
  // the scene: a grey base and an arm that turns, seen from the front
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.prepend(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 6);
  camera.lookAt(0, 0.5, 0);
  lamp = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
  scene.add(lamp);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial({ color: 0x444444 }));
  scene.add(base);
  arm = new THREE.Group();
  arm.position.set(0, 0.6, 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2, 0.25, 0.25), new THREE.MeshStandardMaterial({ color: 0xffc800 }));
  bar.position.x = -1;   // the bar sticks out to the left of the pivot
  arm.add(bar);
  scene.add(arm);

  // 3. SET UP BLUETOOTH: one service with two values in it. The same as the p5 version
  bleSetup({
    serviceUUID: SERVICE_UUID,
    characteristics: [
      { name: 'angle', uuid: ANGLE_UUID, type: 'uint8', write: true },                // phone to board
      { name: 'light', uuid: LIGHT_UUID, type: 'uint16', notify: true, read: true }   // board to phone
    ]
  });

  // the first tap turns on tilt. An iPhone asks first
  setPhoneCanvas(renderer);
  enableGyroTap('Tap to start');
  lockGestures();

  // 4. A BUTTON TO CONNECT. It is in index.html
  document.getElementById('connect').addEventListener('click', () => {
    if (bleConnected) bleDisconnect();
    else bleConnect();   // opens the list of boards. Pick Board- and your number
  });
  window.addEventListener('resize', onResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  // PHONE TO BOARD: read the tilt (or the mouse) and send the angle when it changed.
  // three-phone keeps rotationY and mouseX up to date, as p5 does
  let a = isMobile ? THREE.MathUtils.mapLinear(rotationY, -45, 45, 0, 180) : (mouseX / window.innerWidth) * 180;
  angle = Math.round(THREE.MathUtils.clamp(a, 0, 180));
  if (bleConnected && angle !== lastSent && !sending) {
    sendAngle();
  }

  // the arm points left at 0, up at 90 and right at 180
  arm.rotation.z = THREE.MathUtils.degToRad(-angle);

  // BOARD TO PHONE: the light sets the background and the lamp
  const level = light / 1023;
  scene.background = new THREE.Color(level, level, level);
  lamp.intensity = 0.3 + level * 1.5;

  renderer.render(scene, camera);
  showStatus();
}

// PHONE TO BOARD: one write at a time
async function sendAngle() {
  sending = true;
  const value = angle;
  const ok = await bleWrite('angle', value);
  if (ok) lastSent = value;
  sending = false;
}

// BOARD TO PHONE: three-phone calls this each time the board sends a value
function bleReceive(name, value) {
  if (name === 'light') {
    light = value;
  }
}

// the board just connected: send the angle again, and ask for the light now
function bleReady() {
  lastSent = -1;
  bleRead('light');
}

function showStatus() {
  let words = 'Not connected. Looking for Board-' + BOARD_NUMBER;
  if (bleConnected) words = 'Connected to ' + bleDeviceName + '. angle ' + angle + ', light ' + light;
  if (!bleSupported) words = 'No Bluetooth here. Use Chrome, or Bluefy on an iPhone.';
  document.getElementById('status').textContent = words;
  document.getElementById('connect').textContent = bleConnected ? 'Disconnect' : 'Connect';
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
