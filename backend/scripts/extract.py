import os
import fitz  # pip install pymupdf

def extract_images_from_pdf(pdf_path: str, out_dir: str = "extracted_images") -> int:
    os.makedirs(out_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    saved = 0

    for page_index in range(len(doc)):
        page = doc[page_index]
        images = page.get_images(full=True)

        for img_index, img in enumerate(images, start=1):
            xref = img[0]
            pix = None
            try:
                pix = fitz.Pixmap(doc, xref)

                # If image is CMYK or has alpha, convert to RGB for safer saving
                if pix.n >= 5:
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                ext = "png"  # we will save as png consistently
                out_path = os.path.join(out_dir, f"page_{page_index+1:04d}_img_{img_index:03d}.{ext}")
                pix.save(out_path)
                saved += 1
            finally:
                if pix is not None:
                    pix = None  # allow GC

    doc.close()
    return saved

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract all images from a PDF.")
    parser.add_argument("pdf", help="Path to input PDF file")
    parser.add_argument("--out", default="extracted_images", help="Output directory")
    args = parser.parse_args()

    n = extract_images_from_pdf(args.pdf, args.out)
    print(f"Done. Extracted {n} images into: {args.out}")
