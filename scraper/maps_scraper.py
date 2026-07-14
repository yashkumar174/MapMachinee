import time
import json
import random
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

def scrape_google_maps(query: str, max_results: int = 10, existing_names: set = None, max_reviews: int = None) -> list:
    """
    Scrapes Google Maps for the given query and returns a list of dictionaries containing business details.
    """
    if existing_names is None:
        existing_names = set()
    
    # Track seen phone numbers within this scrape session to prevent
    # the same business from being collected twice with a different name.
    seen_phones = set()
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True) # Changed to True for cloud server deployment
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        
        print(f"Navigating to Google Maps and searching for: {query}")
        page.goto("https://www.google.com/maps")
        
        # Accept cookies if the popup appears (EU region etc)
        try:
            page.locator("button:has-text('Accept all')").click(timeout=3000)
            time.sleep(1)
        except:
            pass
            
        # Search
        try:
            search_box = page.locator('input.UGojuc')
            search_box.fill(query)
            search_box.press("Enter")
            time.sleep(5) # Wait for initial results to load
        except Exception as e:
            print(f"Error searching: {e}")
            browser.close()
            return []

        print("Scrolling and extracting to find exactly", max_results, "leads...")
        
        # Scroll the result pane
        feed_selector = 'div[role="feed"]'
        
        try:
            page.wait_for_selector(feed_selector, timeout=10000)
        except Exception as e:
            print(f"Error waiting for feed: {e}")

        new_leads_found = 0
        processed_index = 0
        consecutive_scroll_fails = 0
        
        while new_leads_found < max_results and consecutive_scroll_fails < 5:
            articles = page.locator('a.hfpxzc').all()
            
            if processed_index >= len(articles):
                # We need to scroll to load more
                try:
                    page.evaluate(f'''
                        let feed = document.querySelector('{feed_selector}');
                        if (feed) {{ feed.scrollTo(0, feed.scrollHeight); }}
                    ''')
                    time.sleep(random.uniform(2.0, 3.5))
                    new_articles = page.locator('a.hfpxzc').all()
                    if len(new_articles) == len(articles):
                        consecutive_scroll_fails += 1
                    else:
                        consecutive_scroll_fails = 0
                except Exception as e:
                    print(f"Error scrolling feed: {e}")
                    consecutive_scroll_fails += 1
                continue
                
            article_locator = articles[processed_index]
            processed_index += 1
                
            try:
                # Early bypass using aria-label directly from feed
                feed_name = article_locator.get_attribute("aria-label")
                if feed_name and feed_name in existing_names:
                    print(f"Skipped {feed_name} [Already in Database]")
                    continue

                # Click on the article to load details pane
                article_locator.click()
                time.sleep(random.uniform(1.5, 2.5)) # Be polite
                
                # Wait for the correctly opened detail pane
                try:
                    # Google Maps opens the detail pane with an aria-label matching the business name
                    # Using wait_for_selector escapes characters if needed so we use locator strategy
                    detail_pane = page.locator(f'div[role="main"][aria-label="{name}"]')
                    detail_pane.wait_for(state="attached", timeout=3000)
                    detail_html = detail_pane.inner_html()
                except Exception:
                    try:
                        # Fallback to the very last role="main" container on the page
                        detail_html = page.locator('div[role="main"]').last.inner_html()
                    except Exception:
                        detail_html = page.content()
                    
                detail_soup = BeautifulSoup(detail_html, "html.parser")
                
                # Extract the exact Business Name
                name = article_locator.get_attribute("aria-label")
                if not name:
                    name = "Unknown"
                
                maps_url = article_locator.get_attribute("href")
                
                rating_str = ""
                phones = []
                website = None
                
                # Extract rating from the detail pane's F7nice element (scoped to current business)
                try:
                    import re
                    rating_el = page.locator('div[role="main"] div.F7nice').first
                    rating_text = rating_el.inner_text(timeout=2000)  # e.g. "4.3\n(500)" or "4.6\n(2,857)"
                    nums = re.findall(r'[\d\.,]+', rating_text)
                    if len(nums) >= 2:
                        rating_str = f"{nums[0]} stars {nums[1]} reviews"
                except:
                    pass
                
                # Search for buttons or elements indicating website or phone
                all_buttons = detail_soup.find_all(attrs={"aria-label": True})
                for btn in all_buttons:
                    label = str(btn.get("aria-label", "")).lower()
                                
                    if "phone" in label or label.startswith("call"):
                        # Sometimes the aria-label itself contains the phone number: "Call 096114 94141"
                        if label.startswith("call "):
                            potential_phone = btn.get("aria-label").replace("Call ", "").replace("call ", "").strip()
                            if any(c.isdigit() for c in potential_phone):
                                phones.append(potential_phone)
                        
                        # Extract the phone if present in child divs
                        divs = btn.find_all("div")
                        for d in divs:
                            if d.text and any(c.isdigit() for c in d.text) and d.text not in phones:
                                phones.append(d.text)
                                
                    if "website" in label:
                        # Attempt to find the link
                        a_tag = btn if btn.name == "a" else btn.find_parent("a")
                        if not a_tag:
                            a_tag = btn.find("a")
                        if a_tag and a_tag.has_attr("href"):
                            website = a_tag["href"]
                            if website.startswith("https://www.google.com/url?q="):
                                website = website.split("q=")[1].split("&")[0]

                # Threshold filtering
                if max_reviews is not None and rating_str:
                    try:
                        import re
                        reviews_match = re.search(r'([\d,]+)\s*review', rating_str, re.IGNORECASE)
                        if reviews_match:
                            rev_count = int(reviews_match.group(1).replace(',', ''))
                            if rev_count > max_reviews:
                                print(f"Skipping {name} - Too highly reviewed ({rev_count} > {max_reviews})")
                                continue # Skip this lead!
                    except Exception as e:
                        pass
                        
                # Contactability Filter
                if not phones and not website:
                    print(f"Skipping {name} - Uncontactable (No phone or website)")
                    continue

                # Phone-based dedup: skip if we already scraped a lead with this phone
                primary_phone = phones[0] if phones else None
                if primary_phone:
                    # Normalize phone: strip spaces, dashes, parens for comparison
                    normalized = ''.join(c for c in primary_phone if c.isdigit())
                    if normalized and normalized in seen_phones:
                        print(f"Skipping {name} - Duplicate phone number ({primary_phone})")
                        continue
                    if normalized:
                        seen_phones.add(normalized)
                        
                lead = {
                    "name": name,
                    "phone": primary_phone,
                    "website": website,
                    "rating": rating_str,
                    "maps_url": maps_url
                }
                
                print(f"Extraction Successful: {name}")
                results.append(lead)
                existing_names.add(name) # Prevent duplicates across this exact session run
                new_leads_found += 1
                
            except Exception as e:
                print(f"Error parsing a listing: {e}")
                
        browser.close()
        
    return results

if __name__ == "__main__":
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "Gym in Miami"
    leads = scrape_google_maps(query, max_results=3)
    
    with open("leads.json", "w") as f:
        json.dump(leads, f, indent=2)
        
    print(f"Saved {len(leads)} leads to leads.json")
