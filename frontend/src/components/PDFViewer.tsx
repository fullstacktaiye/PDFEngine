import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Import the worker using Vite's ?url suffix for proper asset handling
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import './PDFViewer.css';

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFViewerProps {
  file: File | string | null;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [error, setError] = useState<Error | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error('Error loading PDF:', err);
    setError(err);
  }

  function changePage(offset: number) {
    setPageNumber((prevPageNumber) => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    console.log(`Overlay Click: (${xPercent.toFixed(2)}%, ${yPercent.toFixed(2)}%)`);
  }

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
          >
            <div className="pdf-page-overlay" onClick={handleOverlayClick} />
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
