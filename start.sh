#!/bin/bash
set -e

# Apply database schema changes to the PostgreSQL database
echo "Running Prisma DB Push to sync PostgreSQL schema..."
npx prisma db push

# Seed the database if necessary
echo "Running seed script..."
npx tsx scripts/seed.ts || echo "Seed script failed or was already run, continuing..."

# Start the Python Scraper in the background
echo "Starting Python FastAPI Scraper on port 8000..."
cd /app/scraper
python3 server.py &

# Start the Next.js Dashboard in the foreground
echo "Starting Next.js Dashboard on port 3000..."
cd /app/dashboard
npm run start
