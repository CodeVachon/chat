#!/bin/bash
# Test utilities for Playwright E2E testing

set -e

COMMAND=${1:-help}
FILTER=${2:-}

case "$COMMAND" in
  install)
    echo "Installing Playwright browsers..."
    cd apps/web && bunx playwright install chromium firefox webkit
    ;;
    
  test)
    echo "Running all E2E tests..."
    bun run test:e2e
    ;;
    
  test:api)
    echo "Running API tests..."
    cd apps/web && bunx playwright test e2e/setup-*.spec.ts e2e/auth-flow.spec.ts
    ;;
    
  test:ui)
    echo "Running UI tests..."
    cd apps/web && bunx playwright test e2e/setup-ui.spec.ts
    ;;
    
  report)
    echo "Opening test report..."
    cd apps/web && bunx playwright show-report
    ;;
    
  debug)
    echo "Running tests in debug mode..."
    cd apps/web && bunx playwright test --debug "$FILTER"
    ;;
    
  headed)
    echo "Running tests with visible browser..."
    cd apps/web && bunx playwright test --headed "$FILTER"
    ;;
    
  help|*)
    echo "Available commands:"
    echo "  install     - Install Playwright browsers"
    echo "  test        - Run all E2E tests"
    echo "  test:api    - Run API tests only"
    echo "  test:ui     - Run UI tests only"
    echo "  report      - Show HTML test report"
    echo "  debug       - Run tests in debug mode"
    echo "  headed      - Run tests with visible browser"
    echo ""
    echo "Examples:"
    echo "  ./scripts/test-e2e.sh install"
    echo "  ./scripts/test-e2e.sh test:api"
    echo "  ./scripts/test-e2e.sh debug e2e/auth-flow.spec.ts"
    ;;
esac