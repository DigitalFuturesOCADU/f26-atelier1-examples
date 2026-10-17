// Conductor: Projector
// Share. The phone organizes the people. This page gives every phone a role (Red, Blue,
// Yellow or Green) and sends cues. A cue can go to everyone or to one role. Each phone shows
// its role, and when a cue arrives it shows the cue huge, buzzes (Android), can flash its
// light and can say the cue out loud. The last two are off until the person turns them on.
//
// While you send cues, the page builds a session score: a table of time, who, what and the
// cue. Copy score puts it on the clipboard as a table you can paste into a note.
//
// The comparison: press M to switch to Read aloud. The same cues now show here in big type,
// for a person to say out loud. The phones keep their roles and say nothing. Run the same
// cues both ways and see what changes.
//
// The rule: Share keeps only the last thing written, so this page is the only one that
// writes shared. A phone writes only its own me. A cue is a one-shot event (shareEmit), so a
// phone that joins late has missed the earlier cues, as it would in a room.
//
// Run this on the laptop that is on the projector, and open only one projector page for a
// room. Phones join with the code on the right. The score lives in this page. If you reload
// it, the roles stay and the score starts again, so copy the score first.
//
// Try this:
//   Send a cue to Everyone, then one to a single role. Watch the log: it counts the phones
//   that have seen it.
//   Close a phone's page. The roles even out again and the score notes who left.
//   Type your own cue and press Enter.
//
// Keys:
//   1 to 5   send a cue          left and right arrows   choose who it goes to
//   Enter    type your own cue   M   Phones or Read aloud
//   R        3 or 4 roles        S   shuffle the roles
//   C        copy the score      F   show only the big cue (Read aloud)
//
// Key data:
//   shared.roles   { [phoneId]: roleName }  the role of every phone. only this page writes it
//   shared.roleCount   3 or 4          shared.mode   'phones' or 'read'
//   shareEmit('cue', { id, text, roles })  roles is 'all' or a list like ['Red']
//   guests[i].seen   the id of the last cue that phone showed    guests[i].name   its name

const ROOM = 'conductor';

// the feel of the piece. change these before you change anything else.
const CUES = [
  'Stand up',
  'Hold it up',
  'Pass it left',
  'Sit down',
  'Swap places with someone of another role'
];
let roleCount = 4;       // how many roles are in play, 3 or 4
let mode = 'phones';     // 'phones' sends cues to the phones. 'read' shows them here, to read out

let roles = {};          // phone id to role name. this page's copy of shared.roles
let target = 'all';      // who the next cue goes to: 'all' or a role name
let phoneNames = {};     // phone id to name, kept after the phone leaves
let seenBy = {};         // phone id to the last cue it showed
let lastIds = [];        // the phones that were here a moment ago
let phoneKey = '';       // who is here now. when it changes, roles are given out again
let joinedBefore = false;
let score = [];          // the session score, one row per cue or event
let startedAt = 0;       // when the first cue went out. 0 until then
let lastCueId = 0;       // the id of the last cue sent
let readCue = null;      // what Read aloud shows now: { text, who }
let lastNote = '';       // a short message under the controls
let noteUntil = 0;
let copyNote = '';
let confirmClear = false;
let serverProblem = '';
let joinUrl = '';
let shortUrl = '';
let qrSize = 300;
let htmlOf = {};         // the last html written to each panel, so a panel is only redrawn when it changed

function setup() {
  noCanvas();
  frameRate(20);

  buildButtons();
  sizeThePage();
  window.addEventListener('resize', function () {
    sizeThePage();
    if (joinUrl && canShowCode()) {
      showJoinCode();
    }
  });
  document.addEventListener('keydown', onKey);

  startSharing();
}

// join the room as the projector. the page address can carry ?shareHost= to use another server
function startSharing() {
  const fromUrl = new URLSearchParams(location.search).get('shareHost');
  const host = fromUrl || window.CLASS_SHARE_HOST || '';
  if (!host || host.indexOf('REPLACE-ME') >= 0) {
    serverProblem = 'No server address yet. Add ?shareHost=https://your-server.workers.dev to the end of this page address.';
    return;
  }
  shareSetup({
    host: host,
    room: ROOM,
    shared: { roles: {}, roleCount: roleCount, mode: mode },
    me: { kind: 'projector' }
  });
  shareConnect().catch(function () {});

  // the phone page sits next to this one. getShareJoinUrl adds the server and the room
  const phonePage = new URL('../phone/', location.href);
  joinUrl = getShareJoinUrl(phonePage.href).replace(/%3A/gi, ':').replace(/%2F/gi, '/');
  shortUrl = phonePage.host + phonePage.pathname;
  if (canShowCode()) {
    showJoinCode();
  }
}

// the code only works on a page a phone can reach, so it shows on https
function canShowCode() {
  return location.protocol === 'https:' && window.self === window.top;
}

function showJoinCode() {
  showDesktopQr({
    url: joinUrl,
    share: false,          // the address already carries the server and the room
    size: qrSize,
    position: 'bottom-right',
    label: '',
    closable: false,
    rememberDismiss: false
  });
}

// this runs each time the page joins the room, and again if it has to join again
function shareReady() {
  // a page that was reloaded takes the roles the room already has, so nobody changes role
  if (!joinedBefore && shared.roles && typeof shared.roles === 'object') {
    roles = JSON.parse(JSON.stringify(shared.roles));
    roleCount = shared.roleCount === 3 ? 3 : 4;
    mode = shared.mode === 'read' ? 'read' : 'phones';
  }
  joinedBefore = true;
  phoneKey = '';
  writeShared();
}

function draw() {
  watchTheRoom();
  paint();
}

// ---- who is here, and what role each phone has ----

function phoneGuests() {
  return guests.filter(function (g) {
    return g.kind === 'phone';
  });
}

// 1. remember each phone's name. 2. when phones come or go, give out roles again.
// 3. note it in the score, if the piece has started.
function watchTheRoom() {
  if (!shareConnected) {
    return;
  }
  const here = phoneGuests();
  here.forEach(function (g) {
    phoneNames[g.id] = g.name || 'Someone';
    seenBy[g.id] = Math.max(seenBy[g.id] || 0, g.seen || 0);
  });
  const ids = here.map(function (g) {
    return g.id;
  }).sort();
  const key = ids.join(',');
  if (key === phoneKey) {
    return;
  }
  phoneKey = key;

  const before = lastIds;
  const oldRoles = Object.assign({}, roles);
  lastIds = ids;
  assignRoles(ids);

  if (started()) {
    before.filter(function (id) {
      return ids.indexOf(id) < 0;
    }).forEach(function (id) {
      addEvent(phoneNames[id] + ' (' + oldRoles[id] + ')', 'leaves');
    });
    ids.forEach(function (id) {
      if (before.indexOf(id) < 0) {
        addEvent(phoneNames[id] + ' (' + roles[id] + ')', 'joins');
      } else if (oldRoles[id] !== roles[id]) {
        addEvent(phoneNames[id] + ' (' + oldRoles[id] + ' to ' + roles[id] + ')', 'changes role');
      }
    });
  }
}

// Give every phone a role. A phone keeps the role it has. A new phone gets a role with the
// fewest phones on it, picked at random from the ties. If one role ends up with 2 more
// phones than another, one phone is moved. So the roles stay even at any size of room, and
// a phone's role rarely changes.
function assignRoles(ids) {
  const names = ROLES.slice(0, roleCount).map(function (r) {
    return r.name;
  });
  const next = {};
  const count = {};
  names.forEach(function (n) {
    count[n] = 0;
  });

  ids.forEach(function (id) {
    if (names.indexOf(roles[id]) >= 0) {
      next[id] = roles[id];
      count[roles[id]] += 1;
    }
  });
  ids.forEach(function (id) {
    if (!next[id]) {
      const fewest = Math.min(...names.map(function (n) {
        return count[n];
      }));
      const pick = random(names.filter(function (n) {
        return count[n] === fewest;
      }));
      next[id] = pick;
      count[pick] += 1;
    }
  });
  for (let tries = 0; tries < 100; tries++) {
    const most = names.reduce(function (a, b) {
      return count[b] > count[a] ? b : a;
    });
    const least = names.reduce(function (a, b) {
      return count[b] < count[a] ? b : a;
    });
    if (count[most] - count[least] < 2) {
      break;
    }
    const moved = random(ids.filter(function (id) {
      return next[id] === most;
    }));
    next[moved] = least;
    count[most] -= 1;
    count[least] += 1;
  }

  roles = next;
  if (names.indexOf(target) < 0) {
    target = 'all';
  }
  writeShared();
}

// the roles go in shared as one object, so a phone never sees half of a change
function writeShared() {
  if (!shareConnected) {
    return;
  }
  shared.roles = Object.assign({}, roles);
  shared.roleCount = roleCount;
  shared.mode = mode;
}

function started() {
  return startedAt > 0;
}

// ---- cues ----

function sendCue(text) {
  text = String(text).trim();
  if (!text) {
    return;
  }
  const who = target;
  const recipients = Object.keys(roles).filter(function (id) {
    return who === 'all' || roles[id] === who;
  });
  if (mode === 'phones') {
    if (!shareConnected) {
      note('Not connected to the server yet.');
      return;
    }
    if (recipients.length === 0) {
      note(who === 'all' ? 'No phones have joined yet.' : 'No phone has the role ' + who + '.');
      return;
    }
  }
  if (!started()) {
    startedAt = Date.now();
  }
  // the id is the time, so it only goes up, even if this page is reloaded
  const id = Math.max(Date.now(), lastCueId + 1);
  lastCueId = id;

  if (mode === 'phones') {
    shareEmit('cue', { id: id, text: text, roles: who === 'all' ? 'all' : [who] });
  } else {
    readCue = { text: text, who: who };
  }
  score.push({
    id: id,
    at: Date.now(),
    who: who === 'all' ? 'Everyone' : who,
    what: text,
    how: mode === 'phones' ? 'phone screens' : 'read aloud',
    to: recipients
  });
  target = 'all';   // one cue to a role, then back to everyone, so a cue never goes to the wrong group by accident
}

function addEvent(who, what) {
  score.push({ at: Date.now(), who: who, what: what, how: '-', event: true });
}

function setMode(next) {
  if (next === mode) {
    return;
  }
  mode = next;
  if (mode === 'phones') {
    document.body.classList.remove('reader');
  }
  if (started()) {
    addEvent('Everyone', mode === 'read' ? 'switched to read aloud' : 'switched to phones');
  }
  writeShared();
}

function setRoleCount(n) {
  if (n === roleCount) {
    return;
  }
  roleCount = n;
  roles = {};          // everyone is given a role again
  assignRoles(lastIds);
  if (started()) {
    addEvent('Everyone', 'roles set to ' + n);
  }
}

function shuffleRoles() {
  roles = {};
  assignRoles(lastIds);
  if (started()) {
    addEvent('Everyone', 'roles shuffled');
  }
}

function note(words) {
  lastNote = words;
  noteUntil = millis() + 3000;
}

// ---- the session score, as text ----

function clockText(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

// a table you can paste into a note. the last column is for you to fill in
function scoreAsText() {
  const cell = function (s) {
    return String(s).replace(/\|/g, '\\|');
  };
  let out = '| Time | Who | What | The cue | If someone refuses or leaves |\n';
  out += '|---|---|---|---|---|\n';
  score.forEach(function (r) {
    out += '| ' + clockText(r.at - startedAt) + ' | ' + cell(r.who) + ' | ' + cell(r.what) + ' | ' + cell(r.how) + ' | |\n';
  });
  return out;
}

function copyScore() {
  const text = scoreAsText();
  const done = function () {
    copyNote = 'Copied';
    setTimeout(function () {
      copyNote = '';
    }, 1800);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function () {
      oldCopy(text, done);
    });
  } else {
    oldCopy(text, done);
  }
}

// for a page the browser does not trust with the clipboard
function oldCopy(text, done) {
  const box = document.createElement('textarea');
  box.value = text;
  box.style.position = 'fixed';
  box.style.opacity = '0';
  document.body.appendChild(box);
  box.select();
  try {
    if (document.execCommand('copy')) {
      done();
    }
  } catch (e) { /* nothing more to try */ }
  document.body.removeChild(box);
}

function newSession() {
  if (!confirmClear) {
    confirmClear = true;
    setTimeout(function () {
      confirmClear = false;
    }, 3000);
    return;
  }
  confirmClear = false;
  score = [];
  startedAt = 0;
  readCue = null;
}

// ---- the buttons and the keys ----

function buildButtons() {
  const cueBox = document.getElementById('cueButtons');
  CUES.forEach(function (text, i) {
    const b = document.createElement('button');
    b.innerHTML = '<span class="key">' + (i + 1) + '</span>' + esc(text);
    b.addEventListener('click', function () {
      sendCue(text);
    });
    cueBox.appendChild(b);
  });

  document.getElementById('targets').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (b) {
      target = b.dataset.target;
    }
  });
  document.getElementById('modePhones').addEventListener('click', function () {
    setMode('phones');
  });
  document.getElementById('modeRead').addEventListener('click', function () {
    setMode('read');
  });
  document.getElementById('roles3').addEventListener('click', function () {
    setRoleCount(3);
  });
  document.getElementById('roles4').addEventListener('click', function () {
    setRoleCount(4);
  });
  document.getElementById('sendFree').addEventListener('click', sendFreeText);
  document.getElementById('copyScore').addEventListener('click', copyScore);
  document.getElementById('shuffle').addEventListener('click', shuffleRoles);
  document.getElementById('newSession').addEventListener('click', newSession);
}

function sendFreeText() {
  const box = document.getElementById('freeText');
  sendCue(box.value);
  box.value = '';
  box.blur();
}

function cycleTarget(step) {
  const choices = ['all'].concat(ROLES.slice(0, roleCount).map(function (r) {
    return r.name;
  }));
  const at = choices.indexOf(target);
  target = choices[(at + step + choices.length) % choices.length];
}

function onKey(e) {
  if (e.target && e.target.tagName === 'INPUT') {
    if (e.key === 'Enter') {
      sendFreeText();
    } else if (e.key === 'Escape') {
      e.target.blur();
    }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) {
    return;
  }
  const k = e.key.toLowerCase();
  const n = Number(k);
  if (n >= 1 && n <= CUES.length) {
    sendCue(CUES[n - 1]);
  } else if (k === 'arrowleft') {
    cycleTarget(-1);
    e.preventDefault();
  } else if (k === 'arrowright') {
    cycleTarget(1);
    e.preventDefault();
  } else if (k === 'm') {
    setMode(mode === 'phones' ? 'read' : 'phones');
  } else if (k === 'r') {
    setRoleCount(roleCount === 4 ? 3 : 4);
  } else if (k === 's') {
    shuffleRoles();
  } else if (k === 'c') {
    copyScore();
  } else if (k === 'f' && mode === 'read') {
    document.body.classList.toggle('reader');
  } else if (k === 'enter' || k === '/') {
    document.getElementById('freeText').focus();
    e.preventDefault();
  }
}

// ---- drawing the page ----

function sizeThePage() {
  const u = constrain(min(windowWidth / 1920, windowHeight / 1080), 0.6, 1.5);
  qrSize = round(constrain(min(windowHeight * 0.3, windowWidth * 0.2), 160, 380));
  const root = document.documentElement;
  root.style.setProperty('--u', u);
  root.style.setProperty('--qr', qrSize + 'px');
  root.style.setProperty('--col', (qrSize + 48) + 'px');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// write html into a panel, but only if it changed. a panel that is rewritten every frame
// loses the mouse and flickers
function setHtml(id, html) {
  if (htmlOf[id] === html) {
    return;
  }
  htmlOf[id] = html;
  document.getElementById(id).innerHTML = html;
}

function paint() {
  const body = document.body;
  body.classList.toggle('read', mode === 'read');
  document.getElementById('modePhones').classList.toggle('on', mode === 'phones');
  document.getElementById('modeRead').classList.toggle('on', mode === 'read');
  document.getElementById('roles3').classList.toggle('on', roleCount === 3);
  document.getElementById('roles4').classList.toggle('on', roleCount === 4);

  paintTargets();
  paintRoles();
  paintLog();
  paintReadView();
  paintScore();
  paintSide();
}

function paintTargets() {
  let html = '<button data-target="all" class="' + (target === 'all' ? 'on' : '') + '">Everyone</button> ';
  ROLES.slice(0, roleCount).forEach(function (r) {
    const on = target === r.name;
    const style = on ? 'background:' + r.colour + ';color:' + r.ink + ';border-color:' + r.colour : 'border-left: 10px solid ' + r.colour;
    html += '<button data-target="' + r.name + '" class="' + (on ? 'on' : '') + '" style="' + style + '">' + r.shape + ' ' + r.name + '</button> ';
  });
  if (lastNote && millis() < noteUntil) {
    html += '<span style="color:#ff8a7a;margin-left:12px;">' + esc(lastNote) + '</span>';
  }
  setHtml('targets', html);
}

function paintRoles() {
  const ids = Object.keys(roles);
  let html = '';
  ROLES.slice(0, roleCount).forEach(function (r) {
    const mine = ids.filter(function (id) {
      return roles[id] === r.name;
    });
    const names = mine.map(function (id) {
      return esc(phoneNames[id] || 'Someone');
    }).join(', ');
    html += '<div class="roleCard" style="background:' + r.colour + ';color:' + r.ink + ';">' +
      '<span class="count">' + mine.length + '</span>' +
      '<span class="shape">' + r.shape + '</span> <span class="name">' + r.name + '</span>' +
      '<div class="who">' + (names || 'nobody yet') + '</div></div>';
  });
  setHtml('rolesRow', html);

  // what each cue can use on these phones. some will only get the screen
  const here = phoneGuests();
  const n = here.length;
  const buzz = here.filter(function (g) { return g.buzz; }).length;
  const flash = here.filter(function (g) { return g.flash; }).length;
  const speak = here.filter(function (g) { return g.speak; }).length;
  setHtml('reach', 'Reach: <b>' + n + '</b> screens. <b>' + buzz + '</b> can buzz. <b>' + flash + '</b> will flash. <b>' + speak + '</b> will speak.');
}

function seenText(row) {
  if (row.how !== 'phone screens') {
    return { words: 'read aloud', done: false };
  }
  const got = row.to.filter(function (id) {
    return (seenBy[id] || 0) >= row.id;
  }).length;
  return { words: 'seen ' + got + ' of ' + row.to.length, done: got === row.to.length };
}

// the last few cues, big, with how many phones have shown each one
function paintLog() {
  const rows = score.filter(function (r) {
    return !r.event;
  }).slice(-4).reverse();
  let html = '';
  if (rows.length === 0) {
    html = '<div class="logRow"><span class="c grey" style="font-weight:400;">No cues yet. Press 1 to 5.</span></div>';
  }
  rows.forEach(function (r) {
    const s = seenText(r);
    html += '<div class="logRow"><span class="t">' + clockText(r.at - startedAt) + '</span><span class="w">' + esc(r.who) + '</span>' +
      '<span class="c">' + esc(r.what) + '</span><span class="s ' + (s.done ? 'done' : '') + '">' + s.words + '</span></div>';
  });
  setHtml('log', html);
}

// Read aloud: the cue in big type, for a person to say out loud instead of the phones
function paintReadView() {
  let html;
  if (!readCue) {
    html = '<div class="to grey">READ ALOUD</div><div class="words empty">The first cue shows here. Press 1 to 5.</div>';
  } else {
    const role = roleByName(readCue.who);
    const to = readCue.who === 'all'
      ? '<span class="chip" style="background:#ffffff;color:#141414;">Everyone</span>'
      : '<span class="chip" style="background:' + role.colour + ';color:' + role.ink + ';">' + role.shape + ' ' + role.name + '</span>';
    html = '<div class="to">READ TO ' + to + '</div><div class="words">' + esc(readCue.text) + '</div>';
  }
  setHtml('readView', html);
}

function paintScore() {
  let html;
  if (score.length === 0) {
    html = '<p class="grey">The score fills in as you send cues. The clock starts at the first one.</p>';
  } else {
    html = '<table><tr><th style="width:90px;">Time</th><th style="width:220px;">Who</th><th>What</th><th style="width:210px;">The cue</th></tr>';
    score.slice().reverse().forEach(function (r) {
      html += '<tr><td>' + clockText(r.at - startedAt) + '</td><td>' + esc(r.who) + '</td><td' + (r.event ? ' class="none"' : '') + '>' + esc(r.what) + '</td><td class="none">' + esc(r.how) + '</td></tr>';
    });
    html += '</table>';
  }
  setHtml('scoreTable', html);
  document.getElementById('clock').textContent = started() ? 'Session ' + clockText(Date.now() - startedAt) : 'Not started';
  setHtml('copyScore', '<span class="key">C</span>' + (copyNote || 'Copy score'));
  setHtml('newSession', confirmClear ? 'Click again to clear' : 'New session');
}

function paintSide() {
  document.getElementById('phoneCount').textContent = phoneGuests().length;
  let dot = '#ffc800';
  let words = 'Connecting';
  if (serverProblem) {
    dot = '#ff5a4d';
    words = serverProblem;
  } else if (shareConnected) {
    dot = '#5ce08a';
    words = 'Connected';
  } else if (shareStatus === 'error') {
    dot = '#ff5a4d';
    words = 'Cannot reach the server. Trying again';
  }
  document.getElementById('dot').style.background = dot;
  document.getElementById('statusWords').textContent = words;
  document.getElementById('roomName').textContent = serverProblem ? '' : 'Room: ' + ROOM;

  if (!serverProblem) {
    if (canShowCode()) {
      setHtml('joinWords', '<p class="scan">SCAN TO JOIN</p><p class="addr">' + esc(shortUrl) + '</p>');
    } else {
      setHtml('joinWords', '<p class="scan">OPEN ON A PHONE</p><p class="addr">' + esc(joinUrl) + '</p><p class="hint" style="margin-top:8px;">The code shows on https pages.</p>');
    }
  }
}
