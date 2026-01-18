# QA Testing Directive

## Goal
Automated browser testing of the Farm TNF web application to verify all features work correctly.

## Inputs
- `APP_URL`: URL of the running app (default: `http://localhost:5173/`)
- `TEST_SUITE`: Which tests to run (default: `all`)

## Tools/Scripts
- `execution/qa/qa_runner.py` - Main test runner
- `execution/qa/browser_utils.py` - Browser automation utilities
- `execution/qa/tests/test_*.py` - Feature test modules

## Usage

```bash
# Install dependencies first
pip install -r requirements-qa.txt

# Run all tests
python execution/qa/qa_runner.py

# Run specific test suite
python execution/qa/qa_runner.py --suite livestock

# Run against different URL
python execution/qa/qa_runner.py --url http://localhost:3000/
```

## Test Suites

### `livestock`
- Create batches for each animal type
- Add animals and verify ID generation
- Sell animals flow
- Weight tracking

### `navigation`
- Sidebar navigation
- Page loading verification

### `auth`
- Login page loading
- Login flow (if credentials available)

## Output
- JSON report saved to `.tmp/qa_report_{timestamp}.json`
- Console summary with pass/fail counts

## Edge Cases
- If app is not running, tests will fail with connection error
- If authentication is required, set `TEST_USER` and `TEST_PASS` in `.env`
- Chrome must be installed (webdriver-manager handles chromedriver)

## Self-Anneal Notes
- 2026-01-18: Initial directive created for automated QA testing
