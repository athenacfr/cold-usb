import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRDisplayProps {
  data: string;
  size?: number;
  label?: string;
  className?: string;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({ data, size = 256, label, className = '' }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && (
        <p className="text-muted-gray font-mono text-sm mb-2">{label}</p>
      )}
      <div className="p-4 bg-hacker-white">
        <QRCodeSVG
          value={data}
          size={size}
          level="M"
          includeMargin={true}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
    </div>
  );
};
