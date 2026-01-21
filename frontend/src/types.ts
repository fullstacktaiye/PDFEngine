export type FieldType = 'text' | 'checkbox' | 'date' | 'signature';

export interface PDFField {
    id: string;
    type: FieldType;
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    width: number; // Percentage 0-100
    height: number; // Percentage 0-100
    value?: string | boolean;
    page: number;
    name?: string; // AcroField name or "Field 1"
    required?: boolean;
}

export interface AnalysisResult {
    file_name: string;
    acroform_fields?: Record<string, string | null> | null;
    interactive_fields?: Array<{
        page_number: number;
        name: string;
        value: string;
        bbox: [number, number, number, number]; // [x0, y0, x1, y1]
        type: string;
    }>;
    text_content?: {
        page_count: number;
        pages: Array<{
            page_number: number;
            width: number;
            height: number;
            text_and_coords: Array<{
                text: string;
                bbox: [number, number, number, number];
                is_list_marker: boolean;
            }>;
        }>;
    };
    visual_elements?: Array<{
        page_number: number;
        lines: number[][]; // [x0, y0, x1, y1]
        boxes: number[][]; // [x0, y0, x1, y1]
    }>;
    tables?: Array<{
        page_number: number;
        bbox: number[];
        row_count: number;
        col_count: number;
    }>;
}
