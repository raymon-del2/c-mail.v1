#!/bin/bash
# Deploy backend to Vercel as separate project

echo "🚀 Deploying C-mail Backend to Vercel..."

# Navigate to backend directory
cd backend

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Deploy to Vercel
echo "📦 Deploying..."
vercel --prod

echo "✅ Backend deployment complete!"
echo ""
echo "Next steps:"
echo "1. Copy the deployed URL (e.g., https://c-mail-backend-xxxxx.vercel.app)"
echo "2. Add it to frontend vercel.json as the API destination"
echo "3. Set environment variables in Vercel dashboard:"
echo "   - MONGODB_URI"
echo "   - GROQ_API_KEY"
echo "   - BREVO_API_KEY"
