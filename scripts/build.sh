#!/usr/bin/env sh
set -e

mkdir -p build
rm -rf build/*
mkosi build --force "$@"

echo "Generated Files:"
ls -1 build