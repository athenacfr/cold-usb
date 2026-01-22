#!/usr/bin/env bash
set -e

mkdir -p build
rm -rf build/*
mkosi build --output-directory build --output-extension img --force "$@"

echo "Generated Files:"
ls -1 build