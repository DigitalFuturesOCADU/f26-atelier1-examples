// 05 · Level to Surface
// A sphere whose skin moves with the room. Quiet, it is a smooth ball.
// Loud, ripples push out of it, and the louder it is the deeper they go.
// Sound in, a moving surface out. WEBGL, with a shader written in p5.strands.
//
// A shader is a small program the graphics chip runs for every point of a shape at once.
// That is why thousands of points can move every frame on a phone.
// p5.strands lets you write it in JavaScript. buildMaterialShader() turns the
// function 'ripples' below into a shader.

// the feel of the piece. change these before you change anything else.
let boost = 5;       // phones hear quietly. raise it if the sphere barely moves
let smoothing = 0.2; // 1 is raw and jumpy. 0.05 is slow and calm
let depth = 0.35;    // how far the loudest sound pushes the skin out. 1 is the radius
let bumps = 8;       // how tight the ripples are

let mic;             // the microphone
let meter;           // measures how loud the microphone is
let level = 0;
let skin;            // the shader
let label;           // an HTML line for the words

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1); // 3D on a phone screen at full sharpness gets hot. 1 is enough
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  setupMic();
  label = makeLabel();
  skin = buildMaterialShader(ripples);
}

// This function becomes the shader. It runs on the graphics chip, once for every
// point on the sphere, every frame. It can read the sketch's variables only through
// uniformFloat(), which hands one number across each frame.
// objectInputs is the sphere before it is sized and placed, so its radius is 1.
function ripples() {
  let loud = uniformFloat(() => level * depth);
  let count = uniformFloat(() => bumps);
  let time = millis() * 0.002;

  objectInputs.begin();
  let p = objectInputs.position;
  let wave = sin(p.x * count + time) * sin(p.y * count + time * 0.7);
  // push each point out along the direction its surface faces
  objectInputs.position += objectInputs.normal * wave * loud;
  objectInputs.end();
}

function draw() {
  background(20);

  // 1. read the input: how loud is it, from 0 to 1. the fallback: higher finger is louder.
  let raw = getMicLevel();
  if (mouseIsPressed) {
    raw = constrain(map(mouseY, height, 0, 0, 1), 0, 1);
  }
  // 2. smooth it. the shader reads 'level' through uniformFloat()
  level = lerp(level, raw, smoothing);

  // 3. light it and show it
  let r = min(width, height) * 0.28;
  rotateY(frameCount * 0.3);
  ambientLight(60);
  directionalLight(255, 255, 255, -0.4, 0.6, -1);
  specularMaterial(255);
  shininess(40);
  fill(255, 90, 60);
  noStroke();
  shader(skin);
  sphere(r, 96, 64); // more detail than usual, so the ripples have points to move

  label.html('level: ' + nf(level, 1, 2) + '<br>' + micStatus());
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
  return false;
}

// In WEBGL, text() only works after loadFont(). Words that only label the
// screen are simpler as one line of HTML on top of the canvas.
function makeLabel() {
  let div = createDiv('');
  div.position(16, 12);
  div.style('color', '#ffffff');
  div.style('font', '15px/1.5 sans-serif');
  div.style('pointer-events', 'none');
  return div;
}

// ---------- the microphone. this part is the same in every sketch. ----------

// call this once in setup
function setupMic() {
  mic = new p5.AudioIn(); // p5-phone looks for a variable with exactly this name
  meter = new p5.Amplitude();
  routeMic();
  enableMicTap('Tap to turn on the microphone');
}

// p5.sound sends the microphone straight to the speaker unless you stop it.
// This unplugs it from the speaker and plugs it into the level meter.
function routeMic() {
  mic.disconnect();
  mic.connect(meter);
}

// how loud it is right now, from 0 to 1. it is 0 when there is no microphone.
function getMicLevel() {
  if (!window.micOpen) {
    return 0;
  }
  routeMic();
  return constrain(meter.getLevel() * boost, 0, 1);
}

// one line for the screen that says what the microphone is doing
function micStatus() {
  if (window.micOpen) {
    return 'listening. clap, hum, or blow on the microphone';
  }
  if (window.micEnabled) {
    return 'waiting for the microphone. if it never comes, use a finger';
  }
  return 'tap to turn on the microphone';
}

// a phone can put the sound system to sleep when you leave the page.
// any touch wakes it up again.
function wakeAudio() {
  if (getAudioContext().state !== 'running') {
    userStartAudio();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
