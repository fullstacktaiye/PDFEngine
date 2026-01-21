import os
import tempfile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from utils.pdf_tools import (
    extract_acroform_data,
    extract_text_coordinates,
    extract_visual_elements,
    extract_tables,
    extract_interactive_fields
)

class PDFAnalysisView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.data.get('file')
        
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # Save to a temporary file because PyMuPDF/fitz works best with file paths for some operations
        # and our utils are designed for file paths.
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
                for chunk in file_obj.chunks():
                    temp_pdf.write(chunk)
                temp_pdf_path = temp_pdf.name
        except Exception as e:
            return Response({"error": f"Failed to save file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Route 1: AcroForm Detection
            acroform_data = extract_acroform_data(temp_pdf_path)
            
            # Interactive Fields (Widgets with coordinates)
            interactive_fields = extract_interactive_fields(temp_pdf_path)
            
            # Route 2: Text & Coordinates
            text_data = extract_text_coordinates(temp_pdf_path)
            
            # Visual Elements
            visual_elements = extract_visual_elements(temp_pdf_path)
            
            # Tables
            tables = extract_tables(temp_pdf_path)
            
            response_data = {
                "file_name": file_obj.name,
                "acroform_fields": acroform_data,
                "interactive_fields": interactive_fields,
                "text_content": text_data,
                "visual_elements": visual_elements,
                "tables": tables,
                "analysis_summary": {
                    "has_acroform": bool(acroform_data),
                    "interactive_field_count": len(interactive_fields),
                    "page_count": text_data.get("page_count", 0) if text_data else 0,
                    "table_count": len(tables) if tables else 0
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Processing error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
