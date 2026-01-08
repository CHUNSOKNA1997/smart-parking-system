#!/bin/bash

echo "resetting parking database and applying new schema..."
echo ""

# Reset database (drops all data)
echo "step 1: resetting database..."
npx prisma migrate reset --force --skip-seed

# Generate Prisma client
echo ""
echo "step 2: generating prisma client..."
npx prisma generate

# Run seed
echo ""
echo "step 3: seeding new parking spots..."
npx tsx src/config/seedParkingSpots.ts

echo ""
echo "done! database reset with new schema and SPOT-001 format"
