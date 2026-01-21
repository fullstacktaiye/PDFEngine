import json
import re
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
                
                # Check for list pattern (a., b., c., etc.)
                is_list_marker = bool(re.match(r'^[a-d]\.$', text, re.IGNORECASE))
                
                page_data["text_and_coords"].append({
                    "text": text,
                    "bbox": [x0, y0, x1, y1], # Absolute coordinates
                    "is_list_marker": is_list_marker
                })
            
            result["pages"].append(page_data)
            
        return result

    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return {}

def extract_visual_elements(pdf_path):
    """
    Detects visual elements like underlines (potential text inputs) and boxes.
    """
    try:
        doc = fitz.open(pdf_path)
        visuals = []

        for page_num, page in enumerate(doc):
            drawings = page.get_drawings()
            page_visuals = {
                "page_number": page_num + 1,
                "lines": [],
                "boxes": []
            }
            
            for shape in drawings:
                rect = shape["rect"]
                width = rect.width
                height = rect.height
                
                # Heuristics
                # Line: very short height, decent width
                if height < 5 and width > 20:
                    page_visuals["lines"].append(list(rect))
                
                # Box: decent height and width (e.g. for checkboxes or larger text areas)
                elif height > 8 and width > 8:
                    # Filter out whole page borders if necessary
                    if width < page.rect.width * 0.9:
                        page_visuals["boxes"].append(list(rect))
            
            visuals.append(page_visuals)
            
        return visuals

    except Exception as e:
        print(f"Error extracting visual elements from {pdf_path}: {e}")
        return []

def extract_tables(pdf_path):
    """
    Uses PyMuPDF's table detection to find grid structures.
    """
    try:
        doc = fitz.open(pdf_path)
        tables_data = []

        for page_num, page in enumerate(doc):
            tabs = page.find_tables()
            if tabs.tables:
                for table in tabs:
                    tables_data.append({
                        "page_number": page_num + 1,
                        "bbox": list(table.bbox),
                        "row_count": table.row_count,
                        "col_count": table.col_count,
                        # "content": table.extract() # Optional: Extract cell content
                    })
        
        return tables_data

    except Exception as e:
        print(f"Error extracting tables from {pdf_path}: {e}")
        return []

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
        print("Sample words (looking for list markers):", json.dumps(page1["text_and_coords"][:5], indent=2))
        
    # Visual Elements
    print("\n[Visual Elements] Detecting underlines and boxes...")
    visuals = extract_visual_elements(path)
    if visuals:
        v_page1 = visuals[0]
        print(f"Page 1 Lines: {len(v_page1['lines'])}, Boxes: {len(v_page1['boxes'])}")
        
    # Tables
    print("\n[Tables] Detecting table structures...")
    tables = extract_tables(path)
    if tables:
        print(f"Found {len(tables)} tables.")
        print(json.dumps(tables, indent=2))
    else:
        print("No tables detected.")
