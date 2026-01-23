import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { CloseButton } from '../common/CloseButton';

export const WalletSetup: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-hacker-black flex items-center justify-center p-6">
      <CloseButton />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl text-bitcoin-orange mb-4">[$]</div>
          <h1 className="text-3xl font-mono uppercase font-bold text-hacker-white mb-2">
            Cold USB Wallet
          </h1>
          <p className="text-muted-gray font-mono">
            Secure offline Bitcoin wallet
          </p>
        </div>

        <Card className="space-y-4">
          <h2 className="text-xl font-mono uppercase font-bold text-bitcoin-orange text-center mb-6">
            Welcome
          </h2>

          <Button
            className="w-full"
            onClick={() => navigate('/create')}
          >
            Create New Wallet
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/import')}
          >
            Import Existing Wallet
          </Button>
        </Card>

        <p className="text-center text-muted-gray text-sm font-mono mt-6">
          This wallet operates completely offline for maximum security
        </p>
      </div>
    </div>
  );
};
