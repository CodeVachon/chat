# Playwright E2E Testing

This directory contains end-to-end tests for the Chat application using Playwright.

## Setup

### Installation

The required dependencies are already installed in the project:

```bash
# Already included in apps/web/package.json
"@playwright/test": "^1.58.2"
```

### Browser Installation

Install the required browsers:

```bash
# Install all browsers (recommended for CI)
bunx playwright install

# Or install specific browsers
bunx playwright install chromium
bunx playwright install firefox
bunx playwright install webkit
```

## Running Tests

### Local Development

Make sure the development server is running:

```bash
# Start Docker + dev servers
bun dev

# Or if Docker is already running
bun dev:apps
```

Then run the tests:

```bash
# Run all tests
bun run test:e2e

# Run specific test file
bunx playwright test e2e/auth-flow.spec.ts

# Run with specific filter
bunx playwright test --grep "should create a new user"

# Run in headed mode (see browser)
bunx playwright test --headed

# Run with debugging
bunx playwright test --debug
```

### Test Reports

After running tests, view the HTML report:

```bash
bunx playwright show-report
```

## Test Structure

```
e2e/
├── fixtures/
│   ├── auth.ts          # Authentication helper functions
│   └── test.ts          # Custom test fixtures
├── helpers/
│   └── index.ts         # API and page helper classes
├── auth-flow.spec.ts    # Authentication flow tests
├── setup-organization.spec.ts  # Organization setup API tests
├── setup-owner.spec.ts   # Owner setup API tests
└── setup-ui.spec.ts      # UI tests for setup flow
```

## Test Files

### API Tests

- **setup-owner.spec.ts**: Tests for `/api/setup/owner` endpoint
- **setup-organization.spec.ts**: Tests for `/api/setup/organization` endpoint

### Integration Tests

- **auth-flow.spec.ts**: Complete authentication flows
- **setup-ui.spec.ts**: UI tests for the setup process

## Configuration

The Playwright configuration is in `apps/web/playwright.config.ts`:

- **Base URL**: `http://localhost:3367` (matches Caddy proxy)
- **Browser**: Chromium (add Firefox/WebKit for cross-browser testing)
- **Workers**: 1 (to avoid database conflicts)
- **Retries**: 2 in CI, 0 locally
- **Reporter**: HTML locally, GitHub in CI

## Writing Tests

### API Tests

```typescript
import { test, expect } from "@playwright/test";

test("should require authentication", async ({ request }) => {
    const response = await request.post("/api/protected-endpoint", {
        data: { some: "data" }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
});
```

### Using Helpers

```typescript
import { test, expect } from "@playwright/test";
import { APIHelper } from "./helpers";

test("should create user and get session", async ({ request }) => {
    const apiHelper = new APIHelper(request);

    const cookie = await apiHelper.createTestUser("test@example.com");
    const session = await apiHelper.getSession(cookie);

    expect(session.user.email).toBe("test@example.com");
});
```

### Authentication with Fixtures

```typescript
import { signUp, authenticatedPost } from "./fixtures/auth";

test("authenticated API call", async ({ request }) => {
    const cookie = await signUp(request, {
        email: "test@example.com",
        password: "password123",
        name: "Test User"
    });

    const response = await authenticatedPost(request, "/api/protected", cookie, {
        data: "test"
    });

    expect(response.ok()).toBeTruthy();
});
```

## Environment Variables

The tests use environment variables from `.env` file:

```bash
# Database and service configuration automatically loaded
# via dotenv in package.json test script
```

## CI/CD

In CI environments:

- Tests run with GitHub reporter
- Multiple browsers can be tested (uncomment in config)
- Screenshots and traces captured on failure
- Test retries enabled

## Debugging

### Debug Mode

```bash
bunx playwright test --debug
```

### Headed Mode (watch browser)

```bash
bunx playwright test --headed
```

### Trace Viewer

```bash
bunx playwright show-trace trace.zip
```

## Best Practices

1. **Use API helpers** for common operations like authentication
2. **Test both happy path and error cases**
3. **Use unique test data** with timestamps to avoid conflicts
4. **Clean up test data** or use unique identifiers
5. **Add meaningful assertions** for both status codes and response bodies
6. **Group related tests** with `test.describe()`
7. **Use `test.skip()`** for conditional test execution

## Troubleshooting

### Tests fail with 502 errors

- Ensure development servers are running on correct ports
- Check Docker containers: `docker ps`
- Restart servers: `bun dev:apps`

### Browser not found errors

- Install browsers: `bunx playwright install`
- Check browser cache location: `~/.cache/ms-playwright/`

### Database conflicts

- Tests run with 1 worker to avoid conflicts
- Use unique test data with timestamps
- Consider database reset between test runs
