import { useState } from 'react';
import './App.css';
import PDFViewer from './components/PDFViewer';

function App() {
  const [file, setFile] = useState<File | null>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>PDF Engine Viewer</h1>
        <p className="subtitle">High-performance React PDF rendering</p>

        <div className="upload-section">
          <label htmlFor="file-upload" className="custom-file-upload">
            <span>Select PDF Document</span>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
            />
          </label>
          {file && <span className="file-name">{file.name}</span>}
        </div>
      </header>

      <main className="app-main">
        <PDFViewer file={file} />
      </main>
    </div>
  );
}

export default App;
