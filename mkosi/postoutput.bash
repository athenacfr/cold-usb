#!/usr/bin/env bash
set -e

IMAGE_FILE="${OUTPUTDIR}/${IMAGE_ID}.raw"
SHA_FILE="${OUTPUTDIR}/${IMAGE_ID}.SHA256SUMS"
NEW_IMAGE_FILE="${OUTPUTDIR}/${IMAGE_ID}-${IMAGE_VERSION}-${ARCHITECTURE}.img"
NEW_SHA_FILE="${OUTPUTDIR}/${IMAGE_ID}-${IMAGE_VERSION}-${ARCHITECTURE}.img.sha256"

if [[ -f "$IMAGE_FILE" ]]; then
    mv "$IMAGE_FILE" "$NEW_IMAGE_FILE"
    echo "Renamed $IMAGE_FILE → $NEW_IMAGE_FILE"
else
    echo "Warning: $IMAGE_FILE does not exist, skipping rename."
fi

if [[ -f "$SHA_FILE" ]]; then
    mv "$SHA_FILE" "$NEW_SHA_FILE"
    echo "Renamed $SHA_FILE → $NEW_SHA_FILE"
else
    echo "Warning: $SHA_FILE does not exist, skipping rename."
fi
