import React, { useEffect, useRef, useState, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from './Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  className?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  onClose,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  const handleScan = useCallback((result: QrScanner.ScanResult) => {
    if (result.data) {
      // Stop scanning after successful read
      scannerRef.current?.stop();
      setIsScanning(false);
      onScan(result.data);
    }
  }, [onScan]);

  const handleError = useCallback((err: Error | string) => {
    const errorMessage = typeof err === 'string' ? err : err.message;
    // Ignore "No QR code found" errors - these are normal during scanning
    if (errorMessage.includes('No QR code found')) return;

    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  useEffect(() => {
    // Check for camera availability by actually trying to access it
    const checkCamera = async () => {
      try {
        // First check if browser reports having a camera
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setCameraStatus('unavailable');
          setError('No camera detected on this device');
          return;
        }

        // Try to actually get camera access to verify it works
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        // Camera works, stop the test stream
        stream.getTracks().forEach(track => track.stop());
        setCameraStatus('available');
      } catch (err) {
        setCameraStatus('unavailable');
        const errorMsg = err instanceof Error ? err.message : 'Camera access failed';
        if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
          setError('Camera permission denied. Please allow camera access.');
        } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('not found')) {
          setError('No camera found. Please connect a camera or use paste mode.');
        } else {
          setError(`Camera unavailable: ${errorMsg}`);
        }
      }
    };

    checkCamera();

    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current || cameraStatus !== 'available') return;

    setError(null);
    setIsScanning(true);

    try {
      // Create scanner if it doesn't exist
      if (!scannerRef.current) {
        scannerRef.current = new QrScanner(
          videoRef.current,
          handleScan,
          {
            onDecodeError: handleError,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          }
        );
      }

      await scannerRef.current.start();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
      setError(errorMessage);
      setIsScanning(false);
      setCameraStatus('unavailable');
      onError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    scannerRef.current?.stop();
    setIsScanning(false);
  };

  // Show loading while checking camera
  if (cameraStatus === 'checking') {
    return (
      <div className={`bg-hacker-black border border-muted-gray p-6 ${className}`}>
        <p className="text-muted-gray font-mono text-center">
          Checking camera availability...
        </p>
      </div>
    );
  }

  // Show error if no camera available
  if (cameraStatus === 'unavailable') {
    return (
      <div className={`bg-hacker-black border border-bitcoin-orange p-6 ${className}`}>
        <p className="text-bitcoin-orange font-mono text-center mb-2">
          {error || 'Camera not available'}
        </p>
        <p className="text-muted-gray font-mono text-sm text-center">
          Switch to "Paste Text" mode to enter your PSBT manually.
        </p>
        {onClose && (
          <Button variant="secondary" onClick={onClose} className="w-full mt-4">
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Video container */}
      <div className="relative bg-hacker-black border-2 border-bitcoin-orange overflow-hidden">
        <video
          ref={videoRef}
          className="w-full aspect-square object-cover"
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-bitcoin-orange" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-bitcoin-orange" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-bitcoin-orange" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-bitcoin-orange" />

            {/* Scanning line animation */}
            <div className="absolute left-4 right-4 h-0.5 bg-bitcoin-orange/80 animate-pulse"
                 style={{ top: '50%' }} />
          </div>
        )}

        {/* Not scanning overlay */}
        {!isScanning && (
          <div className="absolute inset-0 bg-hacker-black/80 flex items-center justify-center">
            <p className="text-muted-gray font-mono text-center px-4">
              {error || 'Click "Start Camera" to begin scanning'}
            </p>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-alert-red/10 border border-alert-red p-3 mt-4">
          <p className="text-alert-red font-mono text-sm">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4 mt-4">
        {onClose && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              stopScanning();
              onClose();
            }}
          >
            Cancel
          </Button>
        )}

        {isScanning ? (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={stopScanning}
          >
            Stop Camera
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={startScanning}
          >
            Start Camera
          </Button>
        )}
      </div>

      {/* Instructions */}
      <p className="text-muted-gray font-mono text-sm text-center mt-4">
        Point camera at PSBT QR code
      </p>
    </div>
  );
};
