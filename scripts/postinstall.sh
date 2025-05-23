#!/bin/bash

# Path to the BlackHole package in the app bundle
PKG="$2/BlackHole-2ch.pkg"

# Check if BlackHole 2ch is already installed
if system_profiler SPAudioDataType | grep -q "BlackHole 2ch"; then
    exit 0
fi

# Launch the installer if BlackHole is not present
open "$PKG"
exit 0 