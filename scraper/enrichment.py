import os
import requests
from dotenv import load_dotenv

load_dotenv('../dashboard/.env')

APOLLO_API_KEY = os.environ.get("APOLLO_API_KEY")
HUNTER_API_KEY = os.environ.get("HUNTER_API_KEY")

def enrich_b2b_lead(domain: str) -> dict:
    """Uses Apollo.io and Hunter.io to enrich the domain data."""
    enrichment = {
        "linkedin_url": None,
        "employee_count": None,
        "industry": None,
        "emails": [],
        "apollo_found": False,
        "hunter_found": False
    }
    
    if not domain:
        return enrichment
        
    # Standardize domain
    clean_domain = domain.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
    
    # 1. Apollo.io Organization Search
    if APOLLO_API_KEY:
        try:
            headers = {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            }
            payload = {
                "api_key": APOLLO_API_KEY,
                "q_organization_domains": clean_domain
            }
            res = requests.post("https://api.apollo.io/v1/organizations/search", headers=headers, json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get('organizations') and len(data['organizations']) > 0:
                    org = data['organizations'][0]
                    enrichment["apollo_found"] = True
                    enrichment["linkedin_url"] = org.get('linkedin_url')
                    enrichment["employee_count"] = org.get('estimated_num_employees')
                    enrichment["industry"] = org.get('industry')
        except Exception as e:
            print(f"Apollo API error: {e}")
            
    # 2. Hunter.io Domain Search for emails
    if HUNTER_API_KEY:
        try:
            res = requests.get(f"https://api.hunter.io/v2/domain-search?domain={clean_domain}&api_key={HUNTER_API_KEY}", timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get('data') and data['data'].get('emails'):
                    enrichment["hunter_found"] = True
                    emails = data['data']['emails']
                    # Get top 3 emails
                    for email_obj in emails[:3]:
                        enrichment["emails"].append({
                            "email": email_obj.get("value"),
                            "type": email_obj.get("type"),
                            "confidence": email_obj.get("confidence")
                        })
        except Exception as e:
            print(f"Hunter API error: {e}")
            
    return enrichment
