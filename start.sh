#!/bin/bash

echo "============================================"
echo "  🅿️  AI Parking Management Platform"
echo "  Starting up..."
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Kill processes on ports 3000 and 3001
echo -e "${YELLOW}🔧 Cleaning up used ports...${NC}"
for PORT in 3000 3001; do
  PID=$(lsof -ti :$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo -e "  Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null
    sleep 1
  fi
done
echo -e "${GREEN}✅ Ports cleaned${NC}"
echo ""

# Check PostgreSQL
echo -e "${YELLOW}🐘 Checking PostgreSQL...${NC}"
if ! pg_isready -q 2>/dev/null; then
  echo -e "${RED}❌ PostgreSQL is not running. Starting it...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
  sleep 3
fi

if pg_isready -q 2>/dev/null; then
  echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
  echo -e "${RED}❌ Cannot start PostgreSQL. Please start it manually.${NC}"
  exit 1
fi
echo ""

# Check .env file
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found. Creating default...${NC}"
  cat > .env << 'EOF'
DATABASE_URL=postgres://erolakarsu@localhost:5432/ai_parking_platform
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
SERVER_PORT=3001
CLIENT_PORT=3000
JWT_SECRET=ai-parking-platform-secret-key-2024
NODE_ENV=development
EOF
  echo -e "${GREEN}✅ .env file created. Please update OPENROUTER_API_KEY.${NC}"
fi
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✅ Server dependencies installed${NC}"

echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
cd client && npm install --silent 2>&1 | tail -1 && cd ..
echo -e "${GREEN}✅ Client dependencies installed${NC}"
echo ""

# Setup database
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
node server/seeds/setup-db.js
echo ""

# Seed data
echo -e "${YELLOW}🌱 Seeding database with demo data...${NC}"
node server/seeds/seed.js
echo ""

echo "============================================"
echo -e "${GREEN}  🚀 Starting Application${NC}"
echo "============================================"
echo ""
echo -e "  ${BLUE}Server:${NC} http://localhost:3001"
echo -e "  ${BLUE}Client:${NC} http://localhost:3000"
echo ""
echo -e "  ${YELLOW}Login Credentials:${NC}"
echo -e "  Email:    admin@parking.com"
echo -e "  Password: admin123"
echo ""
echo -e "  ${YELLOW}15 Features:${NC} Occupancy, Pricing, Plates, Violations,"
echo -e "  Revenue, Payments, Sensors, EV Charging, Reservations,"
echo -e "  Permits, Analytics, Security, Maintenance, Feedback, Zones"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop${NC}"
echo "============================================"
echo ""

# Start with nodemon (watches for changes) and React dev server
npx concurrently \
  --names "SERVER,CLIENT" \
  --prefix-colors "blue,green" \
  "npx nodemon --watch server server/index.js" \
  "cd client && PORT=3000 npx react-scripts start"
