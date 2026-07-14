import time
import urllib.parse
from playwright.sync_api import sync_playwright

def test_yp():
    query = "Commercial plumbers in Chicago"
    safe_query = urllib.parse.quote_plus(query)
    url = f"https://www.yellowpages.com/search?search_terms={safe_query}&geo_location_terms="
    print(f"Navigating to: {url}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.goto(url, timeout=30000)
        time.sleep(5)
        
        html = page.content()
        with open("yp_debug.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        listings = page.locator('.search-results .result').all()
        print(f"Found {len(listings)} listings matching '.search-results .result'")
        
        # Test generic search to see if any results are loaded at all
        cards = page.locator('.result').all()
        print(f"Found {len(cards)} listings matching '.result'")
        
        browser.close()

if __name__ == "__main__":
    test_yp()
