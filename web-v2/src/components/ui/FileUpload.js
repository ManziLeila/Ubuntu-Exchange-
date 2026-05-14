'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({
  name,
  label,
  accept = 'image/jpeg,image/png,application/pdf',
  maxSize = 5 * 1024 * 1024, // 5 MB
  onFileSelect,
  error,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState('');

  function handleFile(file) {
    if (!file) return;
    if (file.size > maxSize) {
      setLocalError(`File exceeds maximum size of ${formatBytes(maxSize)}.`);
      return;
    }
    setLocalError('');
    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    handleFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setLocalError('');
    if (inputRef.current) inputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
  }

  const displayError = error || localError;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {selectedFile ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <FileText className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">{formatBytes(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-150',
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : displayError
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40',
          ].join(' ')}
        >
          <UploadCloud
            className={[
              'w-8 h-8',
              dragOver ? 'text-blue-500' : 'text-gray-400',
            ].join(' ')}
          />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              Drag & drop or{' '}
              <span className="text-blue-600 underline underline-offset-2">
                browse
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {accept
                .split(',')
                .map((a) => a.split('/').pop().toUpperCase())
                .join(', ')}{' '}
              &mdash; max {formatBytes(maxSize)}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            name={name}
            accept={accept}
            className="sr-only"
            onChange={handleChange}
          />
        </div>
      )}

      {displayError && (
        <p className="mt-1 text-xs text-red-600">{displayError}</p>
      )}
    </div>
  );
}
