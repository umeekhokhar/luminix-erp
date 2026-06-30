
import os
import json
import re

from google import genai


PROMPT = """
You are an ERP invoice parser.

Return VALID JSON ONLY.

Schema:

{
  "vendor":"",
  "invoice_number":"",
  "invoice_date":"",
  "due_date":"",

  "customer":"",

  "subtotal":0,
  "tax":0,
  "total":0,

  "items":[
    {
      "product":"",
      "description":"",
      "quantity":0,
      "unit_price":0,
      "amount":0
    }
  ]
}

Rules:

- Fix OCR mistakes
- Convert currency to numbers
- Dates → YYYY-MM-DD
- Never explain
"""


def clean_json(text):

    text = re.sub(
        r"^```json",
        "",
        text
    )

    text = re.sub(
        r"```$",
        "",
        text
    )

    return text.strip()


def get_api_key():

    try:

        from django.conf import settings

        if hasattr(
            settings,
            "GEMINI_API_KEYS"
        ):
            return settings.GEMINI_API_KEYS[0]

    except Exception:
        pass

    key = os.getenv(
        "GEMINI_API_KEY"
    )

    if not key:

        raise Exception(
            "Missing GEMINI_API_KEY"
        )

    return key


def parse_invoice(text):

    client = genai.Client(
        api_key=get_api_key()
    )

    result = (
        client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                PROMPT,
                text
            ]
        )
    )

    cleaned = clean_json(
        result.text
    )

    return json.loads(
        cleaned
    )