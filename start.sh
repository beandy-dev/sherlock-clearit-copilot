#!/bin/bash
# ClearIT Copilot — Start
cd "$(dirname "$0")"

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo ""
echo "🤖 ClearIT Copilot — Iniciando..."
echo "================================="
echo ""
echo "   Frontend: http://localhost:${PORT:-3000}"
echo "   API:      http://localhost:${PORT:-3000}/api/analyze"
echo "   Key:      ${GEMINI_API_KEY:0:10}..."
echo ""
echo "   Ctrl+C para parar"
echo ""

node server.js
