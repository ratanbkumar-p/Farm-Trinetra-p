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
- 2026-10-13: Local QA mode now keeps writes in memory. On the dev server with `?qa_test=true`, the fake QA user cannot write to Firestore, so `DataContext` applies `setDoc`/`updateDoc`/`deleteDoc` to local state instead (reads still come from `qa_*` collections). Add `&demo=1` to load a sample farm (`src/lib/demoFarm.js`) with goats/sheep/poultry, sick + sold animals, and deceased records both with and without a date — use it to exercise Record death, Fix dates, Undo, Sell and Quick Jump. Nothing in this mode reaches Firestore; reload resets it.
- 2026-10-13: Deaths must carry `deceasedDate` (YYYY-MM-DD), `deathReason`, optional `deathNotes`. Record them via `recordDeaths()`; edit/fix via `updateDeathDetails()`; undo via `reviveAnimals()`. Older records may lack `deceasedDate` — the Deceased tab lists them under "Date not recorded" with a fix flow.
- 2026-10-13 (round 2): Costing rules live in `src/lib/costing.js`. Batch numbers (invested, cost/animal, break-even, min sell price, sold profit) use batch-own costs only (purchase + batch-linked expenses). Shared costs (salaries by sector, yearly ÷ 12, unlinked general expenses) are split monthly across batches by inventory value and shown separately (Shared farm costs card, Profit Calculator, Sell flow). When testing, check both numbers. Settings → Farm sections toggles `settings.modules.crops/fruits`; hidden modules must vanish from nav, Quick Jump, Home and redirect their routes.
