import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { PasswordConfirmInput } from '../common/PasswordInput';
import { getPasswordValidationState } from '../../utils/validation';
import { useWalletStore } from '../../store/walletStore';

export const Settings: React.FC = () => {
  const { walletInfo } = useWalletStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const network = walletInfo?.network || 'testnet';
  const isMainnet = network === 'bitcoin' || network === 'mainnet';

  const isNewPasswordValid = () => {
    const state = getPasswordValidationState(newPassword);
    return state.isValid && newPassword === confirmPassword;
  };

  const handleChangePassword = async () => {
    if (!isNewPasswordValid()) return;

    setPasswordLoading(true);
    setPasswordError('');
    try {
      await invoke('change_password', {
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        closePasswordModal();
      }, 2000);
    } catch (err) {
      setPasswordError(`Failed to change password: ${err}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
        Settings
      </h2>

      <Card className="mb-6">
        <h3 className="text-xl font-mono uppercase font-bold text-bitcoin-orange mb-4">
          Wallet Info
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-gray font-mono uppercase text-sm">Network</span>
            <span className={`font-mono ${isMainnet ? 'text-bitcoin-orange' : 'text-terminal-green'}`}>
              {isMainnet ? 'Mainnet' : 'Testnet'}
            </span>
          </div>
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

      <Card className="mb-6">
        <h3 className="text-xl font-mono uppercase font-bold text-bitcoin-orange mb-4">
          Security
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-hacker-white font-mono">Change Password</p>
              <p className="text-muted-gray font-mono text-sm">Update your wallet encryption password</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowPasswordModal(true)}
            >
              Change
            </Button>
          </div>

          <div className="border-t border-muted-gray/30 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-hacker-white font-mono">Auto-Lock</p>
                <p className="text-muted-gray font-mono text-sm">Wallet locks after 5 minutes of inactivity</p>
              </div>
              <span className="text-terminal-green font-mono">Enabled</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-mono uppercase font-bold text-bitcoin-orange mb-4">
          About
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-gray font-mono">Version</span>
            <span className="text-hacker-white font-mono">0.1.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-gray font-mono">Build</span>
            <span className="text-hacker-white font-mono">Offline Cold Wallet</span>
          </div>
        </div>
      </Card>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={closePasswordModal} title="Change Password">
        {passwordSuccess ? (
          <div className="space-y-4">
            <div className="bg-terminal-green/10 border border-terminal-green p-4">
              <p className="text-terminal-green font-mono text-sm">
                Password changed successfully!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {passwordError && (
              <div className="bg-alert-red/10 border border-alert-red p-4">
                <p className="text-alert-red font-mono text-sm">{passwordError}</p>
              </div>
            )}

            <Input
              type="password"
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full"
            />

            <div className="border-t border-muted-gray/30 pt-4">
              <p className="text-muted-gray font-mono text-sm mb-4">New Password</p>
              <PasswordConfirmInput
                password={newPassword}
                confirmPassword={confirmPassword}
                onPasswordChange={setNewPassword}
                onConfirmChange={setConfirmPassword}
                showRules={true}
                showStrength={true}
              />
            </div>

            <div className="flex gap-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={closePasswordModal}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleChangePassword}
                disabled={!isNewPasswordValid() || !currentPassword || passwordLoading}
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
