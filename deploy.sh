#!/bin/bash
echo "🚀 Building Nuxt SSR Docker container..."
docker compose -f docker-compose.prod.yml down
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
echo "✅ Deployed at: https://abdallahweb.com"
