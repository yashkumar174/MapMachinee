from playwright.sync_api import sync_playwright
import time
import re

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.google.com/maps/search/East+Village+Dental+Centre")
        time.sleep(5)
        
        name = "East Village Dental Centre"
        print(f"Finding: {name}")
        
        try:
            detail_pane = page.locator(f'div[role="main"][aria-label="{name}"]')
            detail_pane.wait_for(state="visible", timeout=5000)
        except Exception:
            detail_pane = page.locator('div[role="main"]').last

        phones = []
        try:
            phone_btns = detail_pane.locator('button[data-item-id^="phone:tel:"]').all()
            for pb in phone_btns:
                text = pb.inner_text().encode('ascii', errors='ignore').decode('ascii').strip()
                if text and any(c.isdigit() for c in text):
                    phones.append(text)
        except Exception as e:
            print("Phone error:", e)

        print("Extracted Phones:", phones)

        website = None
        try:
            web_links = detail_pane.locator('a[data-item-id="authority"]').all()
            for w in web_links:
                href = w.get_attribute('href')
                if href:
                    website = href
                    break
        except Exception as e:
            print("Website error:", e)

        print("Extracted Website:", website)

        browser.close()

if __name__ == "__main__":
    test()
