#!/bin/sh
# Copy each example's index.html and sketch.js into webeditor/projects/<slug>/
# for p5-webeditor-sync. Images are left out: the sync tool sends files as text,
# so images are uploaded to each Web Editor sketch by hand.
set -e
cd "$(dirname "$0")/.."
for dir in class-02/motion-to-image/*/ class-03/gif-controls/*/ class-03/shake-for-a-new-image/ class-04/sound-to-image/*/ class-05/making-sound/*/ class-05/input-to-sound/*-*-*/ class-05/gif-and-sound/*/; do
  name=$(basename "$dir")
  class=$(echo "$dir" | cut -d/ -f1)
  slug="$class-$name"
  mkdir -p "webeditor/projects/$slug"
  cp "$dir/index.html" "$dir/sketch.js" "webeditor/projects/$slug/"
done
