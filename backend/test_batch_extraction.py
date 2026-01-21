import os
import json
import sys
# Add backend to sys.path to import utils
sys.path.append(os.path.join(os.path.dirname(__file__)))

from utils.pdf_tools import (
    extract_acroform_data,
    extract_text_coordinates,
    extract_visual_elements,
    extract_tables
)

TEST_DOCS_DIR = os.path.abspath("../test_docs")

def test_file(filename):
    pdf_path = os.path.join(TEST_DOCS_DIR, filename)
    print(f"\n{'='*60}")
    print(f"TESTING: {filename}")
    print(f"{'='*60}")
    
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return

    # 1. AcroForms
    acro = extract_acroform_data(pdf_path)
    print(f"\n[AcroForm]: Detected? {'YES' if acro else 'NO'}")
    if acro:
        print(f"  Field Count: {len(acro)}")
        # Print first 5 keys
        print(f"  Sample Fields: {list(acro.keys())[:5]}")

    # 2. Text & List Detection
    text_data = extract_text_coordinates(pdf_path)
    page1 = text_data["pages"][0] if text_data.get("pages") else None
    
    if page1:
        print(f"\n[Text Extraction]: Page 1 size {page1['width']}x{page1['height']}")
        list_markers = [w['text'] for w in page1['text_and_coords'] if w.get('is_list_marker')]
        print(f"  List Markers Detected: {len(list_markers)}")
        if list_markers:
            print(f"  Samples: {list_markers[:10]}")
    
    # 3. Visual Elements
    visuals = extract_visual_elements(pdf_path)
    v_page1 = visuals[0] if visuals else None
    if v_page1:
        print(f"\n[Visual Elements]: Page 1")
        print(f"  Lines (Underlines): {len(v_page1['lines'])}")
        print(f"  Boxes (Inputs):     {len(v_page1['boxes'])}")

    # 4. Tables
    tables = extract_tables(pdf_path)
    print(f"\n[Tables]: Detected? {'YES' if tables else 'NO'}")
    if tables:
        print(f"  Tables Found: {len(tables)}")
        for i, t in enumerate(tables):
            print(f"    Table {i+1}: {t['row_count']} rows x {t['col_count']} cols (Page {t['page_number']})")

def main():
    files = [f for f in os.listdir(TEST_DOCS_DIR) if f.lower().endswith('.pdf')]
    files.sort()
    
    for f in files:
        test_file(f)

if __name__ == "__main__":
    main()
