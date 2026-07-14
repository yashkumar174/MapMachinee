import time
import re
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

def audit_site(url: str) -> dict:
    """
    Visits a URL and performs a basic technical and content audit.
    Returns a dictionary of the audit results.
    """
    if not url or not url.startswith("http"):
        return {
            "has_website": False,
            "load_time": None,
            "mobile_friendly": False,
            "has_booking": False,
            "emails": None,
            "phone": None,
            "cms_type": None,
            "error": "Invalid or missing URL"
        }

    results = {
        "has_website": True,
        "load_time": 0.0,
        "mobile_friendly": False,
        "has_booking": False,
        "emails": None,
        "phone": None,
        "cms_type": None,
        "error": None
    }
    
    start_time = time.time()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # using a simple user-agent to bypass basic blocks
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()
        
        try:
            # We enforce a strict timeout of 15 seconds to prevent stalling
            page.goto(url, timeout=15000, wait_until="domcontentloaded")
            results["load_time"] = round(time.time() - start_time, 2)
            
            # 1. Check mobile readiness
            viewport_meta = page.query_selector('meta[name="viewport"]')
            if viewport_meta:
                content = viewport_meta.get_attribute("content")
                if content and "width=device-width" in content.lower():
                    results["mobile_friendly"] = True
                    
            # 2. Check for booking indicators
            # Extract all text and use regex
            body_text = page.locator("body").inner_text().lower()
            booking_keywords = ["book now", "schedule", "appointment", "book online"]
            
            for keyword in booking_keywords:
                if keyword in body_text:
                    results["has_booking"] = True
                    break
            
            # also search links/buttons specifically for 'book'
            if not results["has_booking"]:
                book_buttons = page.locator("a, button", has_text=re.compile(r"book|schedule|appointment", re.IGNORECASE))
                if book_buttons.count() > 0:
                    results["has_booking"] = True

            # 3. Check for Emails
            # Find mailto: links
            email_links = page.locator("a[href^='mailto:']").all()
            found_emails = set()
            for link in email_links[:5]: # limit execution
                try:
                    href = link.get_attribute("href")
                    if href:
                        email = href.replace('mailto:', '').split('?')[0].strip()
                        if '@' in email:
                            found_emails.add(email)
                except:
                    pass
            
            # Also Regex on page content if none found in mailto
            if not found_emails:
                emails_in_text = set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', body_text))
                # Filter out obvious fake emails or image names
                found_emails = {e for e in emails_in_text if not e.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')) and 'example' not in e.lower() and 'domain' not in e.lower() and 'email' not in e.lower()[:5]}
                
            if found_emails:
                results["emails"] = ", ".join(list(found_emails)[:2]) # Save up to 2 unique emails
                
            # 4. Check for Phone numbers (Fallback if Google Maps didn't have it)
            tel_links = page.locator("a[href^='tel:']").all()
            found_phones = set()
            for link in tel_links[:3]:
                try:
                    href = link.get_attribute("href")
                    if href:
                        phone = href.replace('tel:', '').strip()
                        found_phones.add(phone)
                except:
                    pass
                    
            if not found_phones:
                # Basic US/International phone regex looking for 10-11 digits with common delimiters
                phones_in_text = set(re.findall(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', body_text))
                found_phones = {p for p in phones_in_text if len(re.sub(r'\D', '', p)) >= 10}
                
            if found_phones:
                results["phone"] = list(found_phones)[0]
                
            # 5. Check for CMS footprints
            page_html = page.content().lower()
            
            if "wp-content" in page_html or "wp-includes" in page_html:
                results["cms_type"] = "WordPress"
            elif "squarespace" in page_html:
                results["cms_type"] = "Squarespace"
            elif "wix.com" in page_html or "wixsite" in page_html:
                results["cms_type"] = "Wix"
            elif "shopify" in page_html:
                results["cms_type"] = "Shopify"
            elif "weebly" in page_html:
                results["cms_type"] = "Weebly"
            elif "webflow" in page_html:
                results["cms_type"] = "Webflow"
            else:
                results["cms_type"] = "Custom / Unknown"

        except PlaywrightTimeoutError:
            results["error"] = "Timeout"
            results["load_time"] = 15.0
        except Exception as e:
            results["error"] = str(e)
            results["has_website"] = False # site didn't load properly at all
            
        finally:
            browser.close()
            
    return results

if __name__ == "__main__":
    import sys
    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://example.com"
    print(f"Auditing: {test_url}")
    print(audit_site(test_url))
