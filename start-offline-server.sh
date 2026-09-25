#!/bin/sh
# Share the site on your local network (no internet needed).
cd "$(dirname "$0")" || exit 1
node scripts/build.js && node scripts/serve.js 8080
