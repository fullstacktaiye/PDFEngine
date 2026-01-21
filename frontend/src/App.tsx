import { useState } from 'react';
import './App.css';
import PDFViewer from './components/PDFViewer';
import type { PDFField, AnalysisResult } from './types';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<PDFField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Transform API analysis result into draggable fields
  const mapAnalysisToFields = (analysis: AnalysisResult): PDFField[] => {
    const newFields: PDFField[] = [];
    let fieldCounter = 1;

    // Map Interactive Fields (AcroForms)
    if (analysis.interactive_fields) {
      analysis.interactive_fields.forEach(field => {
        const pageNum = field.page_number;
        const pageMeta = analysis.text_content?.pages.find(p => p.page_number === pageNum);
        const pageWidth = pageMeta?.width || 612;
        const pageHeight = pageMeta?.height || 792;

        const [x0, y0, x1, y1] = field.bbox;
        const width = x1 - x0;
        const height = y1 - y0;

        let type: 'text' | 'checkbox' = 'text';
        if (field.type === 'Btn') type = 'checkbox'; // Simplified mapping

        newFields.push({
          id: `acro-${fieldCounter++}`,
          type: type,
          x: (x0 / pageWidth) * 100,
          y: (y0 / pageHeight) * 100,
          width: (width / pageWidth) * 100,
          height: (height / pageHeight) * 100,
          page: pageNum,
          name: field.name || `Field ${fieldCounter}`,
          value: field.value || ''
        });
      });
    }

    // Map Visual Boxes (e.g. input boxes)
    if (analysis.visual_elements) {
      analysis.visual_elements.forEach(pageData => {
        const pageNum = pageData.page_number;
        // Find page dimensions to calculate percentages
        const pageMeta = analysis.text_content?.pages.find(p => p.page_number === pageNum);
        const pageWidth = pageMeta?.width || 612; // Default fallback
        const pageHeight = pageMeta?.height || 792;

        pageData.boxes.forEach(box => {
          const [x0, y0, x1, y1] = box;
          const width = x1 - x0;
          const height = y1 - y0;

          newFields.push({
            id: `box-${fieldCounter++}`,
            type: 'text', // Default to text input
            x: (x0 / pageWidth) * 100,
            y: (y0 / pageHeight) * 100,
            width: (width / pageWidth) * 100,
            height: (height / pageHeight) * 100,
            page: pageNum,
            name: `Field ${fieldCounter}`,
            value: ''
          });
        });

        // Map Visual Lines (e.g. underlines) -> Create input field above/on the line
        pageData.lines.forEach(line => {
          const [x0, y0, x1] = line;
          const width = x1 - x0;
          // Heuristic: make the height reasonable for an input (e.g. 15-20px equivalent height)
          // But in PDF coords, maybe 12-14 points.
          const height = 14;
          // Position 'y' slightly up so the text sits on the line
          const adjustedY = y0 - height + 2;

          newFields.push({
            id: `line-${fieldCounter++}`,
            type: 'text',
            x: (x0 / pageWidth) * 100,
            y: (adjustedY / pageHeight) * 100,
            width: (width / pageWidth) * 100,
            height: (height / pageHeight) * 100,
            page: pageNum,
            name: `Field ${fieldCounter}`,
            value: ''
          });
        });
      });
    }

    return newFields;
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files[0]) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setFields([]); // Reset
      setIsAnalyzing(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('http://127.0.0.1:8000/api/analyze-pdf/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.statusText}`);
        }

        const data: AnalysisResult = await response.json();
        console.log('Analysis Result:', data);

        const mappedFields = mapAnalysisToFields(data);
        setFields(mappedFields);

      } catch (error) {
        console.error('Error analyzing PDF:', error);
        alert('Failed to analyze PDF. Check console for details.');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const onFieldUpdate = (id: string, updates: Partial<PDFField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const onFieldSelect = (id: string) => {
    setSelectedFieldId(id);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>PDF Engine Viewer</h1>

        <div className="upload-section">
          <label htmlFor="file-upload" className="custom-file-upload">
            {isAnalyzing ? 'Analyzing...' : 'Select PDF Document'}
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              disabled={isAnalyzing}
            />
          </label>
          {file && <span className="file-name">{file.name}</span>}
        </div>
      </header>

      <main className="app-main">
        <div className="workspace">
          <div className="sidebar">
            <h3>Properties</h3>
            {selectedFieldId ? (
              <div className="properties-panel">
                <p><strong>ID:</strong> {selectedFieldId}</p>
                {(() => {
                  const field = fields.find(f => f.id === selectedFieldId);
                  if (!field) return null;
                  return (
                    <>
                      <div className="prop-row">
                        <label>Name</label>
                        <input
                          type="text"
                          value={field.name || ''}
                          onChange={(e) => onFieldUpdate(field.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="prop-row">
                        <label>Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => onFieldUpdate(field.id, { type: e.target.value as import('./types').FieldType })}
                        >
                          <option value="text">Text</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="date">Date</option>
                          <option value="signature">Signature</option>
                        </select>
                      </div>
                      {/* Add more properties here */}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="empty-state">Select a field to edit properties</p>
            )}

            <div className="field-list">
              <h4>Detected Fields ({fields.length})</h4>
              <ul>
                {fields.map(f => (
                  <li
                    key={f.id}
                    className={f.id === selectedFieldId ? 'active' : ''}
                    onClick={() => onFieldSelect(f.id)}
                  >
                    {f.name || f.id}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="viewer-area">
            <PDFViewer
              file={file}
              fields={fields}
              onFieldUpdate={onFieldUpdate}
              onFieldSelect={onFieldSelect}
              selectedFieldId={selectedFieldId}
              onPageChange={() => { }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
