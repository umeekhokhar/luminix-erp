from inventory.ocr.extractor import (
    extract_text
)

from inventory.ocr.parser import (
    parse_invoice
)

from inventory.ocr.matcher import (
    build_purchase_payload
)


def process_purchase_invoice(
    uploaded_file
):

    raw = extract_text(
        uploaded_file
    )

    parsed = parse_invoice(
        raw
    )

    payload = (
        build_purchase_payload(
            parsed
        )
    )

    payload[
        "raw_text"
    ] = raw

    payload[
        "parsed"
    ] = parsed

    return payload