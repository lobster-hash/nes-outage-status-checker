"""
NES Outage Data Archiver
Lambda function to fetch NES outage data and save to S3 every 10 minutes.

Setup:
1. Create S3 bucket (e.g., nes-outage-archive)
2. Create Lambda function with Python 3.11+ runtime
3. Set environment variable: BUCKET_NAME=your-bucket-name
4. Attach IAM policy allowing s3:PutObject on your bucket
5. Create EventBridge rule: rate(10 minutes) -> trigger this Lambda
"""

import json
import os
import urllib.request
from datetime import datetime

import boto3

API_URL = "https://utilisocial.io/datacapable/v2/p/NES/map/events"
BUCKET_NAME = os.environ.get("BUCKET_NAME", "nes-outage-archive")


def lambda_handler(event, context):
    """Fetch NES outage data and save to S3."""

    # Fetch data from API
    try:
        req = urllib.request.Request(API_URL, headers={"User-Agent": "NES-Archiver/1.0"})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching API: {e}")
        raise

    # Generate filename with timestamp
    now = datetime.utcnow()
    filename = now.strftime("%Y/%m/%d/%H%M.json")

    # Add metadata
    archive_data = {
        "timestamp": now.isoformat() + "Z",
        "event_count": len(data),
        "events": data
    }

    # Save to S3
    s3 = boto3.client("s3")
    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=filename,
            Body=json.dumps(archive_data, indent=2),
            ContentType="application/json"
        )
        print(f"Saved {len(data)} events to s3://{BUCKET_NAME}/{filename}")
    except Exception as e:
        print(f"Error saving to S3: {e}")
        raise

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": f"Archived {len(data)} events",
            "file": f"s3://{BUCKET_NAME}/{filename}"
        })
    }


# For local testing
if __name__ == "__main__":
    result = lambda_handler({}, None)
    print(result)
