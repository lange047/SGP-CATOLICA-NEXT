'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeWrapperProps {
  value: string;
  size?: number;
}

export function QRCodeWrapper({ value, size = 110 }: QRCodeWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        data-qr-pending
        style={{ width: size, height: size }}
        className="bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-mono border"
      >
        Gerando...
      </div>
    );
  }

  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="L"
      includeMargin={false}
    />
  );
}
