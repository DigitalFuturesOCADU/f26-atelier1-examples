#!/bin/sh
# Copy each example's index.html and sketch.js into webeditor/projects/<slug>/
# for p5-webeditor-sync. Images are left out: the sync tool sends files as text,
# so images are uploaded to each Web Editor sketch by hand.
set -e
cd "$(dirname "$0")/.."
for dir in class-02/motion-to-image/*/; do
  name=$(basename "$dir")
  slug="class-02-$name"
  mkdir -p "webeditor/projects/$slug"
  cp "$dir/index.html" "$dir/sketch.js" "webeditor/projects/$slug/"
done
