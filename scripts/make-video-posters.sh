#!/usr/bin/env bash
# Poster JPEGs for /videos/<id>.mp4 (frame at 1 s). The clips are iPhone HLG HDR (BT.2020, arib-std-b67, 8-bit).
# A plain `ffmpeg -frames:v 1 x.jpg` writes the HDR signal as if it were SDR sRGB, so the poster looks flat and
# colour-shifted next to the video, which Safari plays with correct HDR colour management. This tone-maps HLG
# to BT.709/sRGB (zscale + hable, npl 150: keeps brightness close to the video and no clipped highlights), then writes a full-range JPEG tagged sRGB.
# Usage: scripts/make-video-posters.sh [videos-dir]   (needs ffmpeg with zscale, python3 + Pillow)
set -euo pipefail
D="${1:-videos}"; T=$(mktemp -d)
for f in "$D"/*.mp4; do
  id=$(basename "$f" .mp4)
  ffmpeg -v error -y -ss 1 -i "$f" -vf "zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=150,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=pc,format=rgb24" -frames:v 1 "$T/$id.png"
  python3 - "$T/$id.png" "$D/$id.jpg" <<'PY'
import sys
from PIL import Image, ImageCms
im = Image.open(sys.argv[1]).convert('RGB')
icc = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
im.save(sys.argv[2], 'JPEG', quality=85, optimize=True, subsampling='4:2:0', icc_profile=icc)
PY
done
rm -rf "$T"
