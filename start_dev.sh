#!/bin/bash

# Marzban Admin Panel - Development Startup Script
echo "🚀 Starting Marzban Admin Panel in Development Mode..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Initialize backend database
echo "📊 Initializing backend database..."
cd backend
if [ ! -f "dev_marzban.db" ]; then
    python3 init_sqlite_db.py
    if [ $? -eq 0 ]; then
        echo "✅ Database initialized successfully"
    else
        echo "❌ Failed to initialize database"
        exit 1
    fi
else
    echo "✅ Database already exists"
fi

# Install backend dependencies if needed
echo "📦 Checking backend dependencies..."
python3 -c "import fastapi" 2>/dev/null || {
    echo "Installing backend dependencies..."
    pip3 install --break-system-packages -r requirements.txt
}

# Install frontend dependencies if needed
echo "📦 Checking frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend server:"
echo "   cd backend && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "2. Start the frontend server (in a new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "🔑 Default admin credentials:"
echo "   Email: admin@example.com"
echo "   Password: admin123"
echo ""
echo "📚 For production deployment, use: docker-compose up -d"
echo ""