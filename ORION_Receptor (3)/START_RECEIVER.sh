#!/usr/bin/env bash
set -e
cd -- "$(dirname -- "$0")"
export ORION_WATCH_HOST=192.168.20.101
node server/watch-server.mjs
