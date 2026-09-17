# f26-atelier1-examples

Example sketches for Atelier 1 (Fall 2026). p5.js 2.x with [p5-phone](https://npuckett.github.io/p5-phone/examples/homepage/).
Published with GitHub Pages. The index of every example is
https://digitalfuturesocadu.github.io/f26-atelier1-examples/ and each folder opens on a phone at
`https://digitalfuturesocadu.github.io/f26-atelier1-examples/<folder>/`.

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

## Web editor copies

`p5-webeditor.config.json` publishes each example to the p5.js web editor with
[p5-webeditor-sync](https://github.com/npuckett/p5-webeditor-sync). Sketch IDs live in
`webeditor/.sync/registry.json`, so later runs update the same sketches.

```bash
./webeditor/stage.sh
npx p5-webeditor-sync sync --batch class-02
npx p5-webeditor-sync sync --batch class-03
```

`stage.sh` copies only `index.html` and `sketch.js`. The tool sends files as text, so
images are uploaded to each web editor sketch by hand. Check that a re-sync keeps them.
