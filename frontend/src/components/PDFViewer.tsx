import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import DraggableField from './DraggableField';
import type { PDFField } from '../types';

import './PDFViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFViewerProps {
  file: File | string | null;
  fields: PDFField[];
  onFieldUpdate: (id: string, updates: Partial<PDFField>) => void;
  onFieldSelect: (id: string) => void;
  selectedFieldId?: string;
  onPageChange: (page: number) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  fields,
  onFieldUpdate,
  onFieldSelect,
  selectedFieldId,
  onPageChange
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [error, setError] = useState<Error | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Update dimensions when overlay resizes
  useEffect(() => {
    if (!overlayRef.current) return;

    // Initial measure
    setPageWidth(overlayRef.current.offsetWidth);
    setPageHeight(overlayRef.current.offsetHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPageWidth(entry.contentRect.width);
        setPageHeight(entry.contentRect.height);
      }
    });

    observer.observe(overlayRef.current);
    return () => observer.disconnect();
  }, [pageNumber, file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    onPageChange(1);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error('Error loading PDF:', err);
    setError(err);
  }

  function changePage(offset: number) {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset;
      onPageChange(newPage);
      return newPage;
    });
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  // Filter fields for current page
  const currentFields = fields.filter(f => f.page === pageNumber);

  if (!file) {
    return (
      <div className="pdf-viewer-placeholder">
        <p>Please select a PDF file to view.</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container">
      {error && (
        <div className="pdf-error">
          <p>Failed to load PDF: {error.message}</p>
        </div>
      )}

      <div className="pdf-document-wrapper">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          className="pdf-document"
        >
          <Page
            pageNumber={pageNumber}
            className="pdf-page"
            renderAnnotationLayer={true}
            renderTextLayer={true}
            canvasBackground="#ffffff"
            width={800}
          >
            <div className="pdf-page-overlay" ref={overlayRef}>
              {pageWidth > 0 && currentFields.map(field => (
                <DraggableField
                  key={field.id}
                  field={field}
                  containerWidth={pageWidth}
                  containerHeight={pageHeight}
                  onUpdate={onFieldUpdate}
                  onSelect={onFieldSelect}
                  isSelected={field.id === selectedFieldId}
                />
              ))}
            </div>
          </Page>
        </Document>
      </div>

      {numPages && (
        <div className="pdf-controls">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
            className="control-button"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {pageNumber} of {numPages}
          </span>
          <button
            type="button"
            disabled={pageNumber >= numPages}
            onClick={nextPage}
            className="control-button"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
