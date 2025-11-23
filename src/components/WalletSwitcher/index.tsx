'use client';

import { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

/**
 * Wallet Switcher for Hackathon Demo
 * Allows switching between different wallet addresses for testing
 * Note: This is for demo purposes only - in production, use MiniKit's actual wallet
 */
export const WalletSwitcher = () => {
  const [currentWallet, setCurrentWallet] = useState<string>('');
  const [demoWallets, setDemoWallets] = useState<string[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Try to get the actual wallet address from MiniKit
    const getWalletAddress = async () => {
      if (MiniKit.isInstalled()) {
        try {
          // For demo, we'll use a placeholder - in real app, get from walletAuth
          const stored = localStorage.getItem('demo_wallet_address');
          if (stored) {
            setCurrentWallet(stored);
            setIsDemoMode(true);
          }
        } catch (error) {
          console.error('Error getting wallet address:', error);
        }
      }
    };
    getWalletAddress();

    // Load demo wallets from localStorage
    const saved = localStorage.getItem('demo_wallets');
    if (saved) {
      setDemoWallets(JSON.parse(saved));
    }
  }, []);

  const addDemoWallet = () => {
    const address = prompt('Enter wallet address (0x...):');
    if (address && address.startsWith('0x') && address.length === 42) {
      const newWallets = [...demoWallets, address];
      setDemoWallets(newWallets);
      localStorage.setItem('demo_wallets', JSON.stringify(newWallets));
      if (!currentWallet) {
        setCurrentWallet(address);
        localStorage.setItem('demo_wallet_address', address);
        setIsDemoMode(true);
      }
    } else {
      alert('Invalid address format');
    }
  };

  const switchWallet = (address: string) => {
    setCurrentWallet(address);
    localStorage.setItem('demo_wallet_address', address);
    setIsDemoMode(true);
    window.location.reload(); // Reload to update state
  };

  const useRealWallet = () => {
    setCurrentWallet('');
    localStorage.removeItem('demo_wallet_address');
    setIsDemoMode(false);
    window.location.reload();
  };

  if (!isDemoMode && !demoWallets.length) {
    return (
      <div style={{ padding: '10px', margin: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🎭 Demo Mode: Add wallet addresses for testing</p>
        <button
          onClick={addDemoWallet}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          + Add Demo Wallet
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px', margin: '10px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          🎭 Demo Mode: {isDemoMode ? 'Active' : 'Inactive'}
        </p>
        {isDemoMode && (
          <button
            onClick={useRealWallet}
            style={{
              padding: '4px 8px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Use Real Wallet
          </button>
        )}
      </div>
      
      {isDemoMode && currentWallet && (
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', wordBreak: 'break-all' }}>
          Current: {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {demoWallets.map((wallet, idx) => (
          <button
            key={idx}
            onClick={() => switchWallet(wallet)}
            style={{
              padding: '6px 12px',
              backgroundColor: currentWallet === wallet ? '#4CAF50' : '#e0e0e0',
              color: currentWallet === wallet ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Wallet {idx + 1}: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </button>
        ))}
        <button
          onClick={addDemoWallet}
          style={{
            padding: '6px 12px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
};

// Helper to get current wallet address (for use in other components)
export const getCurrentWalletAddress = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('demo_wallet_address');
};

