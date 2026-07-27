from rapidocr_onnxruntime import RapidOCR
from PIL import Image
import numpy as np
import fitz
from streamlit import image
import logging
import traceback


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

                pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))

                image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                image.thumbnail((1800, 1800))          # resize first
                image_array = np.array(image)          # then convert

                result, _ = ocr_engine(image_array)

                if result:

                    page_text = "\n".join(
                        line[1]
                        for line in result
                    )

                    pages_text.append(
                        page_text
                    )

            return "\n\n".join(
                pages_text
            )

        # IMAGE
        image = Image.open(
            uploaded_file
        ).convert("RGB")

        image_array = np.array(image)

        result, _ = ocr_engine(
            image_array
        )

        if not result:
            return ""

        return "\n".join(
            line[1]
            for line in result
        )

    except Exception as e:
        logger.error("OCR extraction failed:\n%s", traceback.format_exc())
        raise