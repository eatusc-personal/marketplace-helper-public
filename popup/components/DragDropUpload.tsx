import React, { useState, useRef } from 'react';
import { debugLog } from '../../src/shared/debug';

// Add CSS for spinner animation
const spinnerStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('drag-drop-spinner-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'drag-drop-spinner-styles';
  styleSheet.textContent = spinnerStyles;
  document.head.appendChild(styleSheet);
}

interface DragDropUploadProps {
  onFilesSelected: (files: FileList | null) => void;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  addDebugLog?: (message: string) => void; // Add debug logging prop
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFilesSelected,
  accept,
  multiple = false,
  disabled = false,
  children,
  className = '',
  addDebugLog
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced file processing with HEIC conversion
  const processFiles = async (files: FileList): Promise<File[]> => {
    const startMessage = `🔄 FILE PROCESSING: Starting to process ${files.length} files...`;
    debugLog(startMessage);
    addDebugLog?.(startMessage);

    // Check if any files need HEIC conversion
    const hasHeicFiles = Array.from(files).some(file =>
      file.type.toLowerCase().includes('heic') ||
      file.type.toLowerCase().includes('heif') ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif')
    );

    if (hasHeicFiles) {
      setIsConverting(true);
      setConversionStatus('Converting HEIC files to JPEG...');
    }

    const processedFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileInfo = `${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      addDebugLog?.(`📁 FILE PROCESSING: Processing file ${i + 1}/${files.length}: ${fileInfo}`);

      // Check if it's a HEIC file
      const isHeicFile = file.type.toLowerCase().includes('heic') ||
                        file.type.toLowerCase().includes('heif') ||
                        file.name.toLowerCase().endsWith('.heic') ||
                        file.name.toLowerCase().endsWith('.heif');

      if (isHeicFile) {
        addDebugLog?.(`🔄 HEIC DETECTED: Converting ${file.name} to JPEG...`);
        setConversionStatus(`Converting ${file.name} to JPEG...`);

        try {
          // Convert HEIC to JPEG using local API
          const convertedFile = await convertHeicToJpeg(file);
          processedFiles.push(convertedFile);
          addDebugLog?.(`✅ HEIC CONVERSION: Successfully converted ${file.name} to ${convertedFile.name}`);
        } catch (error) {
          addDebugLog?.(`❌ HEIC CONVERSION FAILED: ${error}. Adding original file.`);
          processedFiles.push(file);
        }
      } else {
        // Add non-HEIC files as-is
        addDebugLog?.(`📁 FILE: Adding ${file.name} as-is (${file.type})`);
        processedFiles.push(file);
      }
    }

    const finalMessage = `✅ FILE PROCESSING COMPLETE: Processed ${files.length} files, ${processedFiles.length} total files ready`;
    debugLog(finalMessage);
    addDebugLog?.(finalMessage);

    // Clear conversion status when done
    setIsConverting(false);
    setConversionStatus('');

    return processedFiles;
  };

  // HEIC to JPEG conversion function with smart fallback
  const convertHeicToJpeg = async (heicFile: File): Promise<File> => {
    addDebugLog?.(`🔄 HEIC CONVERSION: Starting conversion of ${heicFile.name}...`);

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:image/heic;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(heicFile);
    });

    addDebugLog?.(`📊 HEIC CONVERSION: Base64 data length: ${base64Data.length} characters`);

    const requestBody = {
      fileData: base64Data,
      fileName: heicFile.name,
      fileType: heicFile.type || 'image/heic'
    };

    const configuredEndpoint = import.meta.env.VITE_HEIC_CONVERTER_URL as string | undefined;

    // Try the local development server, then an operator-configured deployment.
    const apiEndpoints = [
      {
        url: 'http://localhost:3001/api/convert-heic',
        name: 'Local Development Server'
      },
      ...(configuredEndpoint
        ? [{ url: configuredEndpoint, name: 'Configured Conversion Server' }]
        : [])
    ];

    let lastError: Error | null = null;

    for (const endpoint of apiEndpoints) {
      try {
        addDebugLog?.(`🔄 HEIC CONVERSION: Trying ${endpoint.name} at ${endpoint.url}...`);

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(`API request failed: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(`Conversion failed: ${result.error}`);
        }

        addDebugLog?.(`✅ HEIC CONVERSION: Success with ${endpoint.name}! Original: ${(result.originalSize / 1024 / 1024).toFixed(2)} MB, JPEG: ${(result.convertedSize / 1024 / 1024).toFixed(2)} MB (${result.compressionRatio}% compression)`);

        // Convert base64 JPEG back to File object
        const jpegBase64 = result.jpeg;
        const jpegBuffer = Uint8Array.from(atob(jpegBase64), c => c.charCodeAt(0));
        const jpegFile = new File([jpegBuffer], result.fileName, { type: 'image/jpeg' });

        addDebugLog?.(`✅ HEIC CONVERSION: Created JPEG file: ${jpegFile.name} (${(jpegFile.size / 1024 / 1024).toFixed(2)} MB)`);

        return jpegFile;

      } catch (error) {
        lastError = error as Error;
        addDebugLog?.(`⚠️ HEIC CONVERSION: ${endpoint.name} failed: ${error}`);

        // If this is the last endpoint, don't continue
        if (endpoint === apiEndpoints[apiEndpoints.length - 1]) {
          break;
        }

        addDebugLog?.(`🔄 HEIC CONVERSION: Trying next endpoint...`);
      }
    }

    // If we get here, all endpoints failed
    throw new Error(`All HEIC conversion endpoints failed. Last error: ${lastError?.message}`);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addDebugLog?.(`📁 DROP EVENT: ${files.length} files dropped, starting processing...`);

      try {
        // Process files (now async)
        const processedFiles = await processFiles(files);

        if (processedFiles.length > 0) {
          addDebugLog?.(`✅ DROP EVENT: Processing complete, calling onFilesSelected with ${processedFiles.length} files`);

          // Create a new FileList-like object with processed files
          const dt = new DataTransfer();
          processedFiles.forEach(file => dt.items.add(file));

          onFilesSelected(dt.files);
        }
      } catch (error) {
        addDebugLog?.(`❌ DROP EVENT: Error processing files: ${error}`);
      }
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addDebugLog?.(`📁 FILE INPUT: ${files.length} files selected, starting processing...`);

      try {
        // Process files (now async)
        const processedFiles = await processFiles(files);

        if (processedFiles.length > 0) {
          addDebugLog?.(`✅ FILE INPUT: Processing complete, calling onFilesSelected with ${processedFiles.length} files`);

          // Create a new FileList-like object with processed files
          const dt = new DataTransfer();
          processedFiles.forEach(file => dt.items.add(file));

          onFilesSelected(dt.files);
        }
      } catch (error) {
        addDebugLog?.(`❌ FILE INPUT: Error processing files: ${error}`);
      }
    }

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const dragDropClasses = `
    drag-drop-upload
    ${className}
    ${isDragOver ? 'drag-over' : ''}
    ${disabled ? 'disabled' : ''}
  `.trim();

  return (
    <div
      className={dragDropClasses}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {children}
      {isConverting && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #ffffff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          {conversionStatus}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </div>
  );
};

export default DragDropUpload;
