#!/bin/bash

# Pre-deployment Script
# Runs all checks before deployment to ensure code quality and readiness
# Usage: ./scripts/predeploy.sh [--verbose]

set +e  # Don't exit on error - we want to run all checks
VERBOSE=false

# Check for verbose flag
if [[ "$1" == "--verbose" ]] || [[ "$1" == "-v" ]]; then
    VERBOSE=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0
WARNINGS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        FAILURES=$((FAILURES + 1))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "=========================================="
echo "  Pre-deployment Checks"
echo "=========================================="
echo ""

# 1. ESLint Check
print_info "Running ESLint..."
if [ "$VERBOSE" = true ]; then
    if npm run lint; then
        print_status 0 "ESLint check passed"
    else
        print_status 1 "ESLint check failed"
    fi
else
    if npm run lint > /dev/null 2>&1; then
        print_status 0 "ESLint check passed"
    else
        print_status 1 "ESLint check failed"
        echo "Run 'npm run lint' to see details (or use --verbose flag)"
    fi
fi
echo ""

# 2. TypeScript Type Check
print_info "Running TypeScript type check..."
if [ "$VERBOSE" = true ]; then
    if npx tsc --noEmit; then
        print_status 0 "TypeScript type check passed"
    else
        print_status 1 "TypeScript type check failed"
    fi
else
    if npx tsc --noEmit > /dev/null 2>&1; then
        print_status 0 "TypeScript type check passed"
    else
        print_status 1 "TypeScript type check failed"
        echo "Run 'npx tsc --noEmit' to see details (or use --verbose flag)"
    fi
fi
echo ""

# 3. Run Tests
print_info "Running tests..."
if [ "$VERBOSE" = true ]; then
    if npm test -- --passWithNoTests; then
        print_status 0 "All tests passed"
    else
        print_status 1 "Some tests failed"
    fi
else
    TEST_OUTPUT=$(npm test -- --passWithNoTests 2>&1)
    TEST_EXIT=$?
    if [ $TEST_EXIT -eq 0 ]; then
        print_status 0 "All tests passed"
    else
        print_status 1 "Some tests failed"
        PASSED=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | head -1 || echo "0")
        FAILED=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= failed)' | head -1 || echo "0")
        echo "  Tests: $PASSED passed, $FAILED failed"
        echo "Run 'npm test' to see details (or use --verbose flag)"
    fi
fi
echo ""

# 4. NPM Audit (High severity only)
print_info "Checking for high-severity vulnerabilities..."
AUDIT_OUTPUT=$(npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
    print_status 0 "No high-severity vulnerabilities found"
elif echo "$AUDIT_OUTPUT" | grep -q "found.*vulnerabilities"; then
    print_warning "High-severity vulnerabilities found"
    echo "Run 'npm audit' to see details"
else
    print_status 0 "NPM audit check passed"
fi
echo ""

# 5. Build Check
print_info "Running production build..."
if npm run build > /dev/null 2>&1; then
    print_status 0 "Build succeeded"
else
    print_status 1 "Build failed"
    echo "Run 'npm run build' to see details"
fi
echo ""

# 6. Check .env.example exists
print_info "Checking .env.example file..."
if [ -f .env.example ]; then
    print_status 0 ".env.example file exists"
else
    print_warning ".env.example file not found"
fi
echo ""

# 7. Check for console.logs in production code (warn only)
print_info "Checking for console.log statements in production code..."
CONSOLE_LOGS=$(grep -r "console\.log" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | grep -v "test" | grep -v "__tests__" | wc -l || echo "0")
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    print_warning "Found $CONSOLE_LOGS console.log statements (excluding tests)"
    echo "Consider removing console.logs from production code"
else
    print_status 0 "No console.log statements found in production code"
fi
echo ""

# 8. Check bundle size
print_info "Checking bundle size..."
if [ -d ".next" ]; then
    # Find the largest JS chunks
    LARGEST_CHUNK=$(find .next/static/chunks -name "*.js" -type f -exec du -h {} + 2>/dev/null | sort -rh | head -1 | awk '{print $1}' || echo "0")
    if [ "$LARGEST_CHUNK" != "0" ] && [ -n "$LARGEST_CHUNK" ]; then
        # Extract number (remove 'K' or 'M')
        SIZE_NUM=$(echo "$LARGEST_CHUNK" | sed 's/[^0-9.]//g')
        SIZE_UNIT=$(echo "$LARGEST_CHUNK" | sed 's/[0-9.]//g')
        
        if [ "$SIZE_UNIT" = "M" ] && (( $(echo "$SIZE_NUM > 1" | bc -l 2>/dev/null || echo "0") )); then
            print_warning "Largest chunk is ${LARGEST_CHUNK} (exceeds 1MB)"
        else
            print_status 0 "Bundle size check passed (largest chunk: ${LARGEST_CHUNK})"
        fi
    else
        print_warning "Could not determine bundle size"
    fi
else
    print_warning "Build directory not found - run 'npm run build' first"
fi
echo ""

# 9. Check for required environment variables in .env.example
print_info "Checking .env.example for required variables..."
if [ -f .env.example ]; then
    REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "ADMIN_EMAIL" "ADMIN_PASSWORD" "RESEND_API_KEY" "UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" .env.example 2>/dev/null; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        print_status 0 "All required environment variables documented in .env.example"
    else
        print_warning "Missing variables in .env.example: ${MISSING_VARS[*]}"
    fi
else
    print_warning ".env.example not found - cannot verify required variables"
fi
echo ""

# Summary
echo "=========================================="
echo "  Summary"
echo "=========================================="

if [ $FAILURES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
    exit 0
elif [ $FAILURES -eq 0 ]; then
    echo -e "${YELLOW}⚠ Checks passed with $WARNINGS warning(s). Review warnings before deployment.${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILURES check(s) failed. Please fix issues before deployment.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Also found $WARNINGS warning(s).${NC}"
    fi
    exit 1
fi

