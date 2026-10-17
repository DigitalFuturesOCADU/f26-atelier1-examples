// 05 Common Signal Starter
// Share. Two phones in a pair send one value to each other: how far each phone tilts left or
// right, from -1 to 1. Each phone shows two dots, you and your partner.
//
// The rule: Share keeps only the last thing written, so each phone writes only its own value
// in me, and its partner's value arrives in guests.
//
// Set up: both phones open this page, type the same pair name (that is your room) and tap Join.
// The class server address comes from ../class-server.js. In the web editor, paste it into
// SHARE_HOST below instead. ?shareHost=https://... on the page address overrides both.
//
// Try this: tilt and watch both screens. Turn on airplane mode and your own dot still moves.
// On a laptop, move the mouse. A laptop also shows a QR code that a phone can scan to join.
//
// Change what is sent: readMyValue() below is the signal.
// Key data: me.value (yours, -1 to 1), guests[i].value (your partner's), shareConnected

const SHARE_HOST = 'https://p5-phone-share.REPLACE-ME.workers.dev';   // web editor: paste the class server address here
const SAVED = 'atelier1-common-signal-pair';   // where this phone remembers its pair name

let serverAddress = '';
let pairName = '';
let pairInput;         // the text field on the start screen, in index.html
let joined = false;
let partners = [];     // the other phones in the room that send a value
let gotTilt = false;   // true once the phone sends a real tilt reading

window.addEventListener('deviceorientation', function (e) {
  if (e.beta !== null) gotTilt = true;
});

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textFont('system-ui');

  // the server address: ?shareHost= first, then the class server, then SHARE_HOST. REPLACE-ME means not set
  const params = new URLSearchParams(location.search);
  serverAddress = [params.get('shareHost'), window.CLASS_SHARE_HOST, SHARE_HOST].find(function (a) {
    return a && a.indexOf('REPLACE-ME') < 0;
  }) || '';

  // the start screen is in index.html. fill the pair name from ?room=, else the last one this phone used
  let saved = '';
  try { saved = localStorage.getItem(SAVED) || ''; } catch (e) { /* no storage is fine */ }
  pairInput = select('#pair');
  pairInput.value(params.get('room') || saved);
  if (params.get('room')) pairInput.attribute('disabled', '');   // the link already chose the room
  pairInput.input(canJoin);
  canJoin();

  // the tap on Join asks for tilt (an iPhone needs a tap), then calls userSetupComplete()
  enablePermissionsOn('#join', ['gyro']);
}

function cleanName() {
  return pairInput.value().trim().toLowerCase().replace(/\s+/g, '-');
}

function canJoin() {
  select('#join').elt.disabled = cleanName() === '';
}

function userSetupComplete() {
  pairName = cleanName();
  try { localStorage.setItem(SAVED, pairName); } catch (e) { /* fine */ }
  select('#start').hide();
  lockGestures();
  keepAwake();   // a phone that locks leaves the room
  if (serverAddress) {
    shareSetup({ host: serverAddress, room: pairName, app: 'common-signal', me: { value: 0 } });
    shareConnect();
    if (location.protocol === 'https:' && window.self === window.top) showDesktopQr();
  }
  joined = true;
}

// THE SIGNAL. This is the one number this phone sends, from -1 to 1. Change it here only.
//   touch:    return constrain(map(mouseY, 0, height, 1, -1), -1, 1);
//   the mic:  return a level from 0 to 1, using the mic code from a Class 4 example
//   a colour: also send me.hue = 200, then colour your partner's dot with partners[0].hue
//   an event: call shareEmit('knock') when something happens. Your partner's phone gets it in
//             function shareEvent(name, data) { }
function readMyValue() {
  if (gotTilt) return constrain(rotationY / 30, -1, 1);   // 30 degrees is all the way
  return constrain(map(mouseX || width / 2, 0, width, -1, 1), -1, 1);   // a laptop mouse, or a finger
}

function draw() {
  const k = min(width / 390, height / 700);   // one size unit for this screen
  background(20);
  noStroke();
  textAlign(CENTER, CENTER);
  if (!joined) return;   // the start screen is on top

  // 1. read my value. 2. send it. 3. look for my partner's.
  const mine = readMyValue();
  if (shareConnected) me.value = round(mine * 20) / 20;   // steps of 0.05, so a still phone sends nothing
  partners = shareConnected ? guests.filter(function (g) { return typeof g.value === 'number'; }) : [];
  const other = partners.length > 0 ? partners[0].value : null;

  drawTrack('You', height * 0.3, mine, '#ffc800', k);
  drawTrack('Your partner', height * 0.5, other, '#3ddcff', k);
  fill(154);
  textSize(18 * k);
  text(statusLine(), width * 0.07, height * 0.7, width * 0.86, height * 0.14);   // a text box: x is its left edge
  fill(255);
  textSize(22 * k);
  text('pair name: ' + pairName, width / 2, height * 0.88);
}

// a dot on a line. a null value draws no dot
function drawTrack(label, y, value, col, k) {
  const half = width * 0.38;
  fill(154);
  textSize(19 * k);
  text(label, width / 2, y - 44 * k);
  stroke(70);
  strokeWeight(4 * k);
  line(width / 2 - half, y, width / 2 + half, y);
  noStroke();
  if (typeof value !== 'number') return;
  fill(col);
  circle(width / 2 + value * half, y, 46 * k);
}

function statusLine() {
  if (!serverAddress) return 'No server address. Paste it into SHARE_HOST in sketch.js. Your own dot still works.';
  if (shareStatus === 'error') return shareError || 'Cannot reach the server. Trying again.';
  if (!shareConnected) return 'Connecting';
  if (partners.length === 0) return 'Waiting for your partner. They open this page and type the same pair name.';
  if (partners.length > 1) return 'More than two phones are in this room. If you are not three, another pair is using your pair name.';
  return 'Connected. Tilt to move your dot.';
}

// a wake lock keeps the screen on, and asks again when the page comes back
async function keepAwake() {
  try { await navigator.wakeLock.request('screen'); } catch (e) { /* the screen may lock. that is all */ }
}
document.addEventListener('visibilitychange', function () {
  if (joined && document.visibilityState === 'visible') keepAwake();
});

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
