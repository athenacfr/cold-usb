import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CloseButton } from '../common/CloseButton';
import { useWalletStore } from '../../store/walletStore';

interface StoredWalletInfo {
  network: string;
  fingerprint: string;
  created_at: string;
}

export const UnlockWallet: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState<StoredWalletInfo | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { unlockWallet, deleteWallet } = useWalletStore();

  // Load wallet info on mount
  useEffect(() => {
    const loadWalletInfo = async () => {
      try {
        const info = await invoke<StoredWalletInfo>('get_wallet_info');
        setWalletInfo(info);
      } catch (err) {
        // Wallet info not available yet, that's ok
        console.log('No wallet info available:', err);
      }
    };
    loadWalletInfo();
  }, []);

  const handleUnlock = async () => {
    setLoading(true);
    setError('');
    try {
      await unlockWallet(password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid password. Please try again.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.length > 0) {
      handleUnlock();
    }
  };

  const handleDeleteWallet = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setDeleting(true);
    try {
      await deleteWallet();
      navigate('/');
    } catch (err) {
      setError(`Failed to delete wallet: ${err}`);
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-hacker-black flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner />
              <p className="text-hacker-white font-mono mt-4">Unlocking wallet...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hacker-black flex items-center justify-center p-6">
      <CloseButton />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl text-bitcoin-orange mb-4">[$]</div>
          <h1 className="text-3xl font-mono uppercase font-bold text-hacker-white">
            Wallet Locked
          </h1>
        </div>

        <Card className="space-y-4">
          {walletInfo && (
            <div className="space-y-2 mb-4 pb-4 border-b border-muted-gray/30">
              <div className="flex justify-between">
                <span className="text-muted-gray font-mono text-sm">Network:</span>
                <span className={`font-mono ${walletInfo.network === 'bitcoin' ? 'text-bitcoin-orange' : 'text-terminal-green'}`}>
                  {walletInfo.network === 'bitcoin' ? 'Mainnet' : 'Testnet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-gray font-mono text-sm">Fingerprint:</span>
                <span className="text-hacker-white font-mono">{walletInfo.fingerprint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-gray font-mono text-sm">Created:</span>
                <span className="text-hacker-white font-mono">{formatDate(walletInfo.created_at)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-alert-red/10 border border-alert-red p-4">
              <p className="text-alert-red font-mono text-sm">{error}</p>
            </div>
          )}

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password..."
          />

          <Button
            className="w-full"
            onClick={handleUnlock}
            disabled={!password}
          >
            Unlock
          </Button>
        </Card>

        <p className="text-center text-muted-gray text-sm font-mono mt-6">
          This wallet operates completely offline for maximum security
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full text-center text-muted-gray text-sm font-mono mt-4 hover:text-alert-red transition-colors"
        >
          Forgot password? Delete wallet
        </button>
      </div>

      {/* Delete Wallet Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete Wallet">
        <div className="space-y-4">
          <div className="bg-alert-red/10 border border-alert-red p-4">
            <p className="text-alert-red font-mono text-sm font-bold mb-2">
              WARNING: This action cannot be undone!
            </p>
            <p className="text-alert-red font-mono text-sm">
              Deleting this wallet will permanently remove all data. You will only be able to recover your funds if you have your seed phrase backed up.
            </p>
          </div>

          <p className="text-hacker-white font-mono text-sm">
            Type <span className="text-bitcoin-orange font-bold">DELETE</span> to confirm:
          </p>

          <Input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
            placeholder="Type DELETE to confirm"
            className="w-full"
          />

          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={closeDeleteModal}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-alert-red border-alert-red hover:bg-alert-red/80"
              onClick={handleDeleteWallet}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Wallet'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
