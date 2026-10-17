// Conductor: Phone
// Share. The big screen gives your phone a role (Red, Blue, Yellow or Green) and sends cues.
// Your phone fills with your role's colour. When a cue arrives, the cue fills the screen,
// the phone buzzes (Android only), and it can do two more things if you turn them on:
// say the cue out loud, and flash its light. Both start off. Neither happens unless you tap.
//
// The rule: Share keeps only the last thing written, so only the projector writes shared.
// This phone writes only its own me. A cue is a one-shot event, so a phone that joins late
// has missed the earlier cues.
//
// Try this:
//   Join, then read what your phone says when nothing has happened yet.
//   Turn on Speak cues aloud. The phone says one short sentence. That first tap is what lets
//   the page speak at all. After it, every cue can be spoken.
//   Turn on Flash my light. The phone asks for the camera, because that is how a web page
//   reaches the light. Nothing is recorded.
//   Put the phone face down. Does the cue still reach you? Which format carries it?
//   On a laptop the page works the same. It cannot buzz or flash, and says so.
//
// Key data:
//   shared.roles[shareClientId]   this phone's role. the projector writes it
//   shared.mode                   'phones', or 'read' when a person reads the cues aloud
//   shareEvent('cue', { id, text, roles })   a cue. roles is 'all' or a list like ['Red']
//   me.seen                       the id of the last cue this phone showed. the projector counts them
//   me.buzz  me.flash  me.speak   what this phone can use, so the projector can show the reach

const ROOM = 'conductor';

// the feel of the piece. change these before you change anything else.
const CUE_SECONDS = 15;       // how long a cue fills the screen before the role comes back
const BUZZ = [250, 120, 250]; // the buzz: on, off, on, in milliseconds. Android only
const FLASHES = 2;            // how many times the light blinks. keep it slow
const FLASH_MS = 300;         // how long each blink is on, and off

const NAMES = [
  'Pip', 'Moss', 'Fig', 'Juno', 'Otto', 'Bean', 'Kit', 'Roux', 'Tilly', 'Basil',
  'Nori', 'Wren', 'Clove', 'Miso', 'Dot', 'Echo', 'Fern', 'Gus', 'Hazel', 'Ivy',
  'Jam', 'Kiwi', 'Lark', 'Mint', 'Nova', 'Olive', 'Plum', 'Quill', 'Rue', 'Sage',
  'Tulip', 'Uma', 'Vee', 'Wisp', 'Yarrow', 'Zig', 'Ash', 'Birch', 'Cedar', 'Dune',
  'Elm', 'Flint', 'Gem', 'Haze', 'Iris', 'Jade', 'Koi', 'Lime', 'Maple', 'Nib'
];

let serverProblem = '';
let serverOk = false;
let joined = false;
let myName = rememberedName();
let myRole = '';              // the role now. '' until the projector gives one
let changedAt = -99999;       // when the role last changed
let lastCue = null;           // { id, text, at } the last cue this phone showed
let speakOn = false;
let flashOn = false;
let flashBusy = false;
let flashNote = '';
let blinking = false;
let wakeLock = null;
let screenAwake = false;
let wantAwake = false;
let htmlOf = {};              // the last html written to each panel, so a panel is only redrawn when it changed

function setup() {
  noCanvas();
  frameRate(20);
  lockGestures();

  // a turned phone needs the cue fitted again
  window.addEventListener('resize', function () {
    htmlOf.center = '';
  });
  document.getElementById('speakBtn').addEventListener('click', toggleSpeak);
  document.getElementById('flashBtn').addEventListener('click', toggleFlash);

  // the code the projector shows carries the server and the room. a page opened without it
  // uses the class server, if this folder sits in the examples
  const fromUrl = new URLSearchParams(location.search).get('shareHost');
  const host = fromUrl || window.CLASS_SHARE_HOST || '';
  if (!host || host.indexOf('REPLACE-ME') >= 0) {
    serverProblem = 'This page has no server address. Scan the code on the big screen.';
    return;
  }
  serverOk = shareSetup({
    host: host,
    room: ROOM,
    me: { kind: 'phone', name: myName, seen: 0, buzz: false, flash: false, speak: false }
  });
  if (serverOk) {
    // one tap joins, and checks whether this phone can buzz. userSetupComplete() runs after it.
    // an iPhone has no vibration for web pages. p5-phone says so in the console and goes on
    enablePermissionsTap(['vibration'], 'Tap to join Conductor');
  }
}

function userSetupComplete() {
  joined = true;
  me.buzz = !!window.vibrationEnabled && !!window.isMobile;
  keepAwake();       // a phone that locks leaves the room
  shareConnect();
}

// ---- a cue arrives ----

// the projector sends one event for each cue. 1. is it for my role? 2. show it. 3. use
// whatever this phone can: a buzz, the light, a voice
function shareEvent(name, data) {
  if (name !== 'cue' || !joined || !data || typeof data.text !== 'string') {
    return;
  }
  const forMe = data.roles === 'all' || (Array.isArray(data.roles) && data.roles.indexOf(myRole) >= 0);
  if (!forMe || (lastCue && data.id <= lastCue.id)) {
    return;
  }
  lastCue = { id: data.id, text: data.text, at: millis() };
  me.seen = data.id;   // the projector counts how many phones have shown this cue

  if (window.vibrationEnabled) {
    vibrate(BUZZ);     // Android only. an iPhone has no vibration for web pages
  }
  if (flashOn) {
    blinkLight();
  }
  if (speakOn) {
    sayText(data.text);
  }
}

// ---- say it out loud ----

// speech works only after a tap has made the page speak once. the Speak button is that tap
function toggleSpeak() {
  if (!('speechSynthesis' in window)) {
    return;
  }
  speakOn = !speakOn;
  me.speak = speakOn;
  if (speakOn) {
    sayText('Speech is on.');   // this is the first speech. it has to be inside the tap
  } else {
    speechSynthesis.cancel();
  }
}

function sayText(words) {
  speechSynthesis.cancel();     // a new cue cuts off the last one
  speechSynthesis.speak(new SpeechSynthesisUtterance(words));
}

// ---- flash the light ----

// A web page reaches the light through the rear camera, so turning this on asks for the
// camera. The camera stays open while it is on. Nothing is recorded or sent.
async function toggleFlash() {
  if (flashBusy || !window.isMobile) {
    return;
  }
  if (flashOn) {
    flashOn = false;
    me.flash = false;
    flashNote = '';
    await stopTorch();
    return;
  }
  flashBusy = true;
  flashNote = 'Asking for the camera';
  const ok = await setTorch(false);   // opens the rear camera with the light off
  if (ok && isTorchSupported()) {
    flashOn = true;
    me.flash = true;
    flashNote = '';
  } else {
    const denied = /denied|allowed|permission/i.test(window.torchError || '');
    flashNote = denied ? 'The camera was not allowed. Allow it in the browser settings, then tap again.' : 'This phone cannot switch its light from a web page.';
    await stopTorch();
  }
  flashBusy = false;
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function blinkLight() {
  if (blinking) {
    return;
  }
  blinking = true;
  for (let i = 0; i < FLASHES; i++) {
    await setTorch(true);
    await wait(FLASH_MS);
    await setTorch(false);
    await wait(FLASH_MS);
  }
  blinking = false;
}

// ---- keep the screen on ----

// ask the phone not to lock. a phone that locks leaves the room
async function keepAwake() {
  wantAwake = true;
  if (!('wakeLock' in navigator)) {
    return;
  }
  if (wakeLock && !wakeLock.released) {
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    screenAwake = true;
    wakeLock.addEventListener('release', function () {
      screenAwake = false;
    });
  } catch (e) {
    screenAwake = false;
  }
}
// a wake lock ends when the page is hidden. ask again when it comes back
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && wantAwake) {
    keepAwake();
  }
});

// a name this phone keeps, so it is the same one each time it joins
function rememberedName() {
  const pick = NAMES[Math.floor(Math.random() * NAMES.length)];
  try {
    const kept = localStorage.getItem('conductorName');
    if (kept) {
      return kept;
    }
    localStorage.setItem('conductorName', pick);
  } catch (e) { /* the name just will not be kept */ }
  return pick;
}

// ---- drawing the page ----

function draw() {
  paint();
}

function setHtml(id, html) {
  if (htmlOf[id] === html) {
    return false;
  }
  htmlOf[id] = html;
  document.getElementById(id).innerHTML = html;
  return true;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paint() {
  const connected = serverOk && joined && shareConnected;
  const fromProjector = connected && shared.roles ? (shared.roles[shareClientId] || '') : '';
  if (fromProjector && fromProjector !== myRole) {
    if (myRole) {
      changedAt = millis();
      if (window.vibrationEnabled) {
        vibrate(150);
      }
    }
    myRole = fromProjector;
  } else if (!fromProjector) {
    myRole = '';
  }

  const role = roleByName(myRole);
  const reading = connected && shared.mode === 'read';
  const cueOn = role && !reading && lastCue && millis() - lastCue.at < CUE_SECONDS * 1000;

  // the colours
  const screen = document.getElementById('screen');
  screen.style.background = role ? role.colour : '#141414';
  screen.style.color = role ? role.ink : '#ffffff';

  // the words in the middle
  let html;
  if (serverProblem) {
    html = '<div class="sub">' + esc(serverProblem) + '</div>';
  } else if (!joined) {
    html = '<div class="roleName">Conductor</div><div class="sub">Tap the screen to join.</div>';
  } else if (!connected) {
    html = '<div class="roleName">Connecting</div>';
  } else if (!role) {
    html = '<div class="roleName">Waiting</div><div class="sub">The big screen gives out roles. This takes a moment.</div>';
  } else if (cueOn) {
    html = '<div id="cueRole">' + role.shape + ' ' + role.name.toUpperCase() + '</div><div id="cueText" data-cue="' + lastCue.id + '">' + esc(lastCue.text) + '</div>';
  } else {
    let sub = 'Wait for a cue. Keep this screen on.';
    if (reading) {
      sub = 'A person is reading the cues out loud. Listen for your role.';
    } else if (millis() - changedAt < 5000) {
      sub = 'Your role changed. You are now ' + role.name + '.';
    }
    html = '<div class="glyph">' + role.shape + '</div><div class="roleName">' + role.name.toUpperCase() + '</div><div class="sub">' + sub + '</div>';
    if (lastCue && !reading) {
      html += '<div id="lastCue">Last cue: ' + esc(lastCue.text) + '</div>';
    }
  }
  if (setHtml('center', html) && cueOn) {
    fitCue();
    const el = document.getElementById('center');
    el.classList.remove('pop');
    void el.offsetWidth;       // lets the animation start again
    el.classList.add('pop');
  }

  document.getElementById('who').textContent = joined ? myName : '';
  paintToggles();
  document.getElementById('foot').textContent = footerLine(connected);
}

// make the cue as big as it can be and still fit in the middle of the screen
function fitCue() {
  const el = document.getElementById('cueText');
  const box = document.getElementById('center');
  let size = Math.min(window.innerWidth * 0.3, window.innerHeight * 0.2);
  el.style.fontSize = size + 'px';
  while ((el.scrollWidth > el.clientWidth || el.offsetHeight > box.clientHeight * 0.78) && size > 16) {
    size -= 2;
    el.style.fontSize = size + 'px';
  }
}

function paintToggles() {
  const speak = document.getElementById('speakBtn');
  const flash = document.getElementById('flashBtn');
  const canSpeak = 'speechSynthesis' in window;
  speak.classList.toggle('on', speakOn);
  speak.disabled = !canSpeak;
  setHtml('speakBtn',
    '<span class="t">Speak cues aloud: ' + (speakOn ? 'on' : 'off') + '</span>' +
    '<span class="s">' + (!canSpeak ? 'This phone cannot speak from a web page.' : (speakOn ? 'Tap to turn off.' : 'Tap to turn on. Your phone will say each cue.')) + '</span>');

  flash.classList.toggle('on', flashOn);
  flash.disabled = !window.isMobile;
  let words = 'Tap to turn on. It asks to use the camera. Nothing is recorded.';
  if (!window.isMobile) {
    words = 'Phones only. A laptop has no light to flash.';
  } else if (flashOn) {
    words = 'The rear camera stays open to reach the light. Nothing is recorded.';
  } else if (flashNote) {
    words = flashNote;
  }
  setHtml('flashBtn', '<span class="t">Flash my light on cues: ' + (flashOn ? 'on' : 'off') + '</span><span class="s">' + esc(words) + '</span>');
}

function footerLine(connected) {
  if (serverProblem || !joined) {
    return '';
  }
  let line = connected ? 'Connected' : (shareStatus === 'error' ? 'Cannot reach the server. Trying again' : 'Connecting');
  line += window.vibrationEnabled && window.isMobile ? '. This phone can buzz' : '. This phone cannot buzz';
  if (wantAwake) {
    line += screenAwake ? '. Screen stays on' : '. Keep your screen on';
  }
  return line;
}
