#!/bin/bash
# start-dev.sh — kills port 3000 and starts the clinic portal fresh

echo "Killing any process on port 3000..."
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting ORAII clinic portal..."
cd /Users/ronitjitesh/Documents/oraii-uk
npm run dev:clinic
