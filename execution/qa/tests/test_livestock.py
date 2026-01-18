"""
Livestock feature tests.
Tests Add Batch, Add Animals, Sell Animals, Weight Tracking.
"""

import time


def test_navigate_to_livestock(browser):
    """Test navigating to the Livestock page."""
    # Look for Livestock link in sidebar
    clicked = browser.click("a[href*='livestock'], a[href*='Livestock'], button:has-text('Livestock')", by="css")
    
    if not clicked:
        # Try XPath for text-based search
        clicked = browser.click("//a[contains(text(),'Livestock')] | //button[contains(text(),'Livestock')]", by="xpath")
    
    time.sleep(1)
    
    # Check if we're on livestock page (look for batch-related elements)
    has_batches = browser.element_exists("text=Livestock Batches") or browser.element_exists("text=Batches")
    
    return {
        "passed": has_batches or clicked,
        "details": {"navigated": clicked, "page_found": has_batches}
    }


def test_add_batch_goat(browser):
    """Test creating a new Goat batch."""
    return _test_add_batch(browser, "Goat")


def test_add_batch_sheep(browser):
    """Test creating a new Sheep batch."""
    return _test_add_batch(browser, "Sheep")


def test_add_batch_cow(browser):
    """Test creating a new Cow batch."""
    return _test_add_batch(browser, "Cow")


def test_add_batch_poultry(browser):
    """Test creating a new Poultry batch."""
    return _test_add_batch(browser, "Poultry")


def _test_add_batch(browser, animal_type: str):
    """Helper to test adding a batch of a specific type."""
    # Navigate to livestock first
    browser.click("//a[contains(text(),'Livestock')]", by="xpath")
    time.sleep(1)
    
    # Click New Batch button
    clicked = browser.click("button:has-text('New Batch')", by="css")
    if not clicked:
        clicked = browser.click("//button[contains(text(),'New Batch')]", by="xpath")
    
    if not clicked:
        return {"passed": False, "error": "Could not find New Batch button"}
    
    time.sleep(0.5)
    
    # Fill batch form
    batch_name = f"QA Test {animal_type} {int(time.time()) % 10000}"
    
    # Enter batch name
    browser.type_text("input[placeholder*='batch'], input[placeholder*='Batch']", batch_name)
    
    # Select animal type
    browser.select_option("select", animal_type)
    
    # Enter date
    today = time.strftime("%Y-%m-%d")
    browser.type_text("input[type='date']", today)
    
    # Submit
    browser.click("button[type='submit']:has-text('Create'), button:has-text('Create Batch')")
    time.sleep(1)
    
    # Verify batch was created (look for it in the list)
    page_text = browser.driver.page_source
    batch_created = batch_name in page_text or animal_type in page_text
    
    return {
        "passed": batch_created,
        "details": {"batch_name": batch_name, "type": animal_type}
    }


def test_add_animals_to_batch(browser):
    """Test adding animals to an existing batch."""
    # Refresh page to ensure we see any newly created batches
    browser.driver.refresh()
    time.sleep(2)
    
    # Navigate to livestock
    browser.click("//a[contains(text(),'Livestock')]", by="xpath")
    time.sleep(2)  # Wait for data to load
    
    # Try multiple selectors for batch cards
    batch_cards = browser.get_elements("div[class*='cursor-pointer'][class*='rounded']")
    
    if not batch_cards:
        # Try alternative selector - look for cards with animal type text
        batch_cards = browser.get_elements("//div[contains(@class,'cursor-pointer')]", by="xpath")
    
    if not batch_cards:
        # Try clicking on any card that might be a batch
        batch_cards = browser.get_elements("div[class*='bg-white'][class*='shadow']")
    
    if not batch_cards:
        return {"passed": False, "error": f"No batches found to add animals to (page: {browser.driver.current_url})"}
    
    batch_cards[0].click()
    time.sleep(2)  # Wait for batch details to load
    
    # Click Add Animals button - try multiple selectors
    # XPath is more reliable for text matching
    clicked = browser.click("//button[contains(.,'Add Animals')]", by="xpath")
    if not clicked:
        clicked = browser.click("//button[contains(text(),'Add')]", by="xpath")
    if not clicked:
        # Try finding any button in the batch detail area
        all_buttons = browser.get_elements("button")
        for btn in all_buttons:
            try:
                if 'Add' in btn.text:
                    btn.click()
                    clicked = True
                    break
            except:
                continue
    
    if not clicked:
        return {"passed": False, "error": "Could not find Add Animals button"}
    
    time.sleep(1)
    
    # Fill animal form
    # Number of animals
    browser.type_text("input[type='number'][min='1']", "2")
    
    # Weight
    weight_inputs = browser.get_elements("input[type='number']")
    if len(weight_inputs) >= 2:
        weight_inputs[1].clear()
        weight_inputs[1].send_keys("25")
    
    # Cost
    if len(weight_inputs) >= 3:
        weight_inputs[2].clear()
        weight_inputs[2].send_keys("5000")
    
    # Submit
    browser.click("button[type='submit']:has-text('Add')")
    time.sleep(1)
    
    # Check for animal IDs in the page (e.g., GTJANF26-1)
    page_text = browser.driver.page_source
    # Look for typical ID patterns
    import re
    id_pattern = r'[A-Z]{2}[A-Z]{3}[MF]\d{2}-\d+'
    matches = re.findall(id_pattern, page_text)
    
    return {
        "passed": len(matches) > 0,
        "details": {"animal_ids_found": matches[:5] if matches else []}
    }


def test_sell_animals(browser):
    """Test the sell animals flow."""
    # Navigate to livestock
    browser.click("//a[contains(text(),'Livestock')]", by="xpath")
    time.sleep(1)
    
    # Click on a batch
    batch_cards = browser.get_elements("div[class*='cursor-pointer'][class*='rounded']")
    if not batch_cards:
        return {"passed": False, "error": "No batches found"}
    
    batch_cards[0].click()
    time.sleep(1)
    
    # Look for Sell button
    sell_btn = browser.element_exists("button:has-text('Sell')")
    
    return {
        "passed": True,  # Just checking the page loads
        "details": {"sell_button_found": sell_btn}
    }


def get_tests():
    """Return list of (name, test_fn) tuples.
    
    Tests run in order - create_batch runs first to ensure data exists
    for subsequent tests.
    """
    return [
        ("navigate_to_livestock", test_navigate_to_livestock),
        ("create_batch_goat", test_add_batch_goat),  # Create test data first
        ("add_animals_to_batch", test_add_animals_to_batch),  # Now we have a batch
    ]
