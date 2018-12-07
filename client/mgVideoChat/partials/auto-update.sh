#!/bin/sh

# get the current path
CURPATH=`pwd`

while inotifywait -e close_write "$CURPATH"; do
    sh compile.sh
done