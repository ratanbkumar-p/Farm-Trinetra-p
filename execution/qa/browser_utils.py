"""
Browser automation utilities for QA testing.
Uses Selenium WebDriver with Chrome.
"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


class BrowserHelper:
    """Helper class for browser automation."""
    
    def __init__(self, headless: bool = False, timeout: int = 10):
        """
        Initialize browser helper.
        
        Args:
            headless: Run browser in headless mode
            timeout: Default wait timeout in seconds
        """
        self.timeout = timeout
        self.driver = None
        self.headless = headless
        
    def start(self):
        """Start the browser."""
        options = Options()
        if self.headless:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-gpu')
        
        # For Chrome 115+, try to get chromedriver from Chrome for Testing
        driver_path = self._get_chromedriver()
        
        if driver_path:
            self.driver = webdriver.Chrome(executable_path=driver_path, options=options)
        else:
            # Fall back - let selenium find chromedriver in PATH
            self.driver = webdriver.Chrome(options=options)
        
        self.driver.implicitly_wait(5)
        return self
    
    def _get_chromedriver(self):
        """Download chromedriver using Chrome for Testing API."""
        import json
        import urllib.request
        import zipfile
        import tempfile
        import subprocess
        
        try:
            # Get Chrome version from Windows registry
            result = subprocess.Popen(
                ['reg', 'query', r'HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon', '/v', 'version'],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, stderr = result.communicate()
            version_line = [l for l in stdout.decode().split('\n') if 'version' in l.lower()]
            if not version_line:
                return None
            chrome_version = version_line[0].split()[-1].strip()
            major_version = chrome_version.split('.')[0]
            print(f"[QA] Detected Chrome version: {chrome_version}")
            
            # Get chromedriver URL from Chrome for Testing API
            api_url = "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json"
            with urllib.request.urlopen(api_url, timeout=15) as response:
                data = json.loads(response.read().decode())
            
            # Find matching version
            matching = [v for v in data['versions'] if v['version'].startswith(major_version + '.')]
            if not matching:
                print(f"[QA] No chromedriver found for Chrome {major_version}")
                return None
            
            latest = matching[-1]
            print(f"[QA] Using chromedriver version: {latest['version']}")
            
            # Get win64 chromedriver download URL
            downloads = latest.get('downloads', {}).get('chromedriver', [])
            win64_url = next((d['url'] for d in downloads if d['platform'] == 'win64'), None)
            
            if not win64_url:
                return None
            
            # Download and extract
            driver_dir = os.path.join(os.environ.get('TEMP', tempfile.gettempdir()), 'chromedriver_cache')
            os.makedirs(driver_dir, exist_ok=True)
            driver_exe = os.path.join(driver_dir, 'chromedriver.exe')
            
            # Check if we already have a cached version
            if os.path.exists(driver_exe):
                print(f"[QA] Using cached chromedriver: {driver_exe}")
                return driver_exe
            
            print(f"[QA] Downloading chromedriver...")
            
            # Download zip
            zip_path = os.path.join(driver_dir, 'chromedriver.zip')
            urllib.request.urlretrieve(win64_url, zip_path)
            
            # Extract
            with zipfile.ZipFile(zip_path, 'r') as z:
                for name in z.namelist():
                    if name.endswith('chromedriver.exe'):
                        with z.open(name) as source:
                            with open(driver_exe, 'wb') as target:
                                target.write(source.read())
                        break
            
            os.remove(zip_path)
            print(f"[QA] Chromedriver extracted to: {driver_exe}")
            return driver_exe
            
        except Exception as e:
            print(f"[QA] Could not auto-download chromedriver: {e}")
            return None
        
    def stop(self):
        """Stop the browser."""
        if self.driver:
            self.driver.quit()
            self.driver = None
            
    def navigate(self, url: str):
        """Navigate to a URL."""
        self.driver.get(url)
        time.sleep(1)  # Allow page to stabilize
        
    def wait_for_element(self, selector: str, by: str = "css", timeout: int = None):
        """
        Wait for an element to be present.
        
        Args:
            selector: CSS selector or XPath
            by: "css" or "xpath"
            timeout: Override default timeout
            
        Returns:
            WebElement if found, None otherwise
        """
        timeout = timeout or self.timeout
        locator = (By.CSS_SELECTOR if by == "css" else By.XPATH, selector)
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )
            return element
        except TimeoutException:
            return None
            
    def click(self, selector: str, by: str = "css"):
        """Click an element, using JavaScript as fallback."""
        element = self.wait_for_element(selector, by)
        if element:
            try:
                # Scroll element into view first
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
                time.sleep(0.3)
                element.click()
            except Exception:
                # Fallback to JavaScript click if normal click fails
                try:
                    self.driver.execute_script("arguments[0].click();", element)
                except Exception:
                    return False
            time.sleep(0.5)
            return True
        return False
        
    def type_text(self, selector: str, text: str, by: str = "css", clear: bool = True):
        """Type text into an input field."""
        element = self.wait_for_element(selector, by)
        if element:
            if clear:
                element.clear()
            element.send_keys(text)
            return True
        return False
        
    def get_text(self, selector: str, by: str = "css") -> str:
        """Get text content of an element."""
        element = self.wait_for_element(selector, by)
        if element:
            return element.text
        return ""
        
    def get_elements(self, selector: str, by: str = "css"):
        """Get all matching elements."""
        locator = (By.CSS_SELECTOR if by == "css" else By.XPATH, selector)
        try:
            return self.driver.find_elements(*locator)
        except NoSuchElementException:
            return []
            
    def element_exists(self, selector: str, by: str = "css") -> bool:
        """Check if an element exists."""
        elements = self.get_elements(selector, by)
        return len(elements) > 0
        
    def get_console_errors(self) -> list:
        """Get browser console errors."""
        logs = self.driver.get_log('browser')
        return [log for log in logs if log['level'] == 'SEVERE']
        
    def screenshot(self, filename: str):
        """Take a screenshot."""
        self.driver.save_screenshot(filename)
        
    def select_option(self, selector: str, value: str, by: str = "css"):
        """Select an option from a dropdown by visible text."""
        from selenium.webdriver.support.ui import Select
        element = self.wait_for_element(selector, by)
        if element:
            select = Select(element)
            select.select_by_visible_text(value)
            return True
        return False


class TestResult:
    """Container for test results."""
    
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error = None
        self.duration = 0
        self.details = {}
        
    def to_dict(self):
        return {
            "name": self.name,
            "passed": self.passed,
            "error": self.error,
            "duration": self.duration,
            "details": self.details
        }


def run_test(name: str, test_fn, browser: BrowserHelper) -> TestResult:
    """
    Run a single test function and capture results.
    
    Args:
        name: Test name
        test_fn: Function to run (should return dict with 'passed' and optional 'details')
        browser: BrowserHelper instance
        
    Returns:
        TestResult object
    """
    result = TestResult(name)
    start = time.time()
    
    try:
        outcome = test_fn(browser)
        result.passed = outcome.get("passed", False)
        result.details = outcome.get("details", {})
        if not result.passed:
            result.error = outcome.get("error", "Test failed")
    except Exception as e:
        result.passed = False
        result.error = str(e)
        
    result.duration = round(time.time() - start, 2)
    return result
