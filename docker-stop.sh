#!/bin/bash

# Docker Stop Script for Smart Parking System
# This script stops all services

set -e  # Exit on error

echo "🛑 Stopping Smart Parking System..."
echo ""

# Check if docker-compose is running
if ! docker-compose ps | grep -q "Up"; then
    echo "ℹ️  No running containers found."
    exit 0
fi

# Ask if user wants to remove volumes (data)
echo "Do you want to remove database volumes (delete all data)? [y/N]"
read -r REMOVE_VOLUMES

if [[ "$REMOVE_VOLUMES" =~ ^[Yy]$ ]]; then
    echo "⚠️  Stopping containers and removing volumes..."
    docker-compose down -v
    echo "✅ All containers stopped and volumes removed!"
    echo "⚠️  WARNING: All database data has been deleted!"
else
    echo "🛑 Stopping containers (keeping data)..."
    docker-compose down
    echo "✅ All containers stopped!"
    echo "ℹ️  Database data is preserved in volumes."
fi

echo ""
echo "📊 Current Docker status:"
docker-compose ps

echo ""
echo "💡 To start again, run: ./docker-start.sh or docker-compose up"
echo ""
