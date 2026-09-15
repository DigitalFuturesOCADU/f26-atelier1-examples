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

## Web editor copies

`p5-webeditor.config.json` publishes each example to the p5.js web editor with
[p5-webeditor-sync](https://github.com/npuckett/p5-webeditor-sync). Sketch IDs live in
`webeditor/.sync/registry.json`, so later runs update the same sketches.

```bash
./webeditor/stage.sh
npx p5-webeditor-sync sync --batch class-02
```

`stage.sh` copies only `index.html` and `sketch.js`. The tool sends files as text, so
images are uploaded to each web editor sketch by hand. Check that a re-sync keeps them.
