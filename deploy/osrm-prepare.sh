#!/usr/bin/env bash
# Downloads Belgian OpenStreetMap data and builds the OSRM car-routing files in ./osrm-data.
# Run once on the server, and again whenever you want fresher road data.
set -euo pipefail

cd "$(dirname "$0")"
IMAGE=ghcr.io/project-osrm/osrm-backend:v5.27.1
DATA_DIR="$PWD/osrm-data"
PBF=belgium-latest.osm.pbf

mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
swap_kb=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)
if [ $(( (mem_kb + swap_kb) / 1024 )) -lt 6000 ]; then
  echo "Less than 6 GB RAM+swap available; OSRM preprocessing may run out of memory."
  echo "Add swap first:"
  echo "  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
  echo "  echo '/swapfile none swap sw 0 0' >> /etc/fstab"
  exit 1
fi

mkdir -p "$DATA_DIR"
echo "Downloading Belgium road data from Geofabrik..."
curl -fL --progress-bar -o "$DATA_DIR/$PBF.tmp" "https://download.geofabrik.de/europe/$PBF"
mv "$DATA_DIR/$PBF.tmp" "$DATA_DIR/$PBF"

echo "Building routing graph (takes several minutes)..."
docker run --rm -v "$DATA_DIR:/data" "$IMAGE" osrm-extract -p /opt/car.lua "/data/$PBF"
docker run --rm -v "$DATA_DIR:/data" "$IMAGE" osrm-partition /data/belgium-latest.osrm
docker run --rm -v "$DATA_DIR:/data" "$IMAGE" osrm-customize /data/belgium-latest.osrm

rm -f "$DATA_DIR/$PBF"
echo "Done. Start or restart routing with: docker compose up -d osrm backend"
