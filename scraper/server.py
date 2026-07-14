"""
FastAPI wrapper around the existing CLI scraper.
Exposes a POST /jobs/scrape endpoint that the Next.js dashboard hits.
Runs scrape jobs in a background thread so the API returns immediately.
"""

import os
import sys
import threading
import time
import json
import traceback

# Set environment variable for Python UTF-8 mode
os.environ["PYTHONIOENCODING"] = "utf-8"

import requests
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from maps_scraper import scrape_google_maps
from site_auditor import audit_site

app = FastAPI(title="Flowrig Scraper API")


class ScrapeRequest(BaseModel):
    query: str
    max: int = 10
    max_reviews: Optional[int] = None
    agent: Optional[str] = None
    organizationId: Optional[str] = None
    niche: Optional[str] = None
    callback_url: str = "http://localhost:3000/api/leads"


# SECURITY: Read the shared secret that must match the dashboard's SCRAPER_API_SECRET.
SCRAPER_API_SECRET = os.environ.get("SCRAPER_API_SECRET", "dev-scraper-secret-replace-in-production")


def safe_print(msg):
    """Print with Unicode safety on Windows."""
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode('ascii', errors='replace').decode(), flush=True)


def run_scrape_job(job_dict: dict):
    """Background worker that scrapes and posts results back to the dashboard."""
    try:
        query = job_dict['query']
        max_results = job_dict['max']
        max_reviews = job_dict.get('max_reviews')
        agent = job_dict.get('agent')
        org_id = job_dict.get('organizationId')
        callback_url = job_dict.get('callback_url', 'http://localhost:3000/api/leads')

        safe_print(f"\n{'='*60}")
        safe_print(f"SCRAPE JOB STARTED: '{query}' (max={max_results})")
        safe_print(f"Agent: {agent} | Org: {org_id}")
        safe_print(f"{'='*60}\n")

        # Pre-fetch existing leads to prevent duplicates
        existing_names = set()
        try:
            res = requests.get(callback_url)
            if res.status_code == 200:
                existing_names = {l['name'] for l in res.json().get('data', [])}
                safe_print(f"Loaded {len(existing_names)} existing leads for dedup.")
        except Exception:
            safe_print("Could not pre-load existing leads for deduplication.")

        niche = job_dict.get('niche', 'WEBSITE_DESIGN')
        
        # Phase 1: Scrape Google Maps
        safe_print(f"\nPhase 1: Scraping Google Maps...")
        leads = scrape_google_maps(
            query,
            max_results=max_results,
            existing_names=existing_names,
            max_reviews=max_reviews
        )
        safe_print(f"Scraped {len(leads)} potential leads.")

        if not leads:
            safe_print("No new leads found. Job complete.")
            return

        # Phase 2: Audit each lead's website
        safe_print(f"\nPhase 2: Auditing {len(leads)} websites...")
        for idx, lead in enumerate(leads):
            safe_print(f"[{idx+1}/{len(leads)}] Auditing {lead['name']}...")

            website = lead.get('website')
            if not website:
                safe_print("  -> NO WEBSITE. Marking as HOT LEAD.")
                lead['audit_results'] = {
                    "has_website": False,
                    "load_time": None,
                    "mobile_friendly": False,
                    "has_booking": False,
                    "error": "No Website Listed"
                }
            else:
                if not website.startswith('http'):
                    website = 'https://' + website

                time.sleep(2)  # Throttle to avoid detection
                audit_result = audit_site(website)

                if niche in ('B2B_SALES', 'REAL_ESTATE'):
                    from enrichment import enrich_b2b_lead
                    b2b_data = enrich_b2b_lead(website)
                    audit_result['b2b_data'] = b2b_data
                    
                    if b2b_data.get('emails'):
                        hunter_emails_str = ", ".join([e['email'] for e in b2b_data['emails']])
                        if audit_result.get('emails'):
                            audit_result['emails'] = hunter_emails_str + ", " + audit_result['emails']
                        else:
                            audit_result['emails'] = hunter_emails_str

                lead['audit_results'] = audit_result

                if not lead.get('phone') and audit_result.get('phone'):
                    lead['phone'] = audit_result['phone']

                if audit_result.get("error"):
                    safe_print(f"  -> Audit Error: {audit_result['error']}")
                else:
                    safe_print(f"  -> Load: {audit_result.get('load_time')}s | Mobile: {audit_result.get('mobile_friendly')} | Booking: {audit_result.get('has_booking')}")

        # Phase 3: Post results back to the dashboard
        safe_print(f"\nPhase 3: Uploading {len(leads)} leads to {callback_url}...")
        for lead in leads:
            lead['category'] = query
            if agent:
                lead['agent'] = agent
            if org_id:
                lead['organizationId'] = org_id

        try:
            # SECURITY: Include the shared bearer token so the dashboard
            # accepts this callback. Without it, /api/leads returns 401.
            headers = {"Content-Type": "application/json"}
            if SCRAPER_API_SECRET:
                headers["Authorization"] = f"Bearer {SCRAPER_API_SECRET}"
            response = requests.post(callback_url, json=leads, headers=headers, timeout=30)
            safe_print(f"Upload response status: {response.status_code}")
            if response.status_code == 200:
                safe_print(f"Successfully uploaded {len(leads)} leads to Dashboard API!")
            else:
                safe_print(f"Upload failed: status {response.status_code}")
        except Exception as upload_err:
            safe_print(f"Upload request exception: {upload_err}")

        safe_print(f"\n{'='*60}")
        safe_print(f"SCRAPE JOB COMPLETE: {len(leads)} leads processed.")
        safe_print(f"{'='*60}\n")

    except Exception as e:
        safe_print(f"\nSCRAPE JOB FAILED: {e}")
        traceback.print_exc()


@app.post("/jobs/scrape")
async def create_scrape_job(job: ScrapeRequest):
    """Queue a scrape job in a background thread and return immediately."""
    job_dict = job.model_dump()
    t = threading.Thread(target=run_scrape_job, args=(job_dict,), daemon=True)
    t.start()
    return {
        "success": True,
        "message": f"Scrape job queued for '{job.query}' (max {job.max} results)."
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
