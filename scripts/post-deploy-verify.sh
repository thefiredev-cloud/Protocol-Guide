#!/bin/bash
#
# Protocol Guide - Post-Deployment Verification Script
#
# Usage:
#   ./scripts/post-deploy-verify.sh [WEB_URL] [API_URL]
#
# Example:
#   ./scripts/post-deploy-verify.sh https://protocol-guide.com https://api.protocol-guide.com
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URLs
WEB_URL="${1:-https://protocol-guide.com}"
API_URL="${2:-$WEB_URL}"

# Counter for failures
FAILURES=0
WARNINGS=0

echo ""
echo "========================================"
echo " Protocol Guide Post-Deploy Verification"
echo "========================================"
echo ""
echo "Web URL: $WEB_URL"
echo "API URL: $API_URL"
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""
echo "----------------------------------------"

# Function to check HTTP status
check_http() {
    local url="$1"
    local expected="$2"
    local description="$3"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "$expected" ]; then
        echo -e "${GREEN}[PASS]${NC} $description (HTTP $HTTP_CODE)"
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $description (Expected $expected, got $HTTP_CODE)"
        ((FAILURES++))
        return 1
    fi
}

# Function to check health service status
check_health_service() {
    local service="$1"
    local status="$2"

    if [ "$status" = "healthy" ]; then
        echo -e "${GREEN}[PASS]${NC} $service: healthy"
        return 0
    elif [ "$status" = "degraded" ]; then
        echo -e "${YELLOW}[WARN]${NC} $service: degraded"
        ((WARNINGS++))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $service: $status"
        ((FAILURES++))
        return 1
    fi
}

echo ""
echo "1. Website Availability"
echo "------------------------"
check_http "$WEB_URL" "200" "Website loads"

echo ""
echo "2. Health Check Endpoint"
echo "------------------------"
HEALTH_RESPONSE=$(curl -s --max-time 30 "$API_URL/api/health" 2>/dev/null || echo '{"status":"error"}')

# Check if we got valid JSON
if echo "$HEALTH_RESPONSE" | jq -e . > /dev/null 2>&1; then
    HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "error"')

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}[PASS]${NC} Health check: healthy"
    elif [ "$HEALTH_STATUS" = "degraded" ]; then
        echo -e "${YELLOW}[WARN]${NC} Health check: degraded"
        ((WARNINGS++))
    else
        echo -e "${RED}[FAIL]${NC} Health check: $HEALTH_STATUS"
        ((FAILURES++))
    fi

    echo ""
    echo "3. Service Status"
    echo "-----------------"

    DB_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.database.status // "unknown"')
    check_health_service "Database (MySQL)" "$DB_STATUS"

    SUPA_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.supabase.status // "unknown"')
    check_health_service "Supabase (pgvector)" "$SUPA_STATUS"

    CLAUDE_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.claude.status // "unknown"')
    check_health_service "Claude API" "$CLAUDE_STATUS"

    VOYAGE_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.voyage.status // "unknown"')
    check_health_service "Voyage API" "$VOYAGE_STATUS"

    echo ""
    echo "4. Response Latencies"
    echo "---------------------"
    DB_LATENCY=$(echo "$HEALTH_RESPONSE" | jq -r '.services.database.latencyMs // "N/A"')
    SUPA_LATENCY=$(echo "$HEALTH_RESPONSE" | jq -r '.services.supabase.latencyMs // "N/A"')
    CLAUDE_LATENCY=$(echo "$HEALTH_RESPONSE" | jq -r '.services.claude.latencyMs // "N/A"')
    VOYAGE_LATENCY=$(echo "$HEALTH_RESPONSE" | jq -r '.services.voyage.latencyMs // "N/A"')

    echo "   Database:  ${DB_LATENCY}ms"
    echo "   Supabase:  ${SUPA_LATENCY}ms"
    echo "   Claude:    ${CLAUDE_LATENCY}ms"
    echo "   Voyage:    ${VOYAGE_LATENCY}ms"

    echo ""
    echo "5. Resource Usage"
    echo "-----------------"
    MEM_USED=$(echo "$HEALTH_RESPONSE" | jq -r '.resources.memoryUsedMB // "N/A"')
    MEM_PCT=$(echo "$HEALTH_RESPONSE" | jq -r '.resources.memoryPercentage // "N/A"')
    UPTIME=$(echo "$HEALTH_RESPONSE" | jq -r '.uptime // "N/A"')

    echo "   Memory: ${MEM_USED}MB (${MEM_PCT}%)"
    echo "   Uptime: ${UPTIME}s"
else
    echo -e "${RED}[FAIL]${NC} Health check returned invalid JSON"
    ((FAILURES++))
fi

echo ""
echo "6. Kubernetes Probes"
echo "--------------------"

# Ready endpoint
READY_RESPONSE=$(curl -s --max-time 5 "$API_URL/api/ready" 2>/dev/null || echo "error")
if [ "$READY_RESPONSE" = "ready" ]; then
    echo -e "${GREEN}[PASS]${NC} Readiness probe: ready"
else
    echo -e "${RED}[FAIL]${NC} Readiness probe: $READY_RESPONSE"
    ((FAILURES++))
fi

# Live endpoint
LIVE_RESPONSE=$(curl -s --max-time 5 "$API_URL/api/live" 2>/dev/null || echo "error")
if [ "$LIVE_RESPONSE" = "alive" ]; then
    echo -e "${GREEN}[PASS]${NC} Liveness probe: alive"
else
    echo -e "${RED}[FAIL]${NC} Liveness probe: $LIVE_RESPONSE"
    ((FAILURES++))
fi

echo ""
echo "7. Stripe Webhook Endpoint"
echo "--------------------------"
STRIPE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$API_URL/api/stripe/webhook" 2>/dev/null || echo "000")
# 400 is expected without valid payload (signature validation fails)
if [ "$STRIPE_CODE" = "400" ] || [ "$STRIPE_CODE" = "401" ]; then
    echo -e "${GREEN}[PASS]${NC} Stripe webhook accessible (HTTP $STRIPE_CODE without payload)"
elif [ "$STRIPE_CODE" = "404" ]; then
    echo -e "${RED}[FAIL]${NC} Stripe webhook not found (HTTP 404)"
    ((FAILURES++))
else
    echo -e "${YELLOW}[WARN]${NC} Stripe webhook returned HTTP $STRIPE_CODE"
    ((WARNINGS++))
fi

echo ""
echo "========================================"
echo " Verification Summary"
echo "========================================"
echo ""

if [ $FAILURES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    EXIT_CODE=0
elif [ $FAILURES -eq 0 ]; then
    echo -e "${YELLOW}Passed with $WARNINGS warning(s)${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}$FAILURES failure(s), $WARNINGS warning(s)${NC}"
    EXIT_CODE=1
fi

echo ""
echo "Completed: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

exit $EXIT_CODE
