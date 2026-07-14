import time
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re

def test_scrape():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Force English locale to standardize aria-labels
        context = browser.new_context(locale='en-US')
        page = context.new_page()
        
        page.goto("https://www.google.com/maps")
        
        try:
            page.locator("button:has-text('Accept all')").click(timeout=3000)
        except:
            pass
            
        search_box = page.locator('input.UGojuc')
        search_box.fill("Crave By Leena Bangalore")
        search_box.press("Enter")
        time.sleep(5)
        
        articles = page.locator('a.hfpxzc').all()
        if articles:
            print("FOUND ARTICLE: ", articles[0].get_attribute("aria-label"))
            
            # Click it
            articles[0].click()
            time.sleep(3)
            
            detail_html = page.content()
            soup = BeautifulSoup(detail_html, "html.parser")
            
            # Print all aria-labels
            print("--- ALL ARIA LABELS ---")
            for tag in soup.find_all(attrs={"aria-label": True}):
                label = tag["aria-label"]
                if "star" in label.lower() or "review" in label.lower() or "(" in label:
                    print(f"LABEL: {label}")
                    
            print("--- TRYING REGEX ON BODY TEXT ---")
            text = soup.get_text()
            # Look for "4.4 (2,314)"
            matches = re.findall(r'(\d[\d\.]*)\s*\(([\d,]+)\)', text)
            print("REGEX MATCHES:", matches)
            
        browser.close()

if __name__ == "__main__":
    test_scrape()
