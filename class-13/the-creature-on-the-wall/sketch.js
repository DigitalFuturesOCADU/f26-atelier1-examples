// The Creature on the Wall
// One large printed marker on a wall, and one creature standing on it. Every phone that
// looks at the marker sees the same creature, in the same place. There is no network and
// no server. The marker is what makes it shared.
//
// How it works
//   js-aruco2 finds the marker in the camera picture. Its POSIT solver works out where the
//   marker is in 3D: how far away, and how it is turned. The creature is a three.js group
//   that is moved to that place on every camera frame, drawn over the camera picture.
//   Every phone does the same sum with the same marker, so every phone puts the creature
//   in the same place on the wall.
//
// What the creature does
//   It idles: it breathes, sways and blinks, slowly.
//   Its eyes follow the phone. Its body turns a little toward you.
//   When the phone comes close it gets excited: wide eyes, an open mouth, raised arms, a hop.
//   A marker looks bigger in the picture when the phone is close, and the sketch turns
//   that into a distance in metres. CLOSE_M and FAR_M say what counts as close and far.
//   When the marker is lost the creature waits where it was for a moment, then fades out.
//   After a second the screen says "Look for the creature's marker".
//
// Print the marker
//   1. Open https://npuckett.github.io/browserCV-2026/markers/print-aruco.html
//   2. Dictionary: ARUCO_MIP_36h12. First id: 0. Count: 1.
//   3. Size (mm): 190. That is the biggest the page allows, and the number is the black
//      square. With its white border the marker is about 238 mm wide, so it needs
//      Tabloid (11 x 17 in) or A3 paper.
//      Letter and A4 are too narrow. Chrome quietly shrinks 190 to about 157 mm there,
//      and the label still says 190. On Letter or A4, set Size to 150 instead, and
//      change MARKER_SIZE_MM below to 150, or open the page with ?size=150.
//   4. Print at 100% scale. Turn off "fit to page". Matte paper, no glare.
//   5. Measure the black square with a ruler. Put that number in MARKER_SIZE_MM.
//   6. Tape it flat on a wall at eye height, with the printed label at the bottom.
//      The creature stands up the wall, so the label side is its floor.
//   A bigger marker reads from farther away. So does a bigger camera picture. In tests with
//   a simulated camera, the 190 mm marker was found from about 2 metres in a 640 x 480
//   picture and about 3 metres in a 1280 x 720 picture. Test with your own phone.
//
// Things to change
//   MARKER_ID           which marker the creature stands on. Print that id instead.
//   MARKER_SIZE_MM      the printed black square. Wrong numbers make the creature read
//                       too near or too far, but it still stands on the marker.
//   CAMERA_FOV_DEGREES  a guess at your camera's field of view. If the creature seems to
//                       float above the wall or sink into it, try 50 or 70.
//   CLOSE_M, FAR_M      how near is "close" and how far is "calm".
//   LOST_WAIT_MS        how long the creature waits when it loses the marker.
//   the colours and sizes in buildCreature()
//
// Key data
//   markers          js-aruco2's results: [{ id, corners: [{ x, y } x4], hammingDistance }]
//   pose             POSIT's answer: bestRotation (3 x 3), bestTranslation [x, y, z] in metres.
//                    x is right, y is up, z is away from the camera.
//   anchor           a THREE.Group moved to the marker each frame. The marker lies flat in
//                    the anchor's x and y. z points out of the wall, toward you.
//   creature         a group inside the anchor, built so that the marker is 1 unit wide.
//                    It is scaled to MARKER_SIZE_MM, so one unit is the printed marker.
//
// A phone starts on the rear camera. A laptop starts on its webcam. The first tap turns
// the camera on: iPhones need that tap. The page must be served over https.
//
// Nothing is recorded or saved. The camera picture stays on this device.
// A small red dot and the words "Camera on" show in the corner while the camera runs.
//
// Based on browserCV-2026 three/aruco-pose:
// https://npuckett.github.io/browserCV-2026/three/aruco-pose/

const MARKER_ID = 0;             // the ARUCO_MIP_36h12 marker the creature stands on
// the printed black square, in millimetres. Measure yours. A ?size=150 at the end of
// the address sets it without editing, for example for a marker printed on Letter paper.
const MARKER_SIZE_MM = Number(new URLSearchParams(location.search).get('size')) || 190;
const CAMERA_FOV_DEGREES = 60;   // across the camera picture. A guess: few phones publish it.
const SCAN_SIZE = 960;           // the picture is shrunk to this many pixels across before it is searched
const CLOSE_M = 0.8;             // closer than this and the creature is fully excited
const FAR_M = 2.5;               // farther than this and the creature is calm
const MISS_GRACE_MS = 250;       // a marker missed for less than this does not count as lost
const LOST_WAIT_MS = 1000;       // how long the creature waits and fades after the marker is lost

const CALM_COLOR = new THREE.Color(0xff7a59);
const EXCITED_COLOR = new THREE.Color(0xff4f8b);

let renderer, scene, camera, cam, detector, posit;
let positFocal = 0;              // the focal length POSIT was built with
let focalVideo = null;           // focal length in video pixels (from the field of view)

let anchor, creature;            // the anchor sits on the marker. The creature stands in it.
let parts = {};                  // the creature's moving parts
let fadeMaterials = [];          // every material, so the whole creature can fade together

let state = 'searching';         // 'searching', 'tracking', 'waiting' or 'lost'
let everSeen = false;
let lastSeenAt = 0;              // when the marker was last found, in milliseconds
let alpha = 0;                   // 0 is invisible, 1 is solid
let excite = 0;                  // 0 is calm, 1 is as excited as it gets
let lastFrameAt = 0;
let nextBlinkAt = 2000;
let blinkStartedAt = -1;

let messageBox, cameraBadge;

const targetPos = new THREE.Vector3();
const targetQuat = new THREE.Quaternion();
const altPos = new THREE.Vector3();
const altQuat = new THREE.Quaternion();
const poseMatrix = new THREE.Matrix4();
const unusedScale = new THREE.Vector3();
const phoneInCreature = new THREE.Vector3();
const phoneInPivot = new THREE.Vector3();
const eyeDirection = new THREE.Vector3();
const eyeQuat = new THREE.Quaternion();
const eyeAxis = new THREE.Vector3();
const MAX_EYE_TURN = 0.7;        // the most an eye turns away from straight ahead, in radians
const FORWARD = new THREE.Vector3(0, 0, 1);

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318); // shows until the camera is on
  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 50);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(0.5, 1, 1.5);
  scene.add(key);

  // The creature lives inside the anchor. The anchor is moved to the marker each frame.
  anchor = new THREE.Group();
  anchor.visible = false;
  creature = buildCreature();
  creature.scale.setScalar(MARKER_SIZE_MM / 1000); // from marker units to metres
  anchor.add(creature);
  scene.add(anchor);

  // Not mirrored, even on a laptop: the 3D creature has to match the real picture.
  cam = createPhoneCamera(IS_PHONE ? 'environment' : 'user', false, 'cover');
  cam.onReady(() => cam.attachBackground(scene));

  // A strict hamming distance of 5 stops random patterns counting as markers.
  detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 });

  makeOverlay();
  setPhoneCanvas(renderer);
  enableCameraTap('Tap to look for the creature');
  lockGestures();
  addEventListener('resize', onResize);
  lastFrameAt = performance.now();
  animate();
}

// three-phone calls this once the camera has been allowed.
function userSetupComplete() {
  // keep the screen awake while someone holds the phone up
  if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {});
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastFrameAt) / 1000, 0.1);
  lastFrameAt = now;

  // look for the marker once per camera frame
  if (cam.ready && isNewFrame(cam)) {
    focalVideo = matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame && focalVideo) findMarker(frame, now);
  }

  updateState(now, dt);
  followMarker(dt);
  animateCreature(now / 1000, dt);
  updateOverlay();

  renderer.render(scene, camera);
}

// ----------------------------------------------------------------------------------
// Finding the marker
// ----------------------------------------------------------------------------------

function findMarker(frame, now) {
  const markers = detector.detect(frame.imageData).filter((m) => m.id === MARKER_ID);
  if (markers.length === 0) return;

  // POSIT needs the focal length in pixels of the picture it measures.
  const focal = focalVideo * frame.scale;
  if (!posit || Math.abs(focal - positFocal) > 0.5) {
    posit = new POS.Posit(MARKER_SIZE_MM / 1000, focal);
    positFocal = focal;
  }

  // POSIT wants the corners measured from the picture's centre, with y pointing up.
  const corners = markers[0].corners.map((c) => ({ x: c.x - frame.width / 2, y: frame.height / 2 - c.y }));
  const pose = posit.pose(corners);
  if (!poseIsUsable(pose.bestRotation, pose.bestTranslation)) return;

  // POSIT gives two answers. When the marker faces the camera straight on they look
  // almost the same, and the best one can flip from frame to frame. So while the creature
  // is standing, take the answer closest to where it already is.
  poseToThree(pose.bestRotation, pose.bestTranslation, targetPos, targetQuat);
  if (state === 'tracking' && poseIsUsable(pose.alternativeRotation, pose.alternativeTranslation)) {
    poseToThree(pose.alternativeRotation, pose.alternativeTranslation, altPos, altQuat);
    if (altQuat.angleTo(anchor.quaternion) < targetQuat.angleTo(anchor.quaternion)) {
      targetPos.copy(altPos);
      targetQuat.copy(altQuat);
    }
  }

  // The first time (or after a long wait) jump straight there. Otherwise glide.
  if (!everSeen || state === 'lost') {
    anchor.position.copy(targetPos);
    anchor.quaternion.copy(targetQuat);
  }
  everSeen = true;
  lastSeenAt = now;
}

function poseIsUsable(r, t) {
  return r && t && Number.isFinite(r[0][0]) && Number.isFinite(t[2]) && t[2] > 0;
}

// POSIT's camera looks down +z with y up. three.js looks down -z. Flipping z on both
// sides of the rotation turns one into the other. The matrix is split into a position
// and a rotation so they can be smoothed.
function poseToThree(r, t, outPosition, outQuaternion) {
  poseMatrix.set(
    r[0][0], r[0][1], -r[0][2], t[0],
    r[1][0], r[1][1], -r[1][2], t[1],
    -r[2][0], -r[2][1], r[2][2], -t[2],
    0, 0, 0, 1
  );
  poseMatrix.decompose(outPosition, outQuaternion, unusedScale);
}

// Is the marker here, or was it just here, or has it gone?
function updateState(now, dt) {
  if (!everSeen) {
    state = 'searching';
    return;
  }
  const since = now - lastSeenAt;
  if (since < MISS_GRACE_MS) {
    state = 'tracking';
    alpha = Math.min(1, alpha + dt * 4);
  } else if (since < MISS_GRACE_MS + LOST_WAIT_MS) {
    state = 'waiting';
    // fade out across the wait
    alpha = Math.min(alpha, 1 - (since - MISS_GRACE_MS) / LOST_WAIT_MS);
  } else {
    state = 'lost';
    alpha = 0;
  }
}

// Glide the anchor toward the newest pose. This hides the small jitter in each reading.
function followMarker(dt) {
  if (state === 'tracking') {
    const k = 1 - Math.exp(-dt / 0.06);
    anchor.position.lerp(targetPos, k);
    anchor.quaternion.slerp(targetQuat, k);
  }
  anchor.visible = everSeen && alpha > 0.01;
}

// ----------------------------------------------------------------------------------
// The creature
// ----------------------------------------------------------------------------------

function material(color, baseOpacity = 1) {
  const m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.55, transparent: true });
  m.userData.baseOpacity = baseOpacity;
  fadeMaterials.push(m);
  return m;
}

// Built so the marker is 1 unit wide, with the marker flat at z = 0. Up the wall is +y.
// The creature's feet are on the marker's bottom edge, and it stands out toward you.
function buildCreature() {
  const group = new THREE.Group();
  const bodyMaterial = material(CALM_COLOR.clone());
  parts.bodyMaterial = bodyMaterial;

  // a soft shadow on the wall behind it
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true }));
  shadow.material.userData.baseOpacity = 0.2;
  fadeMaterials.push(shadow.material);
  shadow.scale.set(0.85, 1.25, 1);
  shadow.position.set(0, 0.04, 0.004);
  group.add(shadow);

  // everything that moves with the body hangs from a pivot at its feet
  const pivot = new THREE.Group();
  pivot.position.set(0, -0.5, 0.17);
  group.add(pivot);
  parts.pivot = pivot;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 28), bodyMaterial);
  body.scale.set(1, 1.5, 0.92);
  body.position.y = 0.5;
  pivot.add(body);

  // feet
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), material(0xcc4a2e));
    foot.scale.set(1.2, 0.5, 1.6);
    foot.position.set(side * 0.15, -0.47, 0.23);
    group.add(foot);
  }

  // arms hang from the shoulders
  parts.arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.33, 0.55, 0);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 6, 12), bodyMaterial);
    limb.position.y = -0.17;
    arm.add(limb);
    arm.userData.side = side;
    pivot.add(arm);
    parts.arms.push(arm);
  }

  // eyes: a white ball with a dark pupil on its front. Turning the ball turns the gaze.
  parts.eyes = [];
  parts.pupils = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.14, 0.7, 0.275);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 18), material(0xffffff)));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), material(0x1b1b1b));
    pupil.position.z = 0.085;
    eye.add(pupil);
    pivot.add(eye);
    parts.eyes.push(eye);
    parts.pupils.push(pupil);
  }

  // a mouth that opens when it is excited
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material(0x3a1020));
  mouth.position.set(0, 0.46, 0.3);
  mouth.scale.set(0.08, 0.02, 0.03);
  pivot.add(mouth);
  parts.mouth = mouth;

  // an antenna with a bright ball on the end
  const antenna = new THREE.Group();
  antenna.position.set(0, 0.99, 0);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.22, 8), material(0x663322));
  stalk.position.y = 0.11;
  antenna.add(stalk);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), material(0xffd23f));
  tip.position.y = 0.24;
  antenna.add(tip);
  pivot.add(antenna);
  parts.antenna = antenna;

  return group;
}

function animateCreature(t, dt) {
  const pivot = parts.pivot;

  // how excited? close is excited, far is calm. The anchor is metres from the camera.
  const distance = anchor.position.length();
  const closeness = THREE.MathUtils.clamp((FAR_M - distance) / (FAR_M - CLOSE_M), 0, 1);
  const wanted = state === 'tracking' ? closeness : 0;
  excite += (wanted - excite) * (1 - Math.exp(-dt / 0.25));

  // idle: breathe, sway, bob the antenna
  pivot.scale.y = 1 + 0.02 * Math.sin(t * 1.6);
  pivot.rotation.z = 0.04 * Math.sin(t * 0.9) + 0.03 * excite * Math.sin(t * 7);
  pivot.position.y = -0.5 + Math.abs(Math.sin(t * 8)) * 0.07 * excite; // a hop when excited
  parts.antenna.rotation.z = 0.15 * Math.sin(t * 1.3) + 0.2 * excite * Math.sin(t * 9);
  parts.antenna.scale.y = 1 + 0.35 * excite;

  // arms: down when calm, up when excited
  for (const arm of parts.arms) {
    const side = arm.userData.side;
    const calmAngle = side * (0.2 + 0.05 * Math.sin(t * 1.1 + side));
    const upAngle = side * (2.3 + 0.2 * Math.sin(t * 10 + side));
    arm.rotation.z = THREE.MathUtils.lerp(calmAngle, upAngle, excite);
  }

  // where is the phone? the camera sits at the origin of the scene.
  scene.updateMatrixWorld();
  phoneInCreature.set(0, 0, 0);
  creature.worldToLocal(phoneInCreature);
  phoneInPivot.set(0, 0, 0);
  pivot.worldToLocal(phoneInPivot);

  // the body turns a little toward the phone
  const turn = THREE.MathUtils.clamp(Math.atan2(phoneInCreature.x, phoneInCreature.z), -0.7, 0.7) * 0.45;
  pivot.rotation.y += (turn - pivot.rotation.y) * (1 - Math.exp(-dt / 0.3));

  // the eyes follow the phone, but only as far as eyes can turn
  for (const eye of parts.eyes) {
    eyeDirection.copy(phoneInPivot).sub(eye.position).normalize();
    if (FORWARD.angleTo(eyeDirection) > MAX_EYE_TURN) {
      eyeAxis.crossVectors(FORWARD, eyeDirection).normalize();
      eyeQuat.setFromAxisAngle(eyeAxis, MAX_EYE_TURN);
    } else {
      eyeQuat.setFromUnitVectors(FORWARD, eyeDirection);
    }
    eye.quaternion.slerp(eyeQuat, 1 - Math.exp(-dt / 0.08));
  }

  // blink now and then. Wide eyes and bigger pupils when excited.
  const nowMs = t * 1000;
  if (blinkStartedAt < 0 && nowMs > nextBlinkAt) blinkStartedAt = nowMs;
  let lid = 1;
  if (blinkStartedAt >= 0) {
    const p = (nowMs - blinkStartedAt) / 160;
    lid = p < 1 ? Math.abs(p * 2 - 1) : 1;
    if (p >= 1) {
      blinkStartedAt = -1;
      nextBlinkAt = nowMs + 2500 + Math.random() * 3500;
    }
  }
  for (let i = 0; i < parts.eyes.length; i++) {
    const widen = 1 + 0.4 * excite;
    parts.eyes[i].scale.set(widen, widen * Math.max(lid, 0.08), widen);
    parts.pupils[i].scale.setScalar(1 + 0.4 * excite);
  }

  // the mouth opens into a round O
  parts.mouth.scale.set(0.08 - 0.02 * excite, 0.02 + 0.06 * excite, 0.03);

  // colour and fade
  parts.bodyMaterial.color.lerpColors(CALM_COLOR, EXCITED_COLOR, excite);
  for (const m of fadeMaterials) m.opacity = alpha * m.userData.baseOpacity;
}

// ----------------------------------------------------------------------------------
// Words on the screen
// ----------------------------------------------------------------------------------

function makeOverlay() {
  messageBox = document.createElement('div');
  messageBox.textContent = "Look for the creature's marker";
  messageBox.style.cssText =
    'position:fixed; left:50%; bottom:32px; transform:translateX(-50%); z-index:20;' +
    'max-width:90vw; white-space:nowrap; padding:12px 20px; border-radius:999px; text-align:center;' +
    'background:rgba(0,0,0,0.65); color:#ffffff; font:600 16px system-ui, sans-serif;' +
    'pointer-events:none; display:none;';
  document.body.appendChild(messageBox);

  // a red dot and "Camera on", so anyone near the phone can see the camera is running
  cameraBadge = document.createElement('div');
  cameraBadge.innerHTML = '<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#ff3b30; margin-right:8px;"></span>Camera on';
  cameraBadge.style.cssText =
    'position:fixed; top:14px; right:14px; z-index:20; padding:6px 12px; border-radius:999px;' +
    'background:rgba(0,0,0,0.6); color:#ffffff; font:600 13px system-ui, sans-serif;' +
    'pointer-events:none; display:none;';
  document.body.appendChild(cameraBadge);
}

function cameraIsOn() {
  const video = cam && cam.videoElement;
  const stream = video && video.srcObject;
  if (!stream || !stream.getVideoTracks) return false;
  return stream.getVideoTracks().some((track) => track.readyState === 'live');
}

function updateOverlay() {
  const on = cameraIsOn();
  cameraBadge.style.display = on ? 'block' : 'none';
  const showMessage = on && (state === 'searching' || state === 'lost');
  messageBox.style.display = showMessage ? 'block' : 'none';
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  if (cam.ready) {
    matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    cam.updateBackground();
  }
}

init();
