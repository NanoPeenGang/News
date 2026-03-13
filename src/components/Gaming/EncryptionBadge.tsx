'use client';

import { useState } from 'react';
import { Lock, Key, Shield } from 'lucide-react';

interface EncryptionBadgeProps {
  compact?: boolean;
}

export default function EncryptionBadge({ compact = false }: EncryptionBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Mock session key fingerprint
  const fingerprint = 'a3:f9:2c:7e:b1:48:d5:09:6a:3f:c2:81:e7:5b:4d:22';

  return (
    <div className="relative inline-flex">
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-200 hover:scale-105"
        style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="End-to-end encryption details"
      >
        <Lock size={compact ? 10 : 12} style={{ color: '#10b981' }} />
        {!compact && (
          <span className="text-[11px] font-medium" style={{ color: '#10b981' }}>
            E2E Encrypted
          </span>
        )}
      </button>

      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-lg p-3 w-64 text-left"
          style={{
            background: 'rgba(10, 14, 26, 0.97)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} style={{ color: '#10b981' }} />
            <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
              End-to-End Encrypted
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[10px]" style={{ color: '#64748b' }}>Key Exchange</span>
              <span className="text-[10px] font-mono" style={{ color: '#e2e8f0' }}>X25519 ECDH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px]" style={{ color: '#64748b' }}>Cipher</span>
              <span className="text-[10px] font-mono" style={{ color: '#e2e8f0' }}>AES-256-GCM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px]" style={{ color: '#64748b' }}>Auth</span>
              <span className="text-[10px] font-mono" style={{ color: '#e2e8f0' }}>HMAC-SHA256</span>
            </div>
            <div className="pt-1.5" style={{ borderTop: '1px solid rgba(30,41,59,0.8)' }}>
              <div className="flex items-center gap-1 mb-1">
                <Key size={10} style={{ color: '#64748b' }} />
                <span className="text-[10px]" style={{ color: '#64748b' }}>Session Fingerprint</span>
              </div>
              <span className="text-[10px] font-mono break-all" style={{ color: '#a855f7' }}>
                {fingerprint}
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45"
            style={{ background: 'rgba(10, 14, 26, 0.97)', borderRight: '1px solid rgba(16,185,129,0.4)', borderBottom: '1px solid rgba(16,185,129,0.4)' }}
          />
        </div>
      )}
    </div>
  );
}
