// Share load test. Opens N fake phones on one Share room and checks that the room keeps up.
//
//   node tests/share-load/load.mjs <host> <room> [N] [options]
//
//   host     the Share server, like https://p5-phone-share.you.workers.dev
//            (http://127.0.0.1:8790 for a local `wrangler dev`)
//   room     a room name nobody else is using. Use a test name, never a class room.
//   N        how many phones, default 30
//
//   --seconds=15   how long the phones send after the last one has joined
//   --hz=10        updates per second per phone (a tilting phone sends about 10)
//   --stagger=50   milliseconds between one phone joining and the next. 0 joins all at once
//   --app=default  the app name, as in shareSetup({ app })
//
// Needs Node 22 or newer. No packages. It speaks the P5PhoneShare wire protocol (version 2)
// directly, the same messages p5-phone sends, so it measures the server and the network,
// not the browser.
//
// What each fake phone does: joins with me = { role: 'phone', load: true }, then sets me.x and me.y
// and me.t (the time it sent) every 1/hz of a second. Phone 0 also plays the projector:
// it writes shared.probe five times a second, like a projector writing the class average.
//
// What it reports: how long joining took, how many messages each phone sent and received
// per second, how late updates from other phones arrived (the clocks are the same
// machine, so the difference is real), and whether every phone can see all the others.

const args = process.argv.slice(2);
const flags = {};
const pos = [];
for (const a of args) {
  const m = a.match(/^--([a-z]+)=(.*)$/);
  if (m) flags[m[1]] = m[2];
  else pos.push(a);
}

if (pos.length < 2) {
  console.error('Usage: node tests/share-load/load.mjs <host> <room> [N] [--seconds=15] [--hz=10] [--stagger=50]');
  process.exit(2);
}
if (typeof WebSocket === 'undefined') {
  console.error('This needs Node 22 or newer (global WebSocket).');
  process.exit(2);
}

const host = pos[0].replace(/\/$/, '');
const room = pos[1];
const N = Math.max(1, parseInt(pos[2] || '30', 10));
const SECONDS = Number(flags.seconds || 15);
const HZ = Number(flags.hz || 10);
const STAGGER = Number(flags.stagger === undefined ? 50 : flags.stagger);
const APP = flags.app || 'default';

const wsUrl = host.replace(/^http/i, 'ws') + '/parties/share-room/' +
  encodeURIComponent(APP + ':' + room);

const now = () => performance.now();
const wall = () => Date.now();

function pct(sorted, p) {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}
const fmt = (x, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : 'n/a');

class Phone {
  constructor(i) {
    this.i = i;
    this.id = '';
    this.guests = new Map();      // id -> kind ('load' for another fake phone), from welcome and presence
    this.sendersSeen = new Set(); // ids whose me patches reached this phone
    this.joinMs = NaN;
    this.sent = 0;
    this.sentBytes = 0;
    this.received = 0;
    this.receivedBytes = 0;
    this.errors = [];
    this.closed = false;
    this.latency = [];            // ms, other phones' me.t
    this.probeLatency = [];       // ms, shared.probe from phone 0
    this.timer = null;
    this.probeTimer = null;
    this.ready = new Promise((resolve) => { this.markReady = resolve; });
  }

  connect() {
    return new Promise((resolve) => {
      const t0 = now();
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      ws.onopen = () => {
        this.send({
          type: 'hello', v: 2, app: APP, room,
          me: { role: 'phone', load: true, i: this.i, name: 'load' + this.i, hue: (this.i * 47) % 360, x: 0, y: 0 },
          shared: {}
        });
      };
      ws.onmessage = (ev) => {
        const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
        this.received += 1;
        this.receivedBytes += raw.length;
        let msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }
        this.handle(msg, t0, resolve);
      };
      ws.onerror = () => {
        this.errors.push('socket error');
        this.markReady();
        resolve();
      };
      ws.onclose = (ev) => {
        this.closed = true;
        if (!this.leaving) this.errors.push('closed ' + ev.code);
        this.markReady();
        resolve();
      };
    });
  }

  handle(msg, t0, resolve) {
    if (msg.type === 'welcome') {
      this.id = msg.clientId;
      this.joinMs = now() - t0;
      this.guests = new Map();
      for (const g of msg.guests || []) this.guests.set(g.id, g.data && (g.data.load ? 'load' : g.data.role));
      this.markReady();
      resolve();
    } else if (msg.type === 'presence') {
      this.guests = new Map();
      for (const g of msg.guests || []) if (g.id !== this.id) this.guests.set(g.id, g.data && (g.data.load ? 'load' : g.data.role));
    } else if (msg.type === 'patch' || msg.type === 'batch') {
      const ops = msg.type === 'patch' ? [msg] : msg.ops || [];
      for (const op of ops) {
        if (op.scope === 'me' && op.path === 't' && msg.clientId !== this.id) {
          this.sendersSeen.add(msg.clientId);
          this.latency.push(wall() - op.value);
        } else if (op.scope === 'shared' && op.path === 'probe' && msg.clientId !== this.id) {
          this.probeLatency.push(wall() - op.value);
        }
      }
    } else if (msg.type === 'error') {
      this.errors.push(msg.message);
    }
  }

  send(obj) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    const s = JSON.stringify(obj);
    this.ws.send(s);
    this.sent += 1;
    this.sentBytes += s.length;
  }

  start() {
    const period = 1000 / HZ;
    let k = 0;
    this.timer = setInterval(() => {
      k += 1;
      this.send({
        type: 'batch', v: 2,
        ops: [
          { scope: 'me', path: 'x', value: Math.round(Math.sin(k / 7 + this.i) * 100) / 100 },
          { scope: 'me', path: 'y', value: Math.round(Math.cos(k / 9 + this.i) * 100) / 100 },
          { scope: 'me', path: 't', value: wall() }
        ]
      });
    }, period);
    if (this.i === 0) {
      this.probeTimer = setInterval(() => {
        this.send({ type: 'patch', v: 2, scope: 'shared', path: 'probe', value: wall() });
      }, 200);
    }
  }

  stop() {
    clearInterval(this.timer);
    clearInterval(this.probeTimer);
  }

  leave() {
    this.leaving = true;
    try { this.ws.close(1000, 'bye'); } catch (e) { /* already closed */ }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Share load test`);
  console.log(`  server  ${host}`);
  console.log(`  room    ${APP}:${room}`);
  console.log(`  phones  ${N}   ${HZ} updates/s each   ${SECONDS} s of traffic   joins ${STAGGER ? STAGGER + ' ms apart' : 'all at once'}`);
  console.log('');

  const phones = Array.from({ length: N }, (_, i) => new Phone(i));
  const joinStart = now();
  const connecting = [];
  for (const p of phones) {
    connecting.push(p.connect());
    if (STAGGER) await sleep(STAGGER);
  }
  // Wait for every welcome, or give up after 15 s.
  await Promise.race([Promise.all(phones.map((p) => p.ready)), sleep(15000)]);
  const allJoinedMs = now() - joinStart;
  const joined = phones.filter((p) => Number.isFinite(p.joinMs));
  console.log(`Joined ${joined.length} of ${N} in ${fmt(allJoinedMs)} ms`);

  // Everyone sends. Start counting messages from here.
  for (const p of phones) { p.sent = 0; p.sentBytes = 0; p.received = 0; p.receivedBytes = 0; p.latency = []; p.probeLatency = []; p.sendersSeen = new Set(); }
  const trafficStart = now();
  for (const p of joined) p.start();
  await sleep(SECONDS * 1000);
  for (const p of phones) p.stop();
  const trafficSecs = (now() - trafficStart) / 1000;
  await sleep(500);

  // Does every phone see all the others? Only the fake phones are counted. A projector page
  // or a real phone in the same room is a guest too, and is left out of the count.
  const phoneGuests = (p) => [...p.guests.values()].filter((r) => r === 'load').length;
  const seeAll = phones.filter((p) => phoneGuests(p) === N - 1).length;
  const seeAllTraffic = phones.filter((p) => p.sendersSeen.size === N - 1).length;
  const guestCounts = phones.map(phoneGuests);
  const otherPages = Math.max(...phones.map((p) => p.guests.size - phoneGuests(p)));
  const gMin = Math.min(...guestCounts);
  const gMax = Math.max(...guestCounts);

  const joinTimes = joined.map((p) => p.joinMs).sort((a, b) => a - b);
  const lat = phones.flatMap((p) => p.latency).sort((a, b) => a - b);
  const plat = phones.flatMap((p) => p.probeLatency).sort((a, b) => a - b);
  const totalSent = phones.reduce((s, p) => s + p.sent, 0);
  const totalRecv = phones.reduce((s, p) => s + p.received, 0);
  const recvBytes = phones.reduce((s, p) => s + p.receivedBytes, 0);
  const sentBytes = phones.reduce((s, p) => s + p.sentBytes, 0);
  const perPhoneRecv = phones.map((p) => p.received / trafficSecs).sort((a, b) => a - b);
  const perPhoneSent = phones.map((p) => p.sent / trafficSecs).sort((a, b) => a - b);
  const errors = phones.flatMap((p) => p.errors.map((e) => `phone ${p.i}: ${e}`));

  console.log('');
  console.log('Join time (hello to welcome), ms');
  console.log(`  fastest ${fmt(joinTimes[0])}   median ${fmt(pct(joinTimes, 50))}   slowest ${fmt(joinTimes[joinTimes.length - 1])}`);
  console.log('');
  console.log(`Traffic over ${fmt(trafficSecs, 1)} s`);
  console.log(`  each phone sends     ${fmt(pct(perPhoneSent, 50), 1)} messages/s   (${fmt(sentBytes / trafficSecs / 1024, 1)} KB/s from all phones)`);
  console.log(`  each phone receives  ${fmt(pct(perPhoneRecv, 50), 1)} messages/s   (lowest ${fmt(perPhoneRecv[0], 1)}, highest ${fmt(perPhoneRecv[perPhoneRecv.length - 1], 1)})`);
  console.log(`  the room sends out   ${fmt(totalRecv / trafficSecs)} messages/s in total   (${fmt(recvBytes / trafficSecs / 1024, 1)} KB/s)`);
  console.log(`  the room takes in    ${fmt(totalSent / trafficSecs)} messages/s in total`);
  console.log('');
  console.log('How late updates arrive, ms (a phone sends, another phone receives)');
  console.log(`  phone to phone   median ${fmt(pct(lat, 50))}   95th ${fmt(pct(lat, 95))}   slowest ${fmt(lat[lat.length - 1])}   (${lat.length} samples)`);
  console.log(`  shared.probe     median ${fmt(pct(plat, 50))}   95th ${fmt(pct(plat, 95))}   slowest ${fmt(plat[plat.length - 1])}   (${plat.length} samples)`);
  console.log('');
  console.log('Does every phone see all the others?');
  console.log(`  guests list has ${N - 1} other phones on ${seeAll} of ${N} phones   (smallest list ${gMin}, largest ${gMax})` + (otherPages ? `   plus ${otherPages} real page${otherPages === 1 ? '' : 's'} in the room, not counted` : ''));
  console.log(`  updates arrived from all ${N - 1} others on ${seeAllTraffic} of ${N} phones`);
  console.log('');

  // Leave, and check the room notices.
  const leavers = phones.slice(Math.floor(N / 2));
  for (const p of leavers) p.leave();
  await sleep(1200);
  const stayers = phones.slice(0, Math.floor(N / 2));
  const afterLeave = stayers.filter((p) => phoneGuests(p) === stayers.length - 1).length;
  console.log(`After ${leavers.length} phones leave: ${afterLeave} of ${stayers.length} remaining phones show the right guest count (${stayers.length - 1})`);
  for (const p of stayers) p.leave();
  await sleep(300);

  console.log('');
  if (errors.length) {
    console.log(`Errors (${errors.length}):`);
    for (const e of errors.slice(0, 10)) console.log('  ' + e);
  } else {
    console.log('Errors: none');
  }

  const pass = joined.length === N && seeAll === N && seeAllTraffic === N && errors.length === 0 && afterLeave === stayers.length;
  console.log('');
  console.log(pass ? 'PASS: every phone joined, saw all the others, and nothing failed.' : 'FAIL: see the lines above.');
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
