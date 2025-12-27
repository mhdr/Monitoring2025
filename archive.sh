#!/bin/bash

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="monitoring2025-${TIMESTAMP}.zip"

git archive --format=zip --output="${OUTPUT_FILE}" HEAD

echo "Archive created: ${OUTPUT_FILE}"
