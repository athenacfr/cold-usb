import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip';
import { QRDisplay } from '../common/QRDisplay';
import { AddressInfo } from '../../types/wallet';

export const AddressManager: React.FC = () => {
  const [addressType, setAddressType] = useState<'receive' | 'change'>('receive');
  const [index, setIndex] = useState(0);
  const [address, setAddress] = useState<AddressInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDeriveAddress = async () => {
    try {
      setLoading(true);
      setError(null);

      const addressInfo = await invoke<AddressInfo>('derive_address', {
        account: 0,
        change: addressType === 'change' ? 1 : 0,
        index,
      });

      setAddress(addressInfo);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handlePrevious = () => {
    if (index > 0) {
      setIndex(index - 1);
      setAddress(null);
    }
  };

  const handleNext = () => {
    setIndex(index + 1);
    setAddress(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
        Generate Address
      </h2>

      <Card className="mb-6">
        <div className="space-y-6">
          {/* Address Type Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-hacker-white font-mono uppercase text-sm">Address Type</label>
              <Tooltip content="Receive addresses are for incoming payments. Change addresses are for transaction change outputs." />
            </div>
            <div className="flex gap-4">
              <Button
                variant={addressType === 'receive' ? 'primary' : 'secondary'}
                onClick={() => { setAddressType('receive'); setAddress(null); }}
                className="flex-1"
              >
                Receive
              </Button>
              <Button
                variant={addressType === 'change' ? 'primary' : 'secondary'}
                onClick={() => { setAddressType('change'); setAddress(null); }}
                className="flex-1"
              >
                Change
              </Button>
            </div>
          </div>

          {/* Index Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-hacker-white font-mono uppercase text-sm">Address Index</label>
              <Tooltip content="Each index generates a unique address. Use a new index for each transaction to improve privacy." />
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={handlePrevious}
                disabled={index === 0}
                className="px-4 py-2"
              >
                -
              </Button>
              <div className="flex-1 text-center">
                <span className="text-bitcoin-orange font-mono text-2xl">{index}</span>
              </div>
              <Button
                variant="secondary"
                onClick={handleNext}
                className="px-4 py-2"
              >
                +
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-alert-red/10 border border-alert-red p-4">
              <p className="text-alert-red font-mono text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleDeriveAddress}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating...' : 'Generate Address'}
          </Button>
        </div>
      </Card>

      {address && (
        <Card>
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <QRDisplay
                data={address.address}
                size={200}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-muted-gray font-mono text-sm mb-2">Address</label>
              <div className="bg-hacker-black border border-terminal-green p-4 flex items-center gap-4">
                <span className="text-terminal-green font-mono text-sm break-all flex-1">
                  {address.address}
                </span>
                <Button
                  variant="secondary"
                  onClick={handleCopyAddress}
                  className="px-3 py-1 text-xs shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Derivation Path */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-muted-gray font-mono text-sm mb-2">Derivation Path</label>
                <div className="bg-hacker-black border border-muted-gray p-3">
                  <span className="text-hacker-white font-mono text-sm">{address.derivation_path}</span>
                </div>
              </div>
              <div>
                <label className="block text-muted-gray font-mono text-sm mb-2">Script Type</label>
                <div className="bg-hacker-black border border-muted-gray p-3">
                  <span className="text-hacker-white font-mono text-sm">{address.script_type}</span>
                </div>
              </div>
            </div>

            <div className="bg-bitcoin-orange/10 border border-bitcoin-orange p-4">
              <p className="text-bitcoin-orange font-mono text-sm">
                Always verify this address on your online device before sending funds.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
