#!/bin/bash

# Security Headers Verification Script
# Tests that all security headers are properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to localhost, or use environment variable
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
ENDPOINT="${SERVER_URL}/api/health"

echo "Testing security headers on: $ENDPOINT"
echo "================================================"
echo ""

# Fetch headers
RESPONSE=$(curl -s -I "$ENDPOINT" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}ERROR: Unable to connect to server${NC}"
  echo "Make sure the server is running: pnpm dev:server"
  exit 1
fi

echo "$RESPONSE" > /tmp/headers.txt

# Function to check header exists
check_header() {
  local header_name="$1"
  local expected_value="$2"

  if grep -qi "^${header_name}:" /tmp/headers.txt; then
    local value=$(grep -i "^${header_name}:" /tmp/headers.txt | head -1 | cut -d: -f2- | xargs)

    if [ -n "$expected_value" ]; then
      if echo "$value" | grep -q "$expected_value"; then
        echo -e "${GREEN}✓${NC} $header_name: $value"
      else
        echo -e "${YELLOW}⚠${NC} $header_name: $value (expected: $expected_value)"
      fi
    else
      echo -e "${GREEN}✓${NC} $header_name: $value"
    fi
  else
    echo -e "${RED}✗${NC} $header_name: MISSING"
  fi
}

# Check security headers
echo "Security Headers:"
echo "------------------------------------------------"
check_header "Content-Security-Policy" ""
check_header "Strict-Transport-Security" "max-age=31536000"
check_header "X-Frame-Options" "DENY"
check_header "X-Content-Type-Options" "nosniff"
check_header "X-DNS-Prefetch-Control" "off"
check_header "Referrer-Policy" "strict-origin-when-cross-origin"
check_header "Permissions-Policy" ""
check_header "Expect-CT" "enforce"

echo ""
echo "Other Security Checks:"
echo "------------------------------------------------"

# Check X-Powered-By is removed
if grep -qi "^X-Powered-By:" /tmp/headers.txt; then
  local powered_by=$(grep -i "^X-Powered-By:" /tmp/headers.txt | cut -d: -f2- | xargs)
  echo -e "${RED}✗${NC} X-Powered-By: $powered_by (should be hidden)"
else
  echo -e "${GREEN}✓${NC} X-Powered-By: Hidden (not exposed)"
fi

# Check CORS headers
if grep -qi "^Access-Control-Allow-Origin:" /tmp/headers.txt; then
  local cors=$(grep -i "^Access-Control-Allow-Origin:" /tmp/headers.txt | cut -d: -f2- | xargs)
  echo -e "${GREEN}✓${NC} Access-Control-Allow-Origin: $cors"
else
  echo -e "${YELLOW}⚠${NC} Access-Control-Allow-Origin: Not set (may be conditional)"
fi

echo ""
echo "================================================"
echo "Full Headers Response:"
echo "------------------------------------------------"
cat /tmp/headers.txt

# Cleanup
rm /tmp/headers.txt

echo ""
echo "================================================"
echo "Testing complete!"
echo ""
echo "For production testing, run:"
echo "  SERVER_URL=https://protocol-guide-production.up.railway.app ./scripts/test-security-headers.sh"
echo ""
echo "For comprehensive security analysis, use:"
echo "  https://securityheaders.com"
echo "  https://observatory.mozilla.org"
