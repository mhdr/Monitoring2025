#!/bin/bash

find . -type f -name "*.sh" -exec dos2unix "{}" \;
find . -type f -name "*.sh" -exec chmod +x "{}" \;
# find . -type f -name "*.sh" -exec git update-index --chmod=+x "{}" \;
