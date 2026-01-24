#!/bin/bash

# Token Revocation Webhook Setup Script
# This script helps deploy and configure the Supabase auth webhook

set -e

echo "🔐 Token Revocation Webhook Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI found"
echo ""

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Not logged in to Supabase"
    echo "Logging in..."
    supabase login
fi

echo -e "${GREEN}✓${NC} Logged in to Supabase"
echo ""

# Generate webhook secret if not exists
if ! grep -q "AUTH_WEBHOOK_SECRET" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC}  Generating webhook secret..."
    SECRET=$(openssl rand -base64 32)
    echo "AUTH_WEBHOOK_SECRET=$SECRET" >> .env
    echo -e "${GREEN}✓${NC} Webhook secret added to .env"
else
    echo -e "${GREEN}✓${NC} Webhook secret already exists"
fi

echo ""

# Deploy edge function
echo "📦 Deploying auth-events edge function..."
if supabase functions deploy auth-events; then
    echo -e "${GREEN}✓${NC} Edge function deployed successfully"
else
    echo -e "${RED}❌ Failed to deploy edge function${NC}"
    exit 1
fi

echo ""

# Get project info
PROJECT_REF=$(supabase projects list --format json | jq -r '.[0].id')
if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Could not determine project reference${NC}"
    exit 1
fi

FUNCTION_URL="https://$PROJECT_REF.supabase.co/functions/v1/auth-events"
echo -e "${GREEN}✓${NC} Function URL: $FUNCTION_URL"

echo ""
echo "🔧 Manual Configuration Required"
echo "================================"
echo ""
echo "Please complete these steps in Supabase Dashboard:"
echo ""
echo "1. Go to: https://app.supabase.com/project/$PROJECT_REF/auth/hooks"
echo "2. Click 'Add webhook'"
echo "3. Configure:"
echo "   - Name: Token Revocation Handler"
echo "   - URL: $FUNCTION_URL"
echo "   - Events: user.updated, user.deleted"
echo "   - Secret: (copy from .env AUTH_WEBHOOK_SECRET)"
echo "4. Click 'Create webhook'"
echo ""

# Set edge function secrets
echo "🔑 Setting edge function secrets..."
WEBHOOK_SECRET=$(grep AUTH_WEBHOOK_SECRET .env | cut -d '=' -f2)
REDIS_URL=$(grep REDIS_URL .env | cut -d '=' -f2)
REDIS_TOKEN=$(grep REDIS_TOKEN .env | cut -d '=' -f2 || echo "")

if [ -n "$WEBHOOK_SECRET" ]; then
    echo "$WEBHOOK_SECRET" | supabase secrets set AUTH_WEBHOOK_SECRET --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓${NC} Set AUTH_WEBHOOK_SECRET"
fi

if [ -n "$REDIS_URL" ]; then
    echo "$REDIS_URL" | supabase secrets set REDIS_URL --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓${NC} Set REDIS_URL"
fi

if [ -n "$REDIS_TOKEN" ]; then
    echo "$REDIS_TOKEN" | supabase secrets set REDIS_TOKEN --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓${NC} Set REDIS_TOKEN"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Complete manual webhook configuration in Supabase Dashboard (see above)"
echo "2. Test the webhook:"
echo "   curl -X POST $FUNCTION_URL \\"
echo "     -H 'x-webhook-signature: \$WEBHOOK_SECRET' \\"
echo "     -d '{\"type\":\"user.updated\",\"user\":{\"id\":\"test\"}}'"
echo "3. Monitor function logs:"
echo "   supabase functions logs auth-events --project-ref $PROJECT_REF"
echo ""
echo "Documentation: docs/SECURITY-TOKEN-REVOCATION.md"
