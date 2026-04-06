import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PasswordConfirmInput } from '../common/PasswordInput';
import { CloseButton } from '../common/CloseButton';
import { getPasswordValidationState } from '../../utils/validation';
import { useWalletStore } from '../../store/walletStore';

type Step = 'words' | 'passphrase' | 'password' | 'importing';

// Auto-detect network based on environment
const getNetwork = (): 'mainnet' | 'testnet' => {
  return import.meta.env.DEV ? 'testnet' : 'mainnet';
};

export const ImportWallet: React.FC = () => {
  const navigate = useNavigate();
  const { importWallet, validateMnemonic, getBip39Wordlist } = useWalletStore();

  // Auto-detect network
  const network = getNetwork();

  // State
  const [step, setStep] = useState<Step>('words');
  const [wordCount, setWordCount] = useState<12 | 24>(24);
  const [words, setWords] = useState<string[]>(Array(24).fill(''));
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load BIP39 wordlist on mount
  useEffect(() => {
    const loadWordlist = async () => {
      try {
        const list = await getBip39Wordlist();
        setWordlist(list);
      } catch (err) {
        console.error('Failed to load wordlist:', err);
      }
    };
    loadWordlist();
  }, []);

  // Update word count
  useEffect(() => {
    if (wordCount === 12) {
      setWords(prev => prev.slice(0, 12));
    } else {
      setWords(prev => [...prev, ...Array(24 - prev.length).fill('')].slice(0, 24));
    }
  }, [wordCount]);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);

    // Update suggestions
    if (value.length >= 1 && wordlist.length > 0) {
      const matches = wordlist.filter(w => w.startsWith(value.toLowerCase()));
      setSuggestions(matches.slice(0, 5));
      setActiveWordIndex(index);
    } else {
      setSuggestions([]);
      setActiveWordIndex(null);
    }
  };

  const handleSuggestionClick = (word: string) => {
    if (activeWordIndex !== null) {
      const newWords = [...words];
      newWords[activeWordIndex] = word;
      setWords(newWords);
      setSuggestions([]);
      setActiveWordIndex(null);

      // Move to next input
      const nextIndex = activeWordIndex + 1;
      if (nextIndex < wordCount && inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[0]);
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[0]);
    } else if (e.key === ' ' && words[index].length > 0) {
      e.preventDefault();
      // Move to next input on space
      const nextIndex = index + 1;
      if (nextIndex < wordCount && inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedWords = pastedText.trim().toLowerCase().split(/\s+/);

    if (pastedWords.length >= 12) {
      const count = pastedWords.length >= 24 ? 24 : 12;
      setWordCount(count as 12 | 24);
      setWords([...pastedWords.slice(0, count), ...Array(24 - count).fill('')].slice(0, 24));
    }
  };

  const validateWords = async (): Promise<boolean> => {
    const mnemonic = words.slice(0, wordCount).join(' ');
    try {
      const isValid = await validateMnemonic(mnemonic);
      if (!isValid) {
        setError('Invalid seed phrase. Please check your words.');
        return false;
      }
      return true;
    } catch (err) {
      setError('Failed to validate seed phrase.');
      return false;
    }
  };

  const handleContinueToPassphrase = async () => {
    setError('');
    const isValid = await validateWords();
    if (isValid) {
      setStep('passphrase');
    }
  };

  const isPasswordValid = () => {
    const state = getPasswordValidationState(password);
    return state.isValid && password === confirmPassword;
  };

  const handleImportWallet = async () => {
    setLoading(true);
    setError('');
    try {
      const mnemonic = words.slice(0, wordCount).join(' ');
      const finalPassphrase = usePassphrase ? passphrase : null;

      await importWallet(mnemonic, finalPassphrase, password, network);
      navigate('/dashboard');
    } catch (err) {
      setError(`Failed to import wallet: ${err}`);
      setLoading(false);
    }
  };

  const filledWords = words.slice(0, wordCount).filter(w => w.length > 0).length;

  const renderStep = () => {
    switch (step) {
      case 'words':
        return (
          <Card>
            <h2 className="text-2xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
              Enter Seed Phrase
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-hacker-white font-mono">Word Count</label>
                  <Tooltip content="Select the number of words in your seed phrase" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={wordCount === 12 ? 'primary' : 'secondary'}
                    onClick={() => setWordCount(12)}
                    className="px-3 py-1 text-sm"
                  >
                    12
                  </Button>
                  <Button
                    variant={wordCount === 24 ? 'primary' : 'secondary'}
                    onClick={() => setWordCount(24)}
                    className="px-3 py-1 text-sm"
                  >
                    24
                  </Button>
                </div>
              </div>

              <p className="text-muted-gray font-mono text-sm">
                Enter your {wordCount} word seed phrase. You can paste the entire phrase.
              </p>

              {error && (
                <div className="bg-alert-red/10 border border-alert-red p-4">
                  <p className="text-alert-red font-mono text-sm">{error}</p>
                </div>
              )}

              <div
                className="grid grid-cols-2 md:grid-cols-3 gap-3 relative"
                onPaste={handlePaste}
              >
                {Array.from({ length: wordCount }).map((_, idx) => (
                  <div key={idx} className="relative">
                    <div className="flex items-center">
                      <span className="text-muted-gray font-mono text-sm w-6">{idx + 1}.</span>
                      <input
                        ref={el => { inputRefs.current[idx] = el; }}
                        type="text"
                        value={words[idx] || ''}
                        onChange={(e) => handleWordChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onFocus={() => setActiveWordIndex(idx)}
                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                        className="flex-1 bg-hacker-black border border-muted-gray p-2 font-mono text-hacker-white focus:border-bitcoin-orange focus:outline-none"
                        placeholder="word"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                      />
                    </div>
                    {activeWordIndex === idx && suggestions.length > 0 && (
                      <div className="absolute z-10 left-6 right-0 mt-1 bg-hacker-black border border-bitcoin-orange max-h-40 overflow-y-auto">
                        {suggestions.map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            className="w-full text-left px-3 py-2 font-mono text-hacker-white hover:bg-bitcoin-orange/20"
                            onMouseDown={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-muted-gray font-mono text-sm">
                {filledWords}/{wordCount} words entered
              </p>

              <Button
                onClick={handleContinueToPassphrase}
                disabled={filledWords < wordCount}
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
              <p className="text-hacker-white font-mono text-sm">
                Did you use a BIP39 passphrase (25th word) when creating this wallet?
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={!usePassphrase ? 'primary' : 'secondary'}
                  onClick={() => setUsePassphrase(false)}
                  className="w-full"
                >
                  No Passphrase
                </Button>
                <Button
                  variant={usePassphrase ? 'primary' : 'secondary'}
                  onClick={() => setUsePassphrase(true)}
                  className="w-full"
                >
                  Yes, I Used One
                </Button>
              </div>

              {usePassphrase && (
                <>
                  <div className="bg-bitcoin-orange/10 border border-bitcoin-orange p-4">
                    <p className="text-bitcoin-orange font-mono text-sm">
                      Enter the exact passphrase you used. Different passphrase = different wallet.
                    </p>
                  </div>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter your BIP39 passphrase"
                    className="w-full"
                  />
                </>
              )}

              <Button
                onClick={() => setStep('password')}
                disabled={usePassphrase && passphrase.length === 0}
                className="w-full"
              >
                Continue
              </Button>

              <Button
                variant="secondary"
                onClick={() => setStep('words')}
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
                  This password encrypts your wallet file on this device.
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
                onClick={handleImportWallet}
                disabled={!isPasswordValid() || loading}
                className="w-full"
              >
                {loading ? 'Importing...' : 'Import Wallet'}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setStep('passphrase')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </Card>
        );

      case 'importing':
        return (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner />
              <p className="text-hacker-white font-mono mt-4">Importing wallet...</p>
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
          Import Wallet
        </h1>

        {renderStep()}
      </div>
    </div>
  );
};
