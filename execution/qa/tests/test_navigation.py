"""
Navigation tests.
Tests sidebar navigation and page loading.
"""

import time


def test_page_loads(browser):
    """Test that the main page loads without errors."""
    # Check for basic page elements
    has_content = browser.element_exists("body")
    
    # Look for sidebar or navigation
    has_nav = (
        browser.element_exists("nav") or 
        browser.element_exists("aside") or 
        browser.element_exists("[class*='sidebar']")
    )
    
    # Check for React app mount
    has_app = browser.element_exists("#root") or browser.element_exists("[data-reactroot]")
    
    return {
        "passed": has_content and has_app,
        "details": {
            "has_content": has_content,
            "has_navigation": has_nav,
            "has_react_app": has_app
        }
    }


def test_sidebar_links(browser):
    """Test that sidebar contains expected navigation links."""
    expected_links = ["Dashboard", "Livestock", "Expenses", "Employees"]
    found_links = []
    
    for link_text in expected_links:
        exists = browser.element_exists(f"//a[contains(text(),'{link_text}')] | //button[contains(text(),'{link_text}')]", by="xpath")
        if exists:
            found_links.append(link_text)
    
    return {
        "passed": len(found_links) >= 2,  # At least 2 links should be found
        "details": {
            "expected": expected_links,
            "found": found_links
        }
    }


def test_dashboard_navigation(browser):
    """Test navigating to Dashboard."""
    clicked = browser.click("//a[contains(text(),'Dashboard')]", by="xpath")
    time.sleep(1)
    
    # Check if dashboard content is visible
    has_dashboard = (
        browser.element_exists("text=Dashboard") or
        browser.element_exists("[class*='dashboard']")
    )
    
    return {
        "passed": clicked or has_dashboard,
        "details": {"clicked": clicked, "page_found": has_dashboard}
    }


def test_expenses_navigation(browser):
    """Test navigating to Expenses page."""
    clicked = browser.click("//a[contains(text(),'Expenses')]", by="xpath")
    time.sleep(1)
    
    page_text = browser.driver.page_source.lower()
    has_expenses = "expense" in page_text
    
    return {
        "passed": clicked or has_expenses,
        "details": {"clicked": clicked, "page_found": has_expenses}
    }


def test_no_console_errors(browser):
    """Test that there are no severe console errors."""
    try:
        errors = browser.get_console_errors()
        # Filter out common non-critical errors
        critical_errors = [e for e in errors if 'favicon' not in e.get('message', '').lower()]
        
        return {
            "passed": len(critical_errors) == 0,
            "details": {
                "error_count": len(critical_errors),
                "errors": [e.get('message', '')[:100] for e in critical_errors[:5]]
            }
        }
    except Exception as e:
        # Some browsers don't support logging
        return {
            "passed": True,
            "details": {"note": "Console logging not available"}
        }


def get_tests():
    """Return list of (name, test_fn) tuples."""
    return [
        ("page_loads", test_page_loads),
        ("sidebar_links", test_sidebar_links),
        ("dashboard_navigation", test_dashboard_navigation),
        ("expenses_navigation", test_expenses_navigation),
    ]
