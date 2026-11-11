#!/usr/bin/env bash
# Side-by-side: reference (left) | ours (right), same time, sound = audio.wav from 0.
#   tools/make_compare.sh out/piano-meme.mp4 out/piano-meme-compare.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
ours="$1"; out="$2"
frames=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$ours")
ffmpeg -v error -y -i refs/reference/reference.mp4 -i "$ours" -i refs/reference/audio.wav \
  -filter_complex "[0:v]fps=30,scale=540:960,setsar=1[l];[1:v]scale=540:960,setsar=1[r];[l][r]hstack=inputs=2[v]" \
  -map "[v]" -map 2:a -frames:v "$frames" -c:v libx264 -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest "$out"
echo "$out: $frames frames"
