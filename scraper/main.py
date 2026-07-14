import time
import json
import argparse
from maps_scraper import scrape_google_maps
from site_auditor import audit_site

def main():
    parser = argparse.ArgumentParser(description="Hyper-Local Lead Engine - Core Scraper")
    parser.add_argument("--query", type=str, required=True, help="Search query for Google Maps, e.g., 'Bakery in Austin'")
    parser.add_argument("--max", type=int, default=5, help="Maximum number of leads to extract (for testing)")
    parser.add_argument("--max-reviews", type=int, default=None, help="Maximum number of reviews allowed for a business to be considered a lead")
    parser.add_argument("--agent", type=str, default=None, help="The active dashboard user requesting this scrape, for analytics routing", required=False)
    args = parser.parse_args()

    print(f"--- Starting Lead Generation for: '{args.query}' by {args.agent or 'System'} ---")
    import os
    port = os.environ.get("PORT", "3000")
    api_url = f"http://localhost:{port}/api/leads"
    
    # Pre-fetch existing leads from Next.js to prevent duplicated audits
    existing_names = set()
    try:
        import requests
        res = requests.get(api_url)
        if res.status_code == 200:
            existing_names = {l['name'] for l in res.json().get('data', [])}
            print(f"Loaded {len(existing_names)} existing leads to prevent duplication.")
    except Exception as e:
        print("Could not pre-load database for deduplication.")
        
    # Step 1: Scrape Maps
    print(f"\nPhase 1: Scraping Google Maps for NEW LEADS only (Max Reviews: {args.max_reviews if args.max_reviews else 'Unlimited'})...")
    leads = scrape_google_maps(args.query, max_results=args.max, existing_names=existing_names, max_reviews=args.max_reviews)
    print(f"Scraped {len(leads)} massive potential leads.")

    if not leads:
        print("\nCould not find any new leads on Google Maps matching that query! Aborting.")
        return

    # Step 2: Audit Leads
    print(f"\nPhase 2: Auditing {len(leads)} New Websites...")
    for idx, lead in enumerate(leads):
        print(f"\n[{idx+1}/{len(leads)}] Auditing {lead['name']}...")
        
        website = lead.get('website')
        if not website:
            print("  -> NO WEBSITE DETECTED. Marking as HOT LEAD.")
            lead['audit_results'] = {
                "has_website": False,
                "load_time": None,
                "mobile_friendly": False,
                "has_booking": False,
                "error": "No Website Listed"
            }
        else:
            print(f"  -> Website found: {website}. Running Playwright Auditor...")
            # We add a pause between audits to look like human traffic
            time.sleep(2)
            
            # Format url correctly
            if not website.startswith('http'):
                website = 'https://' + website
                
            audit_result = audit_site(website)
            lead['audit_results'] = audit_result
            
            # Apply phone number fallback if Google Maps missed it
            if not lead.get('phone') and audit_result.get('phone'):
                lead['phone'] = audit_result['phone']
                print(f"  -> Extracted missing phone from website: {lead['phone']}")
            
            if audit_result.get("error"):
                print(f"  -> Audit Error: {audit_result['error']}")
            else:
                print(f"  -> Load Time: {audit_result['load_time']}s | Mobile-Friendly: {audit_result['mobile_friendly']} | Booking: {audit_result['has_booking']}")

    # Save Results
    output_filename = "hyper_local_leads.json"
    with open(output_filename, "w", encoding='utf-8') as f:
         json.dump(leads, f, indent=4)
         
    print(f"\n--- Process Complete! ---")
    print(f"Saved {len(leads)} leads with audit data to {output_filename}")
    
    # Send to Next.js API
    api_url = f"http://localhost:{port}/api/leads"
    print(f"Uploading leads to {api_url}...")
    try:
        import requests
        # Tag each lead with the search query as its category and assign the agent id
        for lead in leads:
            lead['category'] = args.query
            if args.agent:
                lead['agent'] = args.agent
        response = requests.post(api_url, json=leads)
        if response.status_code == 200:
            print("Successfully uploaded to Dashboard API.")
        else:
            print(f"Failed to upload: {response.text}")
    except Exception as e:
        print(f"Could not connect to Dashboard API. Is Next.js running? Error: {e}")


if __name__ == "__main__":
    main()
