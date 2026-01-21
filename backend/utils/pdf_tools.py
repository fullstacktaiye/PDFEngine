import json
import pypdf
import fitz  # PyMuPDF

def extract_acroform_data(pdf_path):
    """
    Route 1: Checks if a PDF has AcroForm fields and extracts them.
    Returns a dictionary with field data if forms exist, or None if no fields are found.
    """
    try:
        reader = pypdf.PdfReader(pdf_path)
        fields = reader.get_fields()
        
        if not fields:
            return None
            
        extracted_data = {}
        for field_name, field_data in fields.items():
            # Extract relevant info. field_data is typically a DictionaryObject
            # We want the value at least.
            value = field_data.get('/V')
            
            # Handle IndirectObject resolution if necessary, though pypdf often handles it.
            # Convert values to simpler types if they are pypdf objects
            if isinstance(value, pypdf.generic.IndirectObject):
                value = value.get_object()
                
            # Clean up the value (handle ByteStringObject etc)
            if hasattr(value, "get_original_bytes"):
                value = value.get_original_bytes().decode("utf-8", errors="ignore")
                
            extracted_data[field_name] = value

        return extracted_data

    except Exception as e:
        print(f"Error processing AcroForms in {pdf_path}: {e}")
        return None

def extract_text_coordinates(pdf_path):
    """
    Route 2: Extracts raw text and coordinates from a PDF using PyMuPDF.
    Returns a list of pages, where each page contains a list of text blocks/words.
    """
    try:
        doc = fitz.open(pdf_path)
        result = {
            "page_count": len(doc),
            "pages": []
        }

        for page_num, page in enumerate(doc):
            page_data = {
                "page_number": page_num + 1,
                "width": page.rect.width,
                "height": page.rect.height,
                "text_and_coords": [] # List of text elements with bbox
            }
            
            # extract words: (x0, y0, x1, y1, "word", block_no, line_no, word_no)
            words = page.get_text("words")
            
            for w in words:
                x0, y0, x1, y1, text, block_no, line_no, word_no = w
                page_data["text_and_coords"].append({
                    "text": text,
                    "bbox": [x0, y0, x1, y1], # Absolute coordinates
                    # Callers might want percentages, which they can calc using page width/height
                })
            
            result["pages"].append(page_data)
            
        return result

    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return {}

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_tools.py <path_to_pdf>")
        sys.exit(1)
        
    path = sys.argv[1]
    
    print(f"--- Processing {path} ---")
    
    # Route 1
    print("\n[Route 1] Checking for AcroForms...")
    form_data = extract_acroform_data(path)
    if form_data:
        print("Found Form Fields:")
        print(json.dumps(form_data, indent=2))
    else:
        print("No AcroForm fields detected.")
        
    # Route 2
    print("\n[Route 2] Extracting Text & Coordinates (First 5 words of Page 1)...")
    text_data = extract_text_coordinates(path)
    if text_data["pages"]:
        page1 = text_data["pages"][0]
        print(f"Page 1 Dimensions: {page1['width']}x{page1['height']}")
        print("Sample words:", json.dumps(page1["text_and_coords"][:5], indent=2))
