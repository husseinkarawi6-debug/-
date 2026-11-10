#!/usr/bin/env bash
# Downloads Rhubarb Lip Sync 1.14.0 (Linux) into tools/rhubarb/.
# On a Mac, use the macOS zip from the same release page instead.
set -euo pipefail
cd "$(dirname "$0")"
tmp="$(mktemp -d)"
curl -sSL -o "$tmp/rhubarb.zip" https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/Rhubarb-Lip-Sync-1.14.0-Linux.zip
python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$tmp/rhubarb.zip" "$tmp/x"
rm -rf rhubarb && mv "$tmp/x/Rhubarb-Lip-Sync-1.14.0-Linux" rhubarb && chmod +x rhubarb/rhubarb
rm -rf "$tmp"
./rhubarb/rhubarb --version
