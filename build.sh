#!/bin/bash

# Vercel Build Script
echo "Building monorepo..."

# Install dependencies
npm install

# Build Web (Next.js)
echo "Building web..."
npm --workspace ./apps/web run build

# Build API (Nest.js)
echo "Building API..."
npm --workspace ./apps/api run build

echo "Build complete!"
