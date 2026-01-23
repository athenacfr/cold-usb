import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { NetworkBadge } from '../common/NetworkBadge';
import { useWalletStore } from '../../store/walletStore';

export const WalletDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { walletInfo, exportMnemonic } = useWalletStore();
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedPassword, setSeedPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [seedError, setSeedError] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);

  const handleExportSeed = async () => {
    setSeedLoading(true);
    setSeedError('');
    try {
      const mnemonic = await exportMnemonic(seedPassword);
      setSeedPhrase(mnemonic);
    } catch (err) {
      setSeedError('Invalid password');
    } finally {
      setSeedLoading(false);
    }
  };

  const closeSeedModal = () => {
    setShowSeedModal(false);
    setSeedPassword('');
    setSeedPhrase(null);
    setSeedError('');
  };

  const network = walletInfo?.network || 'testnet';
  const isMainnet = network === 'bitcoin' || network === 'mainnet';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-3xl font-mono uppercase font-bold text-bitcoin-orange">
          Dashboard
        </h2>
        <NetworkBadge network={isMainnet ? 'mainnet' : 'testnet'} />
      </div>

      <Card className="mb-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-gray font-mono uppercase text-sm">Master Fingerprint</span>
            <span className="text-hacker-white font-mono">{walletInfo?.fingerprint || '--------'}</span>
          </div>
          {walletInfo?.created_at && (
            <div className="flex justify-between items-center">
              <span className="text-muted-gray font-mono uppercase text-sm">Created</span>
              <span className="text-hacker-white font-mono">
                {new Date(walletInfo.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-mono uppercase font-bold text-bitcoin-orange mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Button className="w-full" onClick={() => navigate('/addresses')}>
            Generate Address
          </Button>
          <Button className="w-full" onClick={() => navigate('/sign')}>
            Sign Transaction
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowSeedModal(true)}
          >
            View Seed Phrase
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/settings')}
          >
            Settings
          </Button>
        </div>
      </Card>

      {isMainnet && (
        <Card className="mt-6">
          <div className="bg-bitcoin-orange/10 border border-bitcoin-orange p-4">
            <p className="text-bitcoin-orange font-mono text-sm">
              ⚠️ MAINNET MODE - Real Bitcoin! Double-check all addresses before sending.
            </p>
          </div>
        </Card>
      )}

      {/* Seed Phrase Modal */}
      <Modal isOpen={showSeedModal} onClose={closeSeedModal} title="View Seed Phrase">
        {!seedPhrase ? (
          <div className="space-y-4">
            <div className="bg-alert-red/10 border border-alert-red p-4">
              <p className="text-alert-red font-mono text-sm">
                ⚠️ Never share your seed phrase! Anyone with these words can steal your Bitcoin.
              </p>
            </div>

            {seedError && (
              <div className="bg-alert-red/10 border border-alert-red p-4">
                <p className="text-alert-red font-mono text-sm">{seedError}</p>
              </div>
            )}

            <Input
              type="password"
              value={seedPassword}
              onChange={(e) => setSeedPassword(e.target.value)}
              placeholder="Enter your password to reveal"
              className="w-full"
            />

            <div className="flex gap-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={closeSeedModal}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleExportSeed}
                disabled={!seedPassword || seedLoading}
              >
                {seedLoading ? 'Verifying...' : 'Reveal Seed'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-alert-red/10 border border-alert-red p-4">
              <p className="text-alert-red font-mono text-sm">
                ⚠️ KEEP THIS PRIVATE! Write it down and store securely.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {seedPhrase.split(' ').map((word, idx) => (
                <div
                  key={idx}
                  className="bg-hacker-black/50 border border-muted-gray p-3 rounded"
                >
                  <span className="text-muted-gray font-mono text-sm">{idx + 1}.</span>
                  <span className="text-hacker-white font-mono ml-2">{word}</span>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={closeSeedModal}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
