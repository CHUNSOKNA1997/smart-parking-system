#!/bin/bash

# Docker Start Script for Smart Parking System
# This script starts all services using Docker Compose

set -e  # Exit on error

echo "🚀 Starting Smart Parking System with Docker Compose..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    echo "Please install it from: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env.docker files exist
echo "🔍 Checking for environment files..."
ENV_FILES=(
    "services/auth-service/.env.docker"
    "services/parking-service/.env.docker"
    "services/payment-service/.env.docker"
    "aggregator/.env.docker"
)

MISSING_FILES=false
for file in "${ENV_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing: $file"
        echo "   Please copy from $file.example and configure it."
        MISSING_FILES=true
    fi
done

if [ "$MISSING_FILES" = true ]; then
    echo ""
    echo "💡 Quick fix: Run these commands to create .env.docker files:"
    echo "   cp services/auth-service/.env.docker.example services/auth-service/.env.docker"
    echo "   cp services/parking-service/.env.docker.example services/parking-service/.env.docker"
    echo "   cp services/payment-service/.env.docker.example services/payment-service/.env.docker"
    echo "   cp aggregator/.env.docker.example aggregator/.env.docker"
    echo ""
    echo "   Then edit each file with your actual credentials."
    exit 1
fi

echo "✅ All environment files found!"
echo ""

# Build and start services
echo "🔨 Building Docker images (this may take a few minutes on first run)..."
docker-compose build

echo ""
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Show status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Smart Parking System is now running!"
echo ""
echo "📌 Service URLs:"
echo "   🌐 API Gateway:      http://localhost:3000"
echo "   📚 API Docs:         http://localhost:3000/api-docs"
echo "   🔐 Auth Service:     http://localhost:3001"
echo "   🅿️  Parking Service:  http://localhost:3002"
echo "   💳 Payment Service:  http://localhost:3003"
echo ""
echo "📌 Database Ports (for external tools like pgAdmin):"
echo "   🗄️  Auth DB:          localhost:5433"
echo "   🗄️  Parking DB:       localhost:5434"
echo "   🗄️  Payment DB:       localhost:5435"
echo ""
echo "📝 Useful commands:"
echo "   View logs:           docker-compose logs -f"
echo "   View specific logs:  docker-compose logs -f auth-service"
echo "   Stop all services:   docker-compose down"
echo "   Stop all services:   ./docker-stop.sh"
echo "   Restart a service:   docker-compose restart auth-service"
echo ""
