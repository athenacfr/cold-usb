import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { WalletSetup } from './components/wallet/WalletSetup';
import { CreateWallet } from './components/wallet/CreateWallet';
import { ImportWallet } from './components/wallet/ImportWallet';
import { UnlockWallet } from './components/wallet/UnlockWallet';
import { WalletDashboard } from './components/wallet/WalletDashboard';
import { AddressManager } from './components/address/AddressManager';
import { SigningFlow } from './components/transaction/SigningFlow';
import { Settings } from './components/settings/Settings';
import { PrivacyOverlay } from './components/common/PrivacyOverlay';
import { useWalletStore } from './store/walletStore';
import { useAutoLock } from './hooks/useAutoLock';

function App() {
  const { isLocked, lockWallet, walletExists, checkWalletExists, setWalletExists } = useWalletStore();

  // Auto-lock wallet after 5 minutes of inactivity
  useAutoLock();

  useEffect(() => {
    // Check if wallet exists on mount
    const checkWallet = async () => {
      try {
        await checkWalletExists();
      } catch (error) {
        console.error('Failed to check wallet:', error);
        setWalletExists(false);
      }
    };

    checkWallet();
  }, []);

  // Show loading while checking
  if (walletExists === null) {
    return (
      <div className="min-h-screen bg-hacker-black flex items-center justify-center">
        <div className="text-bitcoin-orange font-mono text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <PrivacyOverlay />
      <Router>
        <Routes>
        {/* Setup routes (no wallet exists yet) */}
        {!walletExists && (
          <>
            <Route path="/" element={<WalletSetup />} />
            <Route path="/create" element={<CreateWallet />} />
            <Route path="/import" element={<ImportWallet />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* Main app routes (wallet exists) */}
        {walletExists && (
          <>
            <Route path="/unlock" element={<UnlockWallet />} />

            {/* Protected routes (require unlocked wallet) */}
            {isLocked ? (
              <Route path="*" element={<Navigate to="/unlock" replace />} />
            ) : (
              <>
                <Route
                  path="/dashboard"
                  element={
                    <Layout isLocked={isLocked} onLock={lockWallet}>
                      <WalletDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/addresses"
                  element={
                    <Layout isLocked={isLocked} onLock={lockWallet}>
                      <AddressManager />
                    </Layout>
                  }
                />
                <Route
                  path="/sign"
                  element={
                    <Layout isLocked={isLocked} onLock={lockWallet}>
                      <SigningFlow />
                    </Layout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Layout isLocked={isLocked} onLock={lockWallet}>
                      <Settings />
                    </Layout>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </>
            )}
          </>
        )}
      </Routes>
      </Router>
    </>
  );
}

export default App;
