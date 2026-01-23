import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { QRDisplay } from '../common/QRDisplay';
import { QRScanner } from '../common/QRScanner';
import { PSBTDetails, SignedPSBTResult } from '../../types/transaction';
import { useWalletStore } from '../../store/walletStore';

type Step = 'input' | 'review' | 'signing' | 'export';
type InputMode = 'scan' | 'paste';

export const SigningFlow: React.FC = () => {
  const { walletInfo } = useWalletStore();
  const [step, setStep] = useState<Step>('input');
  const [inputMode, setInputMode] = useState<InputMode>('scan');
  const [psbtInput, setPsbtInput] = useState('');
  const [psbtFormat, setPsbtFormat] = useState<'base64' | 'hex'>('base64');
  const [psbtDetails, setPsbtDetails] = useState<PSBTDetails | null>(null);
  const [signedResult, setSignedResult] = useState<SignedPSBTResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatBtc = (sats: number) => {
    return (sats / 100_000_000).toFixed(8);
  };

  const handleParsePSBT = async () => {
    setLoading(true);
    setError('');
    try {
      const details = await invoke<PSBTDetails>('parse_psbt', {
        psbtData: psbtInput.trim(),
        format: psbtFormat,
        network: walletInfo?.network || 'testnet',
      });
      setPsbtDetails(details);
      setStep('review');
    } catch (err) {
      setError(`Failed to parse PSBT: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleParsePSBTFromData = async (data: string) => {
    setLoading(true);
    setError('');
    const trimmed = data.trim();

    // Auto-detect format
    const format = /^[0-9a-fA-F]+$/.test(trimmed) ? 'hex' : 'base64';
    setPsbtFormat(format);
    setPsbtInput(trimmed);

    try {
      const details = await invoke<PSBTDetails>('parse_psbt', {
        psbtData: trimmed,
        format: format,
        network: walletInfo?.network || 'testnet',
      });
      setPsbtDetails(details);
      setStep('review');
    } catch (err) {
      setError(`Failed to parse PSBT: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignPSBT = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await invoke<SignedPSBTResult>('sign_psbt', {
        psbtData: psbtInput.trim(),
        format: psbtFormat,
      });
      setSignedResult(result);
      setStep('export');
    } catch (err) {
      setError(`Failed to sign PSBT: ${err}`);
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReset = () => {
    setStep('input');
    setInputMode('scan');
    setPsbtInput('');
    setPsbtFormat('base64');
    setPsbtDetails(null);
    setSignedResult(null);
    setError('');
  };

  const renderStep = () => {
    switch (step) {
      case 'input':
        return (
          <Card>
            <h3 className="text-xl font-mono uppercase font-bold text-bitcoin-orange mb-4">
              Import PSBT
            </h3>

            <div className="space-y-4">
              {/* Input Mode Toggle */}
              <div className="flex gap-4 mb-4">
                <Button
                  variant={inputMode === 'scan' ? 'primary' : 'secondary'}
                  onClick={() => { setInputMode('scan'); setError(''); }}
                  className="flex-1"
                >
                  Scan QR
                </Button>
                <Button
                  variant={inputMode === 'paste' ? 'primary' : 'secondary'}
                  onClick={() => { setInputMode('paste'); setError(''); }}
                  className="flex-1"
                >
                  Paste Text
                </Button>
              </div>

              {error && (
                <div className="bg-alert-red/10 border border-alert-red p-4">
                  <p className="text-alert-red font-mono text-sm">{error}</p>
                </div>
              )}

              {inputMode === 'scan' ? (
                /* QR Scanner Mode */
                <div className="space-y-4">
                  <p className="text-muted-gray font-mono text-sm">
                    Scan a PSBT QR code from your watch-only wallet.
                  </p>

                  <QRScanner
                    onScan={(data) => {
                      setPsbtInput(data);
                      // Auto-detect format based on content
                      const trimmed = data.trim();
                      if (/^[0-9a-fA-F]+$/.test(trimmed)) {
                        setPsbtFormat('hex');
                      } else {
                        setPsbtFormat('base64');
                      }
                      // Automatically parse after scanning
                      handleParsePSBTFromData(data);
                    }}
                    onError={(err) => setError(err)}
                  />
                </div>
              ) : (
                /* Paste Mode */
                <div className="space-y-4">
                  <p className="text-muted-gray font-mono text-sm">
                    Paste your PSBT (Partially Signed Bitcoin Transaction) below.
                  </p>

                  <div className="flex gap-4 mb-2">
                    <label className="text-hacker-white font-mono">Format:</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={psbtFormat === 'base64'}
                        onChange={() => setPsbtFormat('base64')}
                        className="accent-bitcoin-orange"
                      />
                      <span className="text-hacker-white font-mono">Base64</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={psbtFormat === 'hex'}
                        onChange={() => setPsbtFormat('hex')}
                        className="accent-bitcoin-orange"
                      />
                      <span className="text-hacker-white font-mono">Hex</span>
                    </label>
                  </div>

                  <textarea
                    value={psbtInput}
                    onChange={(e) => setPsbtInput(e.target.value)}
                    placeholder="Paste PSBT here..."
                    className="w-full h-40 bg-hacker-black border border-muted-gray p-4 font-mono text-hacker-white focus:border-bitcoin-orange focus:outline-none resize-none"
                  />

                  <Button
                    onClick={handleParsePSBT}
                    disabled={!psbtInput.trim() || loading}
                    className="w-full"
                  >
                    {loading ? 'Parsing...' : 'Parse PSBT'}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );

      case 'review':
        if (!psbtDetails) return null;

        return (
          <Card>
            <h3 className="text-xl font-mono uppercase font-bold text-bitcoin-orange mb-4">
              Review Transaction
            </h3>

            <div className="space-y-6">
              {error && (
                <div className="bg-alert-red/10 border border-alert-red p-4">
                  <p className="text-alert-red font-mono text-sm">{error}</p>
                </div>
              )}

              {/* Inputs */}
              <div>
                <h4 className="text-hacker-white font-mono uppercase text-sm mb-2">
                  Inputs ({psbtDetails.inputs.length})
                </h4>
                <div className="space-y-2">
                  {psbtDetails.inputs.map((input, idx) => (
                    <div key={idx} className="bg-hacker-black/50 border border-muted-gray p-3">
                      <div className="flex justify-between">
                        <span className="text-muted-gray font-mono text-sm truncate flex-1">
                          {input.txid.slice(0, 8)}...:{input.vout}
                        </span>
                        <span className="text-hacker-white font-mono">
                          {formatBtc(input.amount)} BTC
                        </span>
                      </div>
                      {input.address && (
                        <p className="text-muted-gray font-mono text-xs truncate mt-1">
                          {input.address}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Outputs */}
              <div>
                <h4 className="text-hacker-white font-mono uppercase text-sm mb-2">
                  Outputs ({psbtDetails.outputs.length})
                </h4>
                <div className="space-y-2">
                  {psbtDetails.outputs.map((output, idx) => (
                    <div
                      key={idx}
                      className={`bg-hacker-black/50 border p-3 ${
                        output.is_change ? 'border-terminal-green/50' : 'border-bitcoin-orange/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-muted-gray font-mono text-xs truncate">
                            {output.address}
                          </p>
                          {output.is_change && (
                            <span className="text-terminal-green font-mono text-xs">
                              (Change)
                            </span>
                          )}
                        </div>
                        <span className={`font-mono ${output.is_change ? 'text-terminal-green' : 'text-bitcoin-orange'}`}>
                          {formatBtc(output.amount)} BTC
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee Summary */}
              <div className="bg-hacker-black/50 border border-muted-gray p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-gray font-mono">Total Input:</span>
                  <span className="text-hacker-white font-mono">{formatBtc(psbtDetails.total_input)} BTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-gray font-mono">Total Output:</span>
                  <span className="text-hacker-white font-mono">{formatBtc(psbtDetails.total_output)} BTC</span>
                </div>
                <div className="flex justify-between border-t border-muted-gray/30 pt-2">
                  <span className="text-bitcoin-orange font-mono">Fee:</span>
                  <span className="text-bitcoin-orange font-mono">
                    {formatBtc(psbtDetails.fee)} BTC ({psbtDetails.fee_rate.toFixed(1)} sat/vB)
                  </span>
                </div>
              </div>

              <div className="bg-bitcoin-orange/10 border border-bitcoin-orange p-4">
                <p className="text-bitcoin-orange font-mono text-sm">
                  ⚠️ Verify all addresses carefully before signing!
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleReset}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSignPSBT}
                  disabled={loading}
                >
                  {loading ? 'Signing...' : 'Sign Transaction'}
                </Button>
              </div>
            </div>
          </Card>
        );

      case 'signing':
        return (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner />
              <p className="text-hacker-white font-mono mt-4">Signing transaction...</p>
            </div>
          </Card>
        );

      case 'export':
        if (!signedResult) return null;

        return (
          <Card>
            <h3 className="text-xl font-mono uppercase font-bold text-terminal-green mb-4">
              Transaction Signed!
            </h3>

            <div className="space-y-6">
              <div className="bg-terminal-green/10 border border-terminal-green p-4">
                <p className="text-terminal-green font-mono text-sm">
                  {signedResult.is_finalized
                    ? '✓ Transaction is fully signed and ready to broadcast'
                    : '✓ Signature added. May need more signatures.'}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <QRDisplay
                  data={signedResult.signed_psbt}
                  label="Signed PSBT"
                  size={250}
                />
              </div>

              {/* Signed PSBT */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-muted-gray font-mono text-sm">Signed PSBT:</label>
                  <Button
                    variant="secondary"
                    className="text-xs px-2 py-1"
                    onClick={() => handleCopyToClipboard(signedResult.signed_psbt)}
                  >
                    Copy
                  </Button>
                </div>
                <textarea
                  value={signedResult.signed_psbt}
                  readOnly
                  className="w-full h-32 bg-hacker-black border border-muted-gray p-4 font-mono text-hacker-white text-xs resize-none"
                />
              </div>

              {/* Raw TX if finalized */}
              {signedResult.is_finalized && signedResult.transaction_hex && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-muted-gray font-mono text-sm">Raw Transaction (for broadcast):</label>
                    <Button
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => handleCopyToClipboard(signedResult.transaction_hex!)}
                    >
                      Copy
                    </Button>
                  </div>
                  <textarea
                    value={signedResult.transaction_hex}
                    readOnly
                    className="w-full h-24 bg-hacker-black border border-muted-gray p-4 font-mono text-hacker-white text-xs resize-none"
                  />
                </div>
              )}

              <Button className="w-full" onClick={handleReset}>
                Sign Another Transaction
              </Button>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
        Sign Transaction
      </h2>

      {renderStep()}
    </div>
  );
};
