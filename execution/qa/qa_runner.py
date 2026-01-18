"""
QA Test Runner for Farm TNF Application.
Runs automated browser tests and generates reports.

Usage:
    python qa_runner.py                    # Run all tests
    python qa_runner.py --suite livestock  # Run specific suite
    python qa_runner.py --url http://localhost:3000/
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from execution.qa.browser_utils import BrowserHelper, run_test
from execution.qa.tests import test_livestock, test_navigation


def get_available_suites():
    """Return dict of available test suites."""
    return {
        "livestock": test_livestock.get_tests(),
        "navigation": test_navigation.get_tests(),
    }


def run_suite(browser: BrowserHelper, suite_name: str, tests: list) -> list:
    """Run all tests in a suite."""
    print(f"\n{'='*50}")
    print(f"RUNNING SUITE: {suite_name.upper()}")
    print(f"{'='*50}")
    
    results = []
    for test_name, test_fn in tests:
        full_name = f"{suite_name}.{test_name}"
        print(f"  Running: {test_name}...", end=" ")
        
        result = run_test(full_name, test_fn, browser)
        results.append(result)
        
        if result.passed:
            print(f"✅ PASSED ({result.duration}s)")
        else:
            print(f"❌ FAILED ({result.duration}s)")
            if result.error:
                print(f"      Error: {result.error}")
                
    return results


def generate_report(results: list, output_dir: str) -> str:
    """Generate JSON report and return path."""
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = os.path.join(output_dir, f"qa_report_{timestamp}.json")
    
    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total": len(results),
            "passed": passed,
            "failed": failed,
            "pass_rate": f"{(passed/len(results)*100):.1f}%" if results else "N/A"
        },
        "tests": [r.to_dict() for r in results]
    }
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
        
    return report_path


def print_summary(results: list):
    """Print test summary to console."""
    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed
    
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print(f"{'='*50}")
    print(f"  Total:  {len(results)}")
    print(f"  Passed: {passed} ✅")
    print(f"  Failed: {failed} ❌")
    if results:
        print(f"  Pass Rate: {(passed/len(results)*100):.1f}%")
        
    if failed > 0:
        print(f"\n  Failed Tests:")
        for r in results:
            if not r.passed:
                print(f"    - {r.name}: {r.error}")


def main():
    parser = argparse.ArgumentParser(description="Farm TNF QA Test Runner")
    parser.add_argument("--url", default="http://localhost:5173/", help="App URL to test")
    parser.add_argument("--suite", default="all", help="Test suite to run (livestock, navigation, all)")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--output", default=".tmp", help="Output directory for reports")
    parser.add_argument("--setup-data", action="store_true", help="Setup test data before running tests")
    parser.add_argument("--cleanup", action="store_true", help="Cleanup test data after running tests")
    
    args = parser.parse_args()
    
    print(f"🧪 Farm TNF QA Test Runner")
    print(f"   URL: {args.url}")
    print(f"   Suite: {args.suite}")
    print(f"   Headless: {args.headless}")
    
    # Setup test data if requested
    if args.setup_data:
        print(f"\n📦 Setting up test data...")
        try:
            from execution.qa.test_data import setup_test_data
            if not setup_test_data():
                print("⚠️ Test data setup failed, continuing anyway...")
        except ImportError as e:
            print(f"⚠️ Could not import test_data module: {e}")
            print("   Make sure firebase-admin is installed: pip install firebase-admin")
    
    # Initialize browser
    browser = BrowserHelper(headless=args.headless)
    
    try:
        browser.start()
        
        # Add qa_test parameter to bypass authentication
        test_url = args.url
        if '?' in test_url:
            test_url += '&qa_test=true'
        else:
            test_url += '?qa_test=true'
        
        print(f"   Test URL: {test_url}")
        browser.navigate(test_url)
        
        # Get test suites to run
        available = get_available_suites()
        
        if args.suite == "all":
            suites_to_run = available
        elif args.suite in available:
            suites_to_run = {args.suite: available[args.suite]}
        else:
            print(f"❌ Unknown suite: {args.suite}")
            print(f"   Available: {', '.join(available.keys())}")
            return 1
            
        # Run tests
        all_results = []
        for suite_name, tests in suites_to_run.items():
            results = run_suite(browser, suite_name, tests)
            all_results.extend(results)
            
        # Generate report
        report_path = generate_report(all_results, args.output)
        print(f"\n📄 Report saved: {report_path}")
        
        # Print summary
        print_summary(all_results)
        
        # Return exit code
        failed = sum(1 for r in all_results if not r.passed)
        return 1 if failed > 0 else 0
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        return 1
        
    finally:
        browser.stop()
        
        # Cleanup test data if requested
        if args.cleanup:
            print(f"\n🧹 Cleaning up test data...")
            try:
                from execution.qa.test_data import cleanup_test_data
                cleanup_test_data()
            except ImportError as e:
                print(f"⚠️ Could not import test_data module: {e}")


if __name__ == "__main__":
    sys.exit(main())
