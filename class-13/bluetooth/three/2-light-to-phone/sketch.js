// Example 2: Light to Phone, in three.js
// The same as the p5 version, in 3D. A light sensor on the Arduino sets how bright
// the scene is. Cover the sensor with your hand and the scene goes dark (0 to 1023).
//
// The Bluetooth part is the same as in p5: three-phone has bleSetup(), bleConnect(),
// bleWrite() and bleReceive(), with the same names. Only the drawing is three.js.
// The board runs the same Arduino code as the p5 version: LightToPhone.zip
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/2-light-to-phone/LightToPhone.zip

// 1. YOUR BOARD NUMBER. Three digits, the same as BOARD_NUMBER in the Arduino code.
// On a page you did not edit, add ?board= and your number to the address: ...?board=007
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '001';

// 2. THE ADDRESSES (UUIDs). The same as in the p5 version.
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const LIGHT_UUID = '19b10002-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

let renderer, scene, camera, shape, lamp;
let light = 0;         // the last light reading from the board, 0 to 1023

function init() {
  // the scene: one shape, lit by a lamp that the board's light sensor sets
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
  shape = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), new THREE.MeshStandardMaterial({ color: 0xffc800, flatShading: true }));
  shape.position.y = 0.5;
  scene.add(shape);

  // 3. SET UP BLUETOOTH: one service with one value in it. The same as the p5 version
  bleSetup({
    serviceUUID: SERVICE_UUID,
    characteristics: [
      { name: 'light', uuid: LIGHT_UUID, type: 'uint16', notify: true, read: true }
    ]
  });
  setPhoneCanvas(renderer);
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

  shape.rotation.y += 0.005;

  // the light sets the background and the lamp
  const level = light / 1023;
  scene.background = new THREE.Color(level, level, level);
  lamp.intensity = 0.3 + level * 1.5;

  renderer.render(scene, camera);
  showStatus();
}

// three-phone calls this each time the board sends a value
function bleReceive(name, value) {
  if (name === 'light') {
    light = value;
  }
}

// the board just connected: ask for the light now, instead of waiting for it to change
function bleReady() {
  bleRead('light');
}

function showStatus() {
  let words = 'Not connected. Looking for Board-' + BOARD_NUMBER;
  if (bleConnected) words = 'Connected to ' + bleDeviceName + '. light ' + light;
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
