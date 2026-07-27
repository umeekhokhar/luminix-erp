import gc
import logging
import traceback

import fitz
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR


ocr_engine = RapidOCR(
    rec_batch_num=1,
    intra_op_num_threads=1,
    inter_op_num_threads=1,
)

logger = logging.getLogger(__name__)


def extract_text(uploaded_file):
    """
    Supports:
    - jpg
    - png
    - jpeg
    - pdf

    Returns plain extracted text.
    """

    try:

        # PDF
        if uploaded_file.name.lower().endswith(".pdf"):

            pdf = fitz.open(
                stream=uploaded_file.read(),
                filetype="pdf"
            )

            pages_text = []

            for page in pdf:

                # Lower zoom = cheaper render + smaller peak memory.
                # Bump back to 1.5 only if OCR accuracy suffers on real documents.
                pix = page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2))

                image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                image.thumbnail((1600, 1600))   # resize first
                image_array = np.array(image)   # then convert

                result, _ = ocr_engine(image_array)

                if result:
                    page_text = "\n".join(
                        line[1]
                        for line in result
                    )
                    pages_text.append(page_text)

                # Explicitly free per-page memory before moving to next page.
                # Matters a lot on small Railway memory tiers with multi-page PDFs.
                del pix, image, image_array, result
                gc.collect()

            pdf.close()

            return "\n\n".join(pages_text)

        # IMAGE
        image = Image.open(uploaded_file).convert("RGB")
        image.thumbnail((1600, 1600))
        image_array = np.array(image)

        result, _ = ocr_engine(image_array)

        if not result:
            return ""

        return "\n".join(
            line[1]
            for line in result
        )

    except Exception:
        logger.error("OCR extraction failed:\n%s", traceback.format_exc())
        raise