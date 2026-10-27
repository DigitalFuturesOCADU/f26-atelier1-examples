# One Cow to Many: the steps

Source for the Canvas walkthrough. One sketch, six snapshots. Each snapshot is a
complete, working sketch in its own folder, and each one adds one idea to the last.

| Step | Folder | The one idea | Kind of sharing |
|---|---|---|---|
| 0 | `0-one-cow` | One player. A shake is one step and one note. | none |
| 1 | `1-join-a-room` | Join a room. | connection |
| 2 | `2-say-who-you-are` | Send who you are: a name and a colour. | identity |
| 3 | `3-everyones-cow` | Send your steps, and draw everyone's cow. | state |
| 4 | `4-hear-every-step` | Tell everyone when you step, so they hear it. | event |
| 5 | `5-lean-together` | Send how far you tilt, all the time. | stream |

Live snapshots (once pushed), each with a QR code on a laptop:

- https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/one-cow-to-many/0-one-cow/
- https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/one-cow-to-many/1-join-a-room/
- https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/one-cow-to-many/2-say-who-you-are/
- https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/one-cow-to-many/3-everyones-cow/
- https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/one-cow-to-many/4-hear-every-step/
- https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/one-cow-to-many/5-lean-together/

The snapshots use `ROOM = 'cow'`. Add `?room=a1-otter` to any snapshot's address to
open it in another room without changing the code.

Room Inspector for your room (change `a1-otter` to yours):
https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11/room-inspector/?room=a1-otter&app=one-cow-to-many

## Testing on a laptop

You can build every step without a phone.

- **A click or the space bar is a pretend shake.** It calls `takeStep()`, the same
  function a shake calls. That is fake data: it tests everything but the sensor.
- **The mouse, left and right, is a pretend tilt** (step 5).
- **Two people on one laptop:** open the sketch in two browser windows side by side.
  Not two tabs: you want to see both at once. Each window is one person, with its own
  name, colour and cow. Click in one window, then press space there.
- **Then add the phone.** Scan the QR code in the top right corner. It carries the room,
  so the phone joins the same room as the laptop.

In the p5.js Web Editor, save the sketch first, or the QR code has no address to open.

---

## Step 0 · One Cow

**The idea:** one phone, one cow. Each shake is one step: the next frame of the GIF, and
one note of a climbing tune. The cow walks on the spot.

**Start from:** `0-one-cow/sketch.js`. There is no Share in it. Read these parts before
you go on, because every later step changes them:

- `let steps = 0;` the step count. The frame and the note both come from it.
- `takeStep()` adds one to `steps` and plays the note. A shake calls it, and so do a
  click and the space bar on a laptop.
- `frames` holds every frame of the GIF as its own picture, copied once in `setup()`. Cow
  number `n` shows `frames[n % frames.length]`, so two cows can show two frames at once.
- `drawCow(n, y, h)` draws one cow for step count `n`, in a band from `y` to `y + h`.
- `playNote(n)` plays the note for step count `n`.

**When it works, you see:**

- Before the tap, the message `Tap to start`, and `tap to start` at the bottom.
- After the tap, `step 0` at the top.
- At the bottom, `shake the phone` on a phone, or `no shake here. click or press space`
  on a laptop.
- Each shake (or click, or space) makes the number go up by one, the cow's legs move
  on by one frame, and you hear one note. The cow stays where it is.

**Test on a laptop:** click `Tap to start`, then press space five times. You see `step 5`
and hear five notes, each one higher.

**Test on a phone:** scan the QR code. Tap to start, then shake. One shake, one step.
A hard shake still counts once: `lockout` waits 400 milliseconds before the next step.

**Likely mistakes:**

- The first tap does not step. That is right: the first tap turns on motion and sound.
- No sound on an iPhone: the ring and silent switch on the side is on silent. Turn it off.
- Steps happen when you only move the phone a little: raise `shakeLevel` (try 40).
  Lower is easier, higher is harder.
- Do not name a function `step()`. p5.js already uses that name, and the sketch stops
  with "Cannot redefine property: step". That is why it is `takeStep()`.

---

## Step 1 · Join a Room

**The idea:** the same cow, now in a room. Nothing is sent yet. The cow still only listens
to you.

**Before you start:** Share needs p5-phone 1.16.0. Look at the p5-phone line in your
`index.html`. If it says `1.15.3`, change it to `1.16.0`:

```html
<script src="https://cdn.jsdelivr.net/npm/p5-phone@1.16.0/dist/p5-phone.min.js"></script>
```

(Every snapshot already uses 1.16.0, so their `index.html` never changes.)

**1. At the top, under the comments:** the server and your room. Put your own room in `ROOM`.

```js
const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'a1-otter';      // your room
```

**2. Inside `setup()`, after `setShakeThreshold(shakeLevel);`:** join the room. `me` is
what this phone sends to everyone else. It is empty for now.

```js
  // the room. me is what this phone sends to everyone else. nothing yet
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'one-cow-to-many',
    me: {}
  });
```

**3. Change the `enablePermissionsTap` line:** add `'share'` at the end of the list, so
the same tap joins the room.

```js
  enablePermissionsTap(['motion', 'sound', 'share'], 'Tap to start');   // the tap joins the room too
```

Keep `'motion'` and `'sound'` first. An iPhone only allows them at the very start of a tap.

**4. At the end of `draw()`, after the `if ... else` for the words at the bottom:** say if
you are in the room, and show what you send.

```js
  text(shareStatusText(), 20 * k, height - 70 * k);   // are you in the room?
  textWrap(CHAR);   // what you send has no spaces, so let it break anywhere
  text('you send ' + JSON.stringify(me), 20 * k, height - 52 * k, width - 40 * k, 48 * k);   // a box, so a long line wraps
```

**When it works, you see:**

- Before the tap: `Tap to join room a1-otter.`
- After the tap: `In room a1-otter · nobody else here yet`
- Under it: `you send {}`
- The cow still steps when you shake, click or press space. Nothing else has changed.

**Test on a laptop:** open the Room Inspector for your room in another window. It says
`In the room: 1 other page`, and shows a page with an id and nothing else, because `me`
is empty. Open your sketch in a second window and tap to start: it now says
`In room a1-otter · 1 other here`. (The Room Inspector counts as one.)

**Test on a phone:** scan the QR code on your laptop. The phone shows the same room, and
the laptop's count goes up by one.

**Likely mistakes:**

- `No room yet. Call shareSetup({ host, room }) in setup().` `shareSetup` is missing, or
  it is below `enablePermissionsTap`.
- It stays on `Tap to join room ...` after the tap: `'share'` is not in the list.
- `Joining room ...` that never finishes, or `Cannot reach the room.`: a typo in
  `SHARE_HOST`. It must start with `https://`.
- The sketch stops with "shareStatusText is not defined": `index.html` still loads
  p5-phone 1.15.3. Change it to 1.16.0.
- Someone else's sketch shows up: two people typed the same `ROOM`. Use the room you were given.

---

## Step 2 · Say Who You Are

**The idea:** identity. `me` sends a name and a colour. Your screen shows them too, so
when there are many phones you know which one is yours.

**1. At the top, under `const ROOM`:** your name, and animals for when you leave it empty.

```js
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx',
  'owl', 'bee', 'deer', 'frog', 'mole', 'swan', 'duck', 'goat', 'crab', 'toad',
  'lark', 'robin', 'finch', 'panda', 'koala', 'llama', 'puffin', 'badger', 'beaver', 'tiger'];
```

**2. Inside `shareSetup({ ... })`, change `me: {}`** to a name and a colour:

```js
    me: {
      name: MY_NAME || random(ANIMALS),   // who you are
      hue: floor(random(360))             // your colour, 0 to 360
    }
```

**3. Inside `draw()`, just before the words at the top (`textAlign(LEFT, CENTER);`):**
a border in your colour.

```js
  // a border in your colour, so you know which phone is yours
  noFill();
  stroke(me.hue, 70, 100);
  strokeWeight(12 * k);
  rect(0, 0, width, height);
  noStroke();
```

**4. Change the two lines for the words at the top:** your name, in your colour.

```js
  fill(me.hue, 70, 100);
  textSize(28 * k);
  text(me.name + ' · step ' + steps, 20 * k, 44 * k);
```

(`textSize` does not change. It is there so you can find the place.)

**When it works, you see:**

- A border round the screen in one colour, and at the top, in the same colour,
  something like `otter · step 0`.
- At the bottom: `you send {"name":"otter","hue":211}`
- Reload, and you get a new colour, and a new animal if `MY_NAME` is empty.

**Test on a laptop:** two windows side by side. Each has its own border colour and name.
In the Room Inspector, each page now shows `name` and `hue`.

**Test on a phone:** the phone has its own border colour. Hold it next to the laptop.
You can tell which is which before anyone says a word.

**Likely mistakes:**

- Everything is white, or the border is red when you asked for blue: `colorMode(HSB)` is
  missing from `draw()`. It is already in the snapshot.
- `MY_NAME` with no quotes: `const MY_NAME = Sam;` stops the sketch. Write `'Sam'`.
- A missing comma after `name: ...` inside `me`. The sketch does not start.
- Two people get the same animal. That is fine: the colours are different. Put your
  own name in `MY_NAME` if you want to be sure.

---

## Step 3 · Everyone's Cow

**The idea:** state. The step count moves into `me`, so it is sent too. Now every phone
can draw every cow, each in its own lane. A cow's frame comes from its owner's steps,
so a phone that joins late sees every cow on the step it is really on.

**1. At the top, delete this line.** The steps live in `me` now.

```js
let steps = 0;      // how many steps so far. the frame and the note both come from this
```

**2. Inside `me`, add `steps`.** Put a comma at the end of the `hue` line first.

```js
    me: {
      name: MY_NAME || random(ANIMALS),   // who you are
      hue: floor(random(360)),            // your colour, 0 to 360
      steps: 0                            // how many steps your cow has taken
    }
```

**3. Inside `takeStep()`, change two lines.** `steps` becomes `me.steps`.

```js
  me.steps = me.steps + 1;   // a change to me is sent to everyone
  lastStep = millis();
  playNote(me.steps);
```

**4. Inside `draw()`, replace the line `drawCow(steps, top, bottom - top);`** with one
cow for each person. `guestsWith('steps')` is everyone else who sends steps.

```js
  // everyone who sends steps, me first. each cow gets a lane of its own
  const everyone = [me].concat(guestsWith('steps'));
  const lane = (bottom - top) / everyone.length;
  for (let i = 0; i < everyone.length; i++) {
    drawCow(everyone[i], top + i * lane, lane);
  }
```

**5. Inside `draw()`, in the words at the top:** `steps` becomes `me.steps`.

```js
  text(me.name + ' · step ' + me.steps, 20 * k, 44 * k);
```

**6. Change the first line of `drawCow()`** so it takes a person, and add two lines under
it. The rest of the function stays the same, because it still uses `n`.

```js
function drawCow(person, y, h) {
  const n = person.steps;
  if (!person.name) return;   // a phone whose name has not arrived yet: skip it for now
```

The second line matters more than it looks. When a page joins, another phone's steps can
arrive a moment before that phone's name. Without this line, a cow called `undefined`
flashes up for that moment. In other sketches a missing name is an error, and one error
in `draw()` stops p5.js drawing for good. Skip anyone whose name has not arrived.

**7. Inside `drawCow()`, straight after the `image(...)` line:** a frame round the cow in its
owner's colour.

```js
  noFill();
  stroke(person.hue, 70, 100);   // a frame round the cow in its owner's colour
  strokeWeight(4 * k);
  rect(-w / 2, -gif.height * s / 2, w, gif.height * s);
```

**8. At the end of `drawCow()`, after `pop();`:** the owner's name at the top of the lane.

```js
  // the owner's name, at the top of the lane
  textAlign(LEFT, TOP);
  fill(person.hue, 70, 100);
  textSize(18 * k);
  text(person.name + (person === me ? ' (you)' : ''), 20 * k, y + 4 * k);
```

**When it works, you see:**

- Your cow, with a frame in your colour, labelled `otter (you)`.
- One more lane for each other person, labelled with their name in their colour.
- At the bottom: `you send {"name":"otter","hue":211,"steps":0}`, and `steps` goes up
  each time you step.

**Test on a laptop:**

1. Two windows side by side. Tap to start in both. Each shows two cows.
2. Click in the left window and press space three times. Its cow takes three steps, in
   both windows, and its count says 3.
3. Late joiner: open a third window and tap to start. Its two other cows are already
   on the steps they had reached, not back at 0.
4. Close a window. Its cow goes from the others.

**Test on a phone:** scan the QR code. A new lane appears on the laptop. Shake the phone:
its cow walks on the laptop too. Lock the phone: its cow goes from the laptop. Unlock it:
the cow comes back where it was, because `me` is kept.

**Likely mistakes:**

- "steps is not defined": one `steps` is left. Search for `steps` and make each one
  `me.steps`, except `person.steps` in `drawCow`.
- Everyone's cow stands still while the numbers go up: `const n = person.steps;` is
  missing, or `drawCow` still starts with `function drawCow(n, y, h)`.
- A cow called `undefined` flashes up when someone joins: the
  `if (!person.name) return;` line is missing from `drawCow()`.
- Every frame is the same colour: `stroke` uses `me.hue`. It should be `person.hue`.
- A missing comma after the `hue` line inside `me`.
- Only your own cow: the other window is in another room, or still on an older step
  that does not send `steps`. Reload both with the same code.

---

## Step 4 · Hear Every Step

**The idea:** event. Each step is also sent as an event, `shareEmit('step')`, and every
other phone plays that cow's note. An event is a knock: it is sent once and not kept.
Each person has a pitch in `me`, so you can hear whose cow stepped.

**1. Inside `me`, add `pitch`.** Put a comma at the end of the `steps` line first.

```js
      steps: 0,                           // how many steps your cow has taken
      pitch: random([0.75, 1, 1.25, 1.5, 2])   // your cow's voice. 2 is an octave up
```

**2. Inside `takeStep()`, change the `playNote` line and add one line after it:**

```js
  playNote(me.steps, me.pitch);
  if (shareConnected) shareEmit('step');   // and the other phones play it too. yours never comes back
```

**3. A new function, after `takeStep()`:** it runs on every other phone when someone
steps. `from` says who sent it, and `shareGuest(from)` is what they send.

```js
// runs on every other phone when someone steps. from says who sent it, and shareGuest(from)
// is what they send: their steps and their pitch. so everyone hears the same note.
function shareEvent(name, data, from) {
  if (name !== 'step') return;
  const sender = shareGuest(from);
  if (!sender) return;   // a phone that has already left
  playNote(sender.steps, sender.pitch);
}
```

**4. Change the first two lines of `playNote()`:** it takes a pitch too.

```js
function playNote(n, pitch) {
  osc.freq(notes[n % notes.length] * pitch);
```

**When it works, you see and hear:**

- At the bottom: `you send {"name":"otter","hue":211,"steps":0,"pitch":1.5}`
- When anyone steps, every phone plays that cow's note, while that cow moves.
- Each person sounds a little different: higher or lower.

**Test on a laptop:** two windows side by side, tap to start in both. Press space in one.
You hear each note twice, once from each window. That is right: one is yours, one is the
other window playing your step. In the Room Inspector, each step shows as `step from otter`.

**Test on a phone:** with the laptop open, shake the phone. The phone plays the note and
the laptop plays the same note. Then press space on the laptop: the phone plays the
laptop's note, at the laptop's pitch.

**Likely mistakes:**

- You hear your own step twice on one phone: `playNote` is also inside `shareEvent` for
  your own steps. It is not. The sender never gets its own event back, which is why
  `takeStep()` plays it.
- No sound from the others: the other phone has not tapped to start. Sound only starts
  after a tap.
- The note is wrong or silent: `* pitch` is missing, or `pitch` has no comma before it.
- `shareEvent` is spelled differently, like `shareEvents`. p5-phone only calls `shareEvent`.
- Two cows step at the same moment and you hear one note. There is one oscillator, so the
  second note takes over the first. That is fine for now.

---

## Step 5 · Lean Together

**The idea:** stream. Tilt the phone left or right and your cow leans, on every phone.
The lean is a number that changes all the time and is sent as it changes. Now the
sketch has all three: the steps are state (kept), the sound is an event (once), and the
lean is a stream (always).

**1. At the top, after the `devicemotion` block (after its `});`):** notice when real
tilt arrives. A laptop has none.

```js
// the same for tilt: a laptop has none. this turns true when the first real reading arrives.
let gotTilt = false;
window.addEventListener('deviceorientation', function (event) {
  if (event.gamma !== null) gotTilt = true;
});
```

**2. Inside `setup()`, after `textFont('system-ui');`:** angles in degrees.

```js
  angleMode(DEGREES);
```

**3. Inside `me`, add `lean`.** Put a comma at the end of the `pitch` line first.

```js
      pitch: random([0.75, 1, 1.25, 1.5, 2]),  // your cow's voice. 2 is an octave up
      lean: 0                             // how far you tilt, from -1 (left) to 1 (right)
```

**4. Inside `draw()`, before `// the cows walk between ...`:** read the tilt each frame
into `me.lean`. On a laptop the mouse is fake tilt.

```js
  // the lean: tilt left and right. from -1 to 1, in steps of 0.05, so a phone held still
  // sends nothing new. a laptop has no tilt, so after the start tap the mouse is fake tilt
  if (gotTilt) {
    me.lean = round(constrain(rotationY / 30, -1, 1) * 20) / 20;
  } else if (unlocked) {
    me.lean = round(constrain(map(mouseX, 0, width, -1, 1), -1, 1) * 20) / 20;
  }
```

**5. Inside `drawCow()`, after `translate(width / 2, y + h / 2);`:** lean the cow.

```js
  rotate((person.lean || 0) * 30);   // and lean it, up to 30 degrees. a cow from an older step has no lean
```

**When it works, you see:**

- At the bottom: `you send {"name":"otter","hue":211,"steps":0,"pitch":1.5,"lean":0}`,
  and `lean` changes as you tilt, from `-1` to `1`.
- Your cow leans as you tilt. Every other phone shows your cow leaning too, at the same
  time.

**Test on a laptop:** two windows side by side. Move the mouse left and right across one
window. Its cow leans in both windows. The Room Inspector shows `lean` changing many
times a second. Steps and notes still work.

**Test on a phone:** tilt the phone left and right. Your cow leans on the phone and on
the laptop. Hold the phone still: `lean` stops changing, so nothing new is sent.

**Likely mistakes:**

- The cow spins all the way round: `angleMode(DEGREES)` is missing, so 30 means 30
  radians.
- On a laptop the cow does not follow the mouse: the `else if (unlocked)` part is
  missing, or you have not tapped to start yet.
- Your cow leans but nobody else's does: the other pages are still on step 4. They send
  no `lean`, so their cows stand straight, and they do not lean yours either. Give them
  the new code too.
- On a phone the cow does not lean: motion was refused at the start tap. Close the page
  and open it again, then allow motion.
- A missing comma after the `pitch` line inside `me`.

---

## What is where, at the end

| In `me` | Kind | Changes | Others use it for |
|---|---|---|---|
| `name`, `hue` | identity | once | the label and colour of your cow |
| `steps` | state | each step | your cow's frame and its step count |
| `pitch` | identity | once | how your cow sounds |
| `lean` | stream | all the time | how far your cow leans |

| Sent with `shareEmit` | Kind | Others use it for |
|---|---|---|
| `'step'` | event | playing your note, once |
