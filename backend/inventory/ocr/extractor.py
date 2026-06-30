from rapidocr_onnxruntime import RapidOCR
from PIL import Image
import fitz


ocr_engine = RapidOCR()


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

                pix = page.get_pixmap()

                image = Image.frombytes(
                    "RGB",
                    [pix.width, pix.height],
                    pix.samples
                )

                result, _ = ocr_engine(image)

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
        )

        result, _ = ocr_engine(
            image
        )

        if not result:
            return ""

        return "\n".join(
            line[1]
            for line in result
        )

    except Exception as e:

        raise Exception(
            f"OCR extraction failed: {str(e)}"
        )
