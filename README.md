# f26-atelier1-examples

Example sketches for Atelier 1 (Fall 2026). p5.js 2.x with [p5-phone](https://npuckett.github.io/p5-phone/examples/homepage/).
Published with GitHub Pages. The index of every example is
https://digitalfuturesocadu.github.io/f26-atelier1-examples/ and each folder opens on a phone at
`https://digitalfuturesocadu.github.io/f26-atelier1-examples/<folder>/`.

## Start here: run these on your own computer

You do not need to install anything except VS Code and the Live Server extension.
Every example loads p5.js from the web.

1. Clone this repo into `Documents/GitHub`. In GitHub Desktop: **File → Clone Repository → URL**,
   paste `https://github.com/DigitalFuturesOCADU/f26-atelier1-examples.git`. Or in VS Code:
   **Clone Git Repository** and paste the same address.
2. Open the folder in VS Code. Say yes when it offers the recommended extensions.
3. Find an example folder, right-click its `index.html`, and choose **Open with Live Server**.
4. The microphone works on your laptop. Motion sensors do not, because a laptop has none.
   To run an example on your phone, open its link on the
   [examples site](https://digitalfuturesocadu.github.io/f26-atelier1-examples/).

Each example is one folder with its own `index.html` and `sketch.js`. Read `sketch.js` first.

Open an example from the examples site on your laptop and a QR code of it appears in the top
right corner. Scan it to open the same example on your phone. This is p5-phone's
`showDesktopQr()`. It stays hidden on a phone, in the web editor and on Live Server, because
those addresses would not open on a phone.

**Do not edit inside this folder. Copy.** Copy an example folder into your own project and change
it there. If you change files here, the next pull can collide with your changes. Pull often:
new examples arrive with every class.

Setting up VS Code, GitHub and your own project is covered in the
[setup guide](https://digitalfuturesocadu.github.io/vsCodeSetup/guide/).

## Class 2 · Motion to image

One image, one motion input per sketch. Read them in order.

| Sketch | Motion → image | Web editor |
| --- | --- | --- |
| [01-load-image](class-02/motion-to-image/01-load-image/) | none: load with `async` / `await` and fit to the screen | [open](https://editor.p5js.org/npuckett/sketches/kzj_dZckP) |
| [02-tilt-to-scale](class-02/motion-to-image/02-tilt-to-scale/) | `rotationX` → size | [open](https://editor.p5js.org/npuckett/sketches/Z5I5kjEuvn) |
| [03-shake-to-filter](class-02/motion-to-image/03-shake-to-filter/) | `deviceShaken()` → `filter()` | [open](https://editor.p5js.org/npuckett/sketches/lVgmS7scx) |
| [04-move-to-spin](class-02/motion-to-image/04-move-to-spin/) | acceleration → spin speed | [open](https://editor.p5js.org/npuckett/sketches/nxdCFWpuh) |

## Class 3 · Animated GIFs

[class-03/gif-controls/](class-03/gif-controls/) is a three-tab page: **GIF Info**
inspects one GIF frame by frame, with a frame strip and controls for speed,
direction and frame range; **Code & Examples** lists the methods and the full
source of every sketch below; **Interaction Examples** runs them side by side so
they can be compared. Choosing a GIF at the top reloads every example with it,
and the file never leaves the browser.

Each example is its own sketch in its own folder with its own copy of the GIF.
Two canvases must never share one loaded GIF: each canvas that draws it steps
its frame clock again, which is what broke the Fall 2025 version of this page.
Open a folder on a phone to run it full screen.

| Sketch | Method | What it does |
| --- | --- | --- |
| [01-frames](class-03/gif-controls/01-frames/) | `numFrames()`, `getCurrentFrame()` | counts the frames and shows which one is on |
| [02-play-pause](class-03/gif-controls/02-play-pause/) | `play()`, `pause()` | tap to stop and start |
| [03-next-frame](class-03/gif-controls/03-next-frame/) | `setFrame()` | tap for the next frame |
| [04-scrub](class-03/gif-controls/04-scrub/) | `setFrame()`, `map()` | drag across to scrub |
| [05-speed](class-03/gif-controls/05-speed/) | `delay()` | tap for the next speed |
| [06-reset](class-03/gif-controls/06-reset/) | `reset()` | tap to go back to the start |
| [07-zones](class-03/gif-controls/07-zones/) | all of the above | three bands, one control each |
| [08-tilt-to-frame](class-03/gif-controls/08-tilt-to-frame/) | `setFrame()`, `rotationY` | phone: tilt scrubs the frames |
| [09-shake-to-advance](class-03/gif-controls/09-shake-to-advance/) | `setFrame()`, `deviceShaken()` | phone: each shake is one frame |

The demo folders' `index.html` carries a short script that lets the reference page
pass another GIF in with `?gif=`. It is safe to delete from a copied sketch.

## Class 3 · Images from an API

[class-03/shake-for-a-new-image/](class-03/shake-for-a-new-image/) has no image file of
its own. Each shake asks the [Dog API](https://dog.ceo/dog-api/) for the address of a
random photo, loads it, and scales it to fill the screen. It extends Daniel Shiffman's
[p5.js 2.0 Loading a Sequence](https://editor.p5js.org/codingtrain/sketches/lQxT7PTKC)
with `deviceShaken()` and a cover fit for a portrait screen.

It is also where the point of `async` and `await` shows: the fetch is stopped at each
`await`, but `draw()` never stops, so the wait gets a loading screen of its own instead
of a frozen canvas.

| Sketch | Method | Web editor |
| --- | --- | --- |
| [shake-for-a-new-image](class-03/shake-for-a-new-image/) | `loadJSON()`, `loadImage()`, `deviceShaken()` | [open](https://editor.p5js.org/npuckett/sketches/wGvIdnPqy) |

This one needs no image upload in the web editor: every photo comes from the API.

## Class 4 · Sound to image

One sound input, one image or GIF output per sketch. Read them in order. Each one asks a
different question of the sound: how loud, when, what kind, which one, what was said.

Sketches 01 to 04 end with the same microphone block. Copy it whole into your own sketch.
It keeps the microphone out of the speaker and checks `window.micOpen`, which is only true
while sound is really arriving (`window.micEnabled` turns true on the tap even when the person
says no). Every sketch also has a finger fallback. The GIFs load from the Class 3 library by web address, so a copied
sketch runs anywhere with no files to upload. Change the one `gifFile` line to use your own.

| Sketch | Sound → image | What it does | Web editor |
| --- | --- | --- | --- |
| [01-level-to-frame](class-04/sound-to-image/01-level-to-frame/) | level → `setFrame()` | How loud it is picks the frame. Clap, hum, blow. | [open](https://editor.p5js.org/npuckett/sketches/Kiu99oef9) |
| [02-clap-to-step](class-04/sound-to-image/02-clap-to-step/) | onset → next frame | Each sound that crosses the line is one frame. A rhythm becomes the walk. | [open](https://editor.p5js.org/npuckett/sketches/HXPQv7Df-) |
| [03-hold-and-silence](class-04/sound-to-image/03-hold-and-silence/) | duration → `play()` / `pause()` | Plays only after three quiet seconds. One variable flips it to a held sound. | [open](https://editor.p5js.org/npuckett/sketches/CJALUHvLY) |
| [04-two-bands](class-04/sound-to-image/04-two-bands/) | `p5.FFT` low and high → size and tint | A hum sets the size, a whistle sets the colour. The spectrum is drawn along the bottom. | [open](https://editor.p5js.org/npuckett/sketches/fU8GwfNHz) |
| [05-label-to-image](class-04/sound-to-image/05-label-to-image/) | ml5 sound classifier label → which GIF | Runs on the built-in word model until you paste in a Teachable Machine link. | [open](https://editor.p5js.org/npuckett/sketches/e5BKKMXcJ) |
| [06-word-to-image](class-04/sound-to-image/06-word-to-image/) | spoken word → GIF command | Speech as a trigger. Reacts in the middle of a sentence. | [open](https://editor.p5js.org/npuckett/sketches/wnzOiFz5W) |
| [07-sentence-to-image](class-04/sound-to-image/07-sentence-to-image/) | finished sentence → copies, speed, tint | Speech as material. Word count, word length and tone set the picture. | [open](https://editor.p5js.org/npuckett/sketches/_-kiGZNVP) |
| [08-raise-to-listen](class-04/sound-to-image/08-raise-to-listen/) | tilt opens the mic, level → `delay()` | Motion and sound together. Raised, the heart listens and your voice sets its speed. Flat, it is deaf. | [open](https://editor.p5js.org/npuckett/sketches/QGxSV8I-D) |
| [09-holder-and-room](class-04/sound-to-image/09-holder-and-room/) | tilt → `setFrame()`, level → shake | Motion and sound together. The holder steers the robot, the room's noise disturbs it. | [open](https://editor.p5js.org/npuckett/sketches/phPd-czOb) |
| [demo-pitch-to-frame](class-04/sound-to-image/demo-pitch-to-frame/) | hummed note → `setFrame()` | A look ahead. Finds the note in hertz with Pitchy. | [open](https://editor.p5js.org/npuckett/sketches/BkP-lf5bR) |

08 and 09 combine motion and sound. They ask for both with one tap, `enableAllTap()`. In 08 one input
opens the other. In 09 each input has its own control, and often its own person.

A sketch gets the microphone level or speech, not both at once. Speech recognition also
sends the sound to the browser's speech service. 05 to 07 do not load p5.sound: ml5.js and
the speech tool open the microphone themselves, and ml5.js clashes with the p5.sound preload shim.

## Class 5 · Making sound

Seven small touch-only examples in `class-05/making-sound/`, one way of making sound each.
Shown in class before the input to sound examples. Each one loads its recording from the
examples site, so there is no file to upload.

| Example | What it shows | Library |
| --- | --- | --- |
| [01-play-a-recording](class-05/making-sound/01-play-a-recording/) | load a recording, tap to play it | p5.sound `loadSound()`, `play()` |
| [02-bend-a-recording](class-05/making-sound/02-bend-a-recording/) | a loop: finger x is the speed, y the volume | p5.sound `loop()`, `rate()`, `amp()` |
| [03-echo-a-recording](class-05/making-sound/03-echo-a-recording/) | the bell through an echo | p5.sound `p5.Delay` |
| [04-make-a-tone](class-05/making-sound/04-make-a-tone/) | hold for a tone, x is the pitch | p5.sound `p5.Oscillator` |
| [05-start-a-loop](class-05/making-sound/05-start-a-loop/) | eight notes on Tone's clock, drag for tempo | Tone.js `Synth`, `Loop`, Transport |
| [06-play-an-instrument](class-05/making-sound/06-play-an-instrument/) | tap a key of a sampled marimba | smplr `Soundfont` |
| [07-say-the-time](class-05/making-sound/07-say-the-time/) | the phone says the time, x is rate, y is pitch | `speechSynthesis` |

## Class 5 · Input to sound

Six questions. Each has a touch, a motion and a sound version in its own folder,
`class-05/input-to-sound/<NN-name>-touch/`, `-motion/` and `-sound/`. The sound part of the code
is the same in all three. Only the input part at the bottom of `sketch.js` changes. Open the three
on three phones and compare. The four recordings in 01 and 02 load from their own sites by web
address. `class-05/input-to-sound/sounds/` holds backup copies.

| Example | Question → sound | Sound library | Touch | Motion | Sound |
| --- | --- | --- | --- | --- | --- |
| 01-choice-to-recording | which one? → one of four recordings | p5.sound `loadSound()` by web address | [four zones](class-05/input-to-sound/01-choice-to-recording-touch/) | [tip toward a corner](class-05/input-to-sound/01-choice-to-recording-motion/) | [low or high (FFT): two of four](class-05/input-to-sound/01-choice-to-recording-sound/) |
| 02-amount-to-speed | how much? → loop speed | p5.sound `rate()` | [two-finger spread](class-05/input-to-sound/02-amount-to-speed-touch/) | [`rotationX`](class-05/input-to-sound/02-amount-to-speed-motion/) | [level](class-05/input-to-sound/02-amount-to-speed-sound/) |
| 03-count-to-voices | how many? → oscillator voices | p5.sound `p5.Oscillator` | [fingers on the glass](class-05/input-to-sound/03-count-to-voices-touch/) | [shakes in the last 4 s](class-05/input-to-sound/03-count-to-voices-motion/) | [claps in the last 4 s](class-05/input-to-sound/03-count-to-voices-sound/) |
| 04-gap-to-tempo | when? → tempo | Tone.js `Loop` on the Transport | [tap tempo](class-05/input-to-sound/04-gap-to-tempo-touch/) | [time between shakes](class-05/input-to-sound/04-gap-to-tempo-motion/) | [time between claps (Tone.UserMedia)](class-05/input-to-sound/04-gap-to-tempo-sound/) |
| 05-dial-to-note | which note? → marimba note | smplr `Soundfont` | [two-finger angle](class-05/input-to-sound/05-dial-to-note-touch/) | [`rotationZ`](class-05/input-to-sound/05-dial-to-note-motion/) | [hummed note (Pitchy)](class-05/input-to-sound/05-dial-to-note-sound/) |
| 06-hold-to-speech | how long? → spoken duration and rate | `speechSynthesis` | [hold and release](class-05/input-to-sound/06-hold-to-speech-touch/) | [held upright](class-05/input-to-sound/06-hold-to-speech-motion/) | [a sound or a silence](class-05/input-to-sound/06-hold-to-speech-sound/) |

The sound versions open the microphone with echo cancellation off, so on a speaker the phone
hears itself. Use headphones. One sound system per sketch: 04 loads Tone.js and not p5.sound.

## Web editor copies

`p5-webeditor.config.json` publishes each example to the p5.js web editor with
[p5-webeditor-sync](https://github.com/npuckett/p5-webeditor-sync). Sketch IDs live in
`webeditor/.sync/registry.json`, so later runs update the same sketches.

```bash
./webeditor/stage.sh
npx p5-webeditor-sync sync --batch class-02
npx p5-webeditor-sync sync --batch class-03
npx p5-webeditor-sync sync --batch class-04
```

`stage.sh` copies only `index.html` and `sketch.js`. The tool sends files as text, so
images are uploaded to each web editor sketch by hand. Check that a re-sync keeps them.
