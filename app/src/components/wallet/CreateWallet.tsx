import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Tooltip } from '../common/Tooltip';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PasswordConfirmInput } from '../common/PasswordInput';
import { CloseButton } from '../common/CloseButton';
import { getPasswordValidationState } from '../../utils/validation';
import { useWalletStore } from '../../store/walletStore';

type Step = 'options' | 'passphrase' | 'display-seed' | 'confirm-seed' | 'password' | 'creating';

interface ConfirmWord {
  position: number;
  word: string;
}

// Auto-detect network based on environment
const getNetwork = (): 'mainnet' | 'testnet' => {
  return import.meta.env.DEV ? 'testnet' : 'mainnet';
};

export const CreateWallet: React.FC = () => {
  const navigate = useNavigate();
  const { importWallet } = useWalletStore();

  // Auto-detect network
  const network = getNetwork();

  // State
  const [step, setStep] = useState<Step>('options');
  const [wordCount, setWordCount] = useState<12 | 24>(24);
  const [passphrase, setPassphrase] = useState<string>('');
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [confirmWords, setConfirmWords] = useState<ConfirmWord[]>([]);
  const [userConfirmWords, setUserConfirmWords] = useState<string[]>(['', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Generate seed when moving to display step
  useEffect(() => {
    if (step === 'display-seed' && seedWords.length === 0) {
      generateSeed();
    }
  }, [step]);

  // Generate random confirmation words (sorted by position)
  useEffect(() => {
    if (step === 'confirm-seed' && confirmWords.length === 0) {
      const positions = new Set<number>();
      while (positions.size < 3) {
        positions.add(Math.floor(Math.random() * seedWords.length));
      }
      // Sort positions so words are asked in sequential order
      const sortedPositions = Array.from(positions).sort((a, b) => a - b);
      const words = sortedPositions.map(pos => ({
        position: pos,
        word: seedWords[pos]
      }));
      setConfirmWords(words);
    }
  }, [step, seedWords]);

  const generateSeed = async () => {
    setLoading(true);
    setError('');
    try {
      // Generate mnemonic using backend
      const mnemonic = await invoke<string>('generate_mnemonic_cmd', {
        wordCount
      });

      setSeedWords(mnemonic.split(' '));
    } catch (err) {
      setError(`Failed to generate seed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setLoading(true);
    setError('');
    try {
      const mnemonic = seedWords.join(' ');
      const finalPassphrase = usePassphrase ? passphrase : null;

      // Use importWallet since we already generated and displayed the mnemonic
      await importWallet(mnemonic, finalPassphrase, password, network);
      navigate('/dashboard');
    } catch (err) {
      setError(`Failed to create wallet: ${err}`);
      setLoading(false);
    }
  };

  const handleConfirmSeed = () => {
    const isValid = confirmWords.every((word, idx) =>
      userConfirmWords[idx].trim().toLowerCase() === word.word.toLowerCase()
    );

    if (isValid) {
      setStep('password');
      setError('');
    } else {
      setError('Words do not match. Please try again.');
    }
  };

  const isPasswordValid = () => {
    const state = getPasswordValidationState(password);
    return state.isValid && password === confirmPassword;
  };

  const renderStep = () => {
    switch (step) {
      case 'options':
        return (
          <Card>
            <h2 className="text-2xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
              Wallet Options
            </h2>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-hacker-white font-mono">Word Count</label>
                  <Tooltip content="24 words provides more security than 12 words" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={wordCount === 12 ? 'primary' : 'secondary'}
                    onClick={() => setWordCount(12)}
                    className="w-full"
                  >
                    12 Words
                  </Button>
                  <Button
                    variant={wordCount === 24 ? 'primary' : 'secondary'}
                    onClick={() => setWordCount(24)}
                    className="w-full"
                  >
                    24 Words (Recommended)
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-hacker-white font-mono">BIP39 Passphrase</label>
                  <Tooltip content="Optional 25th word for additional security. DO NOT lose this!" />
                </div>
                <Button
                  variant={usePassphrase ? 'primary' : 'secondary'}
                  onClick={() => setUsePassphrase(!usePassphrase)}
                  className="w-full"
                >
                  {usePassphrase ? 'Enabled' : 'Disabled (Advanced)'}
                </Button>
              </div>

              <Button
                onClick={() => setStep(usePassphrase ? 'passphrase' : 'display-seed')}
                className="w-full"
              >
                Continue
              </Button>

              <Button
                variant="secondary"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </Card>
        );

      case 'passphrase':
        return (
          <Card>
            <h2 className="text-2xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
              BIP39 Passphrase
            </h2>

            <div className="space-y-4">
              <div className="bg-alert-red/10 border border-alert-red p-4">
                <p className="text-alert-red font-mono text-sm">
                  ⚠️ WARNING: If you lose this passphrase, your funds will be UNRECOVERABLE!
                  This is NOT your encryption password.
                </p>
              </div>

              <Input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter optional passphrase"
                className="w-full"
              />

              <Button
                onClick={() => setStep('display-seed')}
                disabled={usePassphrase && passphrase.length === 0}
                className="w-full"
              >
                Continue
              </Button>

              <Button
                variant="secondary"
                onClick={() => setStep('options')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </Card>
        );

      case 'display-seed':
        if (loading) {
          return (
            <Card>
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingSpinner />
                <p className="text-hacker-white font-mono mt-4">Generating seed phrase...</p>
              </div>
            </Card>
          );
        }

        return (
          <Card>
            <h2 className="text-2xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
              Your Seed Phrase
            </h2>

            <div className="space-y-4">
              <div className="bg-bitcoin-orange/10 border border-bitcoin-orange p-4">
                <p className="text-bitcoin-orange font-mono text-sm">
                  ⚠️ Write down these {wordCount} words in order. Keep them safe and NEVER share them.
                  Anyone with these words can access your Bitcoin.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {seedWords.map((word, idx) => (
                  <div
                    key={idx}
                    className="bg-hacker-black/50 border border-muted-gray p-3 rounded"
                  >
                    <span className="text-muted-gray font-mono text-sm">{idx + 1}.</span>
                    <span className="text-hacker-white font-mono ml-2">{word}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setStep('confirm-seed')}
                className="w-full"
              >
                I Have Written Down My Seed Phrase
              </Button>

              <Button
                variant="secondary"
                onClick={() => setStep('options')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </Card>
        );

      case 'confirm-seed':
        return (
          <Card>
            <h2 className="text-2xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
              Confirm Seed Phrase
            </h2>

            <div className="space-y-4">
              <p className="text-hacker-white font-mono text-sm">
                Please enter these words from your seed phrase to confirm:
              </p>

              {error && (
                <div className="bg-alert-red/10 border border-alert-red p-4">
                  <p className="text-alert-red font-mono text-sm">{error}</p>
                </div>
              )}

              {confirmWords.map((word, idx) => (
                <div key={idx}>
                  <label className="text-muted-gray font-mono text-sm">
                    Word #{word.position + 1}
                  </label>
                  <Input
                    type="text"
                    value={userConfirmWords[idx]}
                    onChange={(e) => {
                      const newWords = [...userConfirmWords];
                      newWords[idx] = e.target.value;
                      setUserConfirmWords(newWords);
                    }}
                    placeholder={`Enter word #${word.position + 1}`}
                    className="w-full mt-1"
                  />
                </div>
              ))}

              <Button
                onClick={handleConfirmSeed}
                disabled={userConfirmWords.some(w => w.trim().length === 0)}
                className="w-full"
              >
                Confirm
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setStep('display-seed');
                  setUserConfirmWords(['', '', '']);
                  setError('');
                }}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </Card>
        );

      case 'password':
        return (
          <Card>
            <h2 className="text-2xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
              Set Encryption Password
            </h2>

            <div className="space-y-4">
              <div className="bg-bitcoin-orange/10 border border-bitcoin-orange p-4">
                <p className="text-bitcoin-orange font-mono text-sm">
                  This password encrypts your wallet file. Use a strong, unique password.
                </p>
              </div>

              {error && (
                <div className="bg-alert-red/10 border border-alert-red p-4">
                  <p className="text-alert-red font-mono text-sm">{error}</p>
                </div>
              )}

              <PasswordConfirmInput
                password={password}
                confirmPassword={confirmPassword}
                onPasswordChange={setPassword}
                onConfirmChange={setConfirmPassword}
                showRules={true}
                showStrength={true}
              />

              <div className="bg-muted-gray/10 border border-muted-gray p-3">
                <p className="text-muted-gray font-mono text-sm">
                  Network: <span className={network === 'mainnet' ? 'text-bitcoin-orange' : 'text-terminal-green'}>
                    {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
                  </span>
                </p>
              </div>

              <Button
                onClick={handleCreateWallet}
                disabled={!isPasswordValid() || loading}
                className="w-full"
              >
                {loading ? 'Creating...' : 'Create Wallet'}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setStep('confirm-seed')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </Card>
        );

      case 'creating':
        return (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner />
              <p className="text-hacker-white font-mono mt-4">Creating wallet...</p>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-hacker-black p-6">
      <CloseButton />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
          Create New Wallet
        </h1>

        {renderStep()}
      </div>
    </div>
  );
};
