#!/bin/bash
# Download Basis Universal transcoder files for KTX2 texture support
# Run from project root: ./scripts/setup-basis-transcoder.sh

set -e

LIBS_DIR="public/libs/basis"
TRANSCODER_VERSION="1.16.4"
BASE_URL="https://raw.githubusercontent.com/BinomialLLC/basis_universal/v${TRANSCODER_VERSION}/webgl/transcoder"

echo "Setting up Basis Universal transcoder v${TRANSCODER_VERSION}..."

# Create directory
mkdir -p "$LIBS_DIR"

# Download transcoder files
echo "Downloading basis_transcoder.js..."
curl -sL "${BASE_URL}/basis_transcoder.js" -o "${LIBS_DIR}/basis_transcoder.js"

echo "Downloading basis_transcoder.wasm..."
curl -sL "${BASE_URL}/basis_transcoder.wasm" -o "${LIBS_DIR}/basis_transcoder.wasm"

# Verify files exist and have content
if [ -s "${LIBS_DIR}/basis_transcoder.js" ] && [ -s "${LIBS_DIR}/basis_transcoder.wasm" ]; then
    echo "Success! Basis transcoder files installed to ${LIBS_DIR}/"
    ls -lh "${LIBS_DIR}/"
else
    echo "Error: Download failed. Files are empty or missing."
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Convert textures to KTX2 format using: npm run convert-textures"
echo "2. The app will automatically use KTX2 when available"
