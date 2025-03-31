#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting GTD Mail System deployment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

# Login to Cloudflare if not already logged in
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare..."
    wrangler login
fi

# Create D1 database if it doesn't exist
echo "📦 Setting up D1 database..."
DB_ID=$(wrangler d1 list | grep "gtd-mail-db" | awk '{print $1}')
if [ -z "$DB_ID" ]; then
    echo "Creating new D1 database..."
    DB_ID=$(wrangler d1 create gtd-mail-db | grep "Created database" | awk '{print $3}')
fi

# Create R2 bucket if it doesn't exist
echo "📦 Setting up R2 bucket..."
if ! wrangler r2 bucket list | grep -q "gtd-mail-emails"; then
    echo "Creating new R2 bucket..."
    wrangler r2 bucket create gtd-mail-emails
fi

# Create KV namespace for rate limiting if it doesn't exist
echo "📦 Setting up KV namespace..."
RATE_LIMIT_ID=$(wrangler kv:namespace list | grep "RATE_LIMIT" | awk '{print $1}')
if [ -z "$RATE_LIMIT_ID" ]; then
    echo "Creating new KV namespace..."
    RATE_LIMIT_ID=$(wrangler kv:namespace create "RATE_LIMIT" | grep "Created namespace" | awk '{print $3}')
fi

# Update wrangler.toml with the new IDs
echo "📝 Updating wrangler.toml..."
sed -i '' "s/database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
sed -i '' "s/id = \"\"/id = \"$RATE_LIMIT_ID\"/" wrangler.toml

# Get zone ID
echo "🌐 Getting zone ID..."
ZONE_ID=$(wrangler zone list | grep "gtd-mail.com" | awk '{print $1}')
if [ -n "$ZONE_ID" ]; then
    sed -i '' "s/zone_id = \"\"/zone_id = \"$ZONE_ID\"/" wrangler.toml
fi

# Deploy the worker
echo "🚀 Deploying worker..."
wrangler deploy

echo "✅ Deployment complete!"
echo "📊 Database ID: $DB_ID"
echo "📦 R2 Bucket: gtd-mail-emails"
echo "⏱️ Rate Limit ID: $RATE_LIMIT_ID" 