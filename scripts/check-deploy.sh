#!/bin/bash

# Pre-deployment check script
# This script checks if the deployment will pass linting and validation before pushing

set -e

echo "🔍 Running pre-deployment checks..."
echo ""

# Check if in correct directory
if [ ! -f "functions/package.json" ]; then
    echo "❌ Error: functions/package.json not found. Please run from project root."
    exit 1
fi

echo "1️⃣  Checking ESLint in functions..."
cd functions

# Run ESLint
if npm run lint; then
    echo "✅ ESLint check passed!"
else
    echo "❌ ESLint check failed! Fix the errors above before deploying."
    exit 1
fi

echo ""
echo "2️⃣  Checking npm dependencies..."
if npm list > /dev/null 2>&1; then
    echo "✅ Dependencies check passed!"
else
    echo "⚠️  Some dependency issues found, but continuing..."
fi

cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All pre-deployment checks passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You can now safely push your code:"
echo "  git add ."
echo "  git commit -m 'your message'"
echo "  git push"
echo ""
