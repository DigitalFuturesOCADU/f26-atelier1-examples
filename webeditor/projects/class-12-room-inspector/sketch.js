// Room Inspector
// A tool for looking inside a Share room. It joins a room as one more page and shows:
//   every other page in the room, with its id and everything in its me,
//   which values just changed, and how long ago,
//   the room's shared,
//   every event, with who sent it, and every join and leave,
//   and what this page sends itself.
//
// Open it with the room and app of the sketch you want to watch:
//   .../room-inspector/?room=class&app=send-a-number
// It has no name in me, so the Share Basics leave it out of their lists.

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server

const params = new URLSearchParams(location.search);
const room = (params.get('room') || '').trim();
const app = (params.get('app') || '').trim();
let seen = {};      // for each phone id: its last values, and when each one changed
let entries = [];       // events, joins and leaves, newest first

function setup() {
  noCanvas();
  frameRate(10);   // the page updates ten times a second
  select('#room').value(room);
  select('#app').value(app);
  if (!room) return;

  shareSetup({ host: SHARE_HOST, room: room, app: app || 'default', me: { role: 'inspector', test: 0 } });
  shareConnect();   // no tap needed: this page asks for nothing

  select('#test').input(function () {
    me.test = Number(select('#test').value());
  });
  select('#ping').mousePressed(function () {
    if (!shareConnected) return;
    shareEmit('ping', { test: me.test });
    addToLog('event', 'ping', shareClientId, { test: me.test }, 'this page');   // the sender never gets it back
  });
}

function draw() {
  if (!room) return;
  select('#status').html(safe(shareStatusText()) +
    (shareConnected ? ' &middot; this page is <span class="mono">' + short(shareClientId) + '</span>' +
      (shareIsHost ? ' (the host)' : '') : '') +
    ' &middot; app <span class="mono">' + safe(app || 'default') + '</span>');

  select('#phones-heading').html('In the room: ' + guests.length + (guests.length === 1 ? ' other page' : ' other pages'));
  let cards = '';
  for (const g of guests) cards += card(g);
  select('#phones').html(cards || '<p>Nobody else yet. Open a sketch with the same room and app.</p>');

  select('#shared').html(safe(JSON.stringify(shared, null, 2)));
  select('#me').html(safe(JSON.stringify(me)));

  let items = '';
  for (const item of entries) {
    items += '<li><span class="t">' + item.time + '</span> ';
    if (item.kind === 'event') {
      items += '<span class="n">' + safe(item.name) + '</span> from ' + safe(item.who) +
        ' <span class="mono">' + short(item.from) + '</span>' +
        (item.data === undefined ? '' : ' <span class="mono">' + safe(JSON.stringify(item.data)) + '</span>');
    } else {
      items += safe(item.who) + ' <span class="mono">' + short(item.from) + '</span> ' + item.kind;
    }
    items += '</li>';
  }
  select('#events').html(items || '<li class="quiet">No events yet.</li>');
}

// one card for one page in the room. Values that changed in the last second are lit
function card(g) {
  const now = millis();
  const s = seen[g.id] || (seen[g.id] = { values: {}, changed: {}, last: now });
  let rows = '';
  for (const key of Object.keys(g)) {
    if (key === 'id') continue;
    const value = JSON.stringify(g[key]);
    if (s.values[key] !== value) {
      s.values[key] = value;
      s.changed[key] = now;
      s.last = now;
    }
    const fresh = now - s.changed[key] < 1000 ? ' fresh' : '';
    rows += '<tr><td class="key">' + safe(key) + '</td><td class="val mono' + fresh + '">' + safe(value) + '</td></tr>';
  }
  const colour = typeof g.hue === 'number' ? 'hsl(' + g.hue + ', 70%, 60%)' : '#555';
  return '<div class="card" style="border-left-color: ' + colour + '">' +
    '<div class="who">' + safe(whoIs(g)) + '</div>' +
    '<div class="id mono">id ' + short(g.id) + ' &middot; last change ' + ((now - s.last) / 1000).toFixed(1) + ' s ago</div>' +
    '<table>' + (rows || '<tr><td class="quiet">sends nothing yet</td></tr>') + '</table></div>';
}

// every event any other page sends. from is the id of the page that sent it
function shareEvent(name, data, from) {
  addToLog('event', name, from, data, whoIs(shareGuest(from)));
}

function shareJoined(id, data) {
  addToLog('joined', '', id, undefined, whoIs(data));
}

function shareLeft(id, data) {
  addToLog('left', '', id, undefined, whoIs(data));
  delete seen[id];
}

function addToLog(kind, name, from, data, who) {
  const d = new Date();
  const time = d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0').slice(0, 1);
  entries.unshift({ kind: kind, name: name, from: from, data: data, who: who, time: time });
  entries = entries.slice(0, 40);
}

// a page's name, or its role, or "no name"
function whoIs(g) {
  if (!g) return 'a page that has left';
  if (g.name) return String(g.name);
  if (g.role) return String(g.role);
  return 'no name';
}

function short(id) {
  return id ? String(id).slice(0, 6) : '';
}

function safe(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
