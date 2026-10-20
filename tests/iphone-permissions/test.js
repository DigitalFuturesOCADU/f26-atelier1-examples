// One tap asks for the permissions in the order given by ?order=, through three-phone's
// enablePermissionsTap, exactly as the examples do. Then the page checks each one:
//   motion  did DeviceOrientationEvent.requestPermission answer, and do readings arrive?
//   sound   is three-phone's audio context running, and does a beep play a second later?
//   camera  did the camera start?

const order = new URLSearchParams(location.search).get('order');
const lines = [];

function say(label, ok, detail) {
  lines.push(label + ': ' + (ok ? 'yes' : 'no') + (detail ? ' (' + detail + ')' : ''));
  const p = document.createElement('p');
  p.className = 'result';
  p.innerHTML = '<span class="' + (ok ? 'yes' : 'no') + '">' + (ok ? 'Yes' : 'No') + '</span> ' + label +
    (detail ? ' <span class="note">' + detail + '</span>' : '');
  document.getElementById('lines').appendChild(p);
}

if (order) {
  document.getElementById('menu').hidden = true;
  document.getElementById('test').hidden = false;
  const list = order.split(',');
  const named = list.map((name) => (name === 'sensors' ? 'motion' : name));
  document.getElementById('orderLine').textContent = 'Order: ' + named.join(', then ');

  // Watch what the motion request answers. three-phone catches its error and carries on,
  // so without this the page could not tell "allowed" from "never asked".
  let motionAnswer = 'not asked';
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    const ask = DeviceOrientationEvent.requestPermission.bind(DeviceOrientationEvent);
    DeviceOrientationEvent.requestPermission = () => ask().then(
      (answer) => { motionAnswer = answer; return answer; },
      (error) => { motionAnswer = 'error: ' + error.message; throw error; });
  } else {
    motionAnswer = 'this browser does not ask';
  }

  let readings = 0;
  addEventListener('deviceorientation', (e) => { if (e.beta !== null) readings++; });

  if (list.includes('camera')) createPhoneCamera('environment', false, 'cover');
  enablePermissionsTap(list, 'Tap once. Then allow everything the phone asks.');

  window.userSetupComplete = () => {
    setTimeout(() => {
      if (list.includes('sensors')) {
        say('Motion', readings > 0, 'request: ' + motionAnswer + ', readings in 1.5 s: ' + readings);
      }
      if (list.includes('sound')) {
        const ctx = getAudioContext();
        const running = ctx && ctx.state === 'running';
        if (running) beep(ctx);
        say('Sound', running, 'audio context ' + (ctx ? ctx.state : 'missing') + (running ? '. You should hear a beep.' : ''));
      }
      if (list.includes('camera')) say('Camera', !!window.cameraEnabled);
      document.getElementById('copy').hidden = false;
    }, 1500);
  };

  document.getElementById('copy').addEventListener('click', async () => {
    const text = ['iPhone Permission Order', navigator.userAgent, 'Order: ' + named.join(', '), ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      document.getElementById('copyNote').textContent = 'Copied. Paste it into the chat.';
    } catch (e) {
      document.getElementById('copyNote').textContent = text;
    }
  });
}

// a short beep, played a second and a half after the tap, outside it
function beep(ctx) {
  const osc = ctx.createOscillator();
  const volume = ctx.createGain();
  osc.frequency.value = 660;
  volume.gain.setValueAtTime(0.3, ctx.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(volume).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}
