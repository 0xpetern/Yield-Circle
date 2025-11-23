'use client';

import { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

/**
 * Wallet Switcher for Hackathon Demo
 * Allows switching between different wallet addresses for testing
 */
export const WalletSwitcher = () => {
  const [currentWallet, setCurrentWallet] = useState<string>('');
  const [demoWallets, setDemoWallets] = useState<string[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const getWalletAddress = async () => {
      if (MiniKit.isInstalled()) {
        try {
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
    window.location.reload();
  };

  const useRealWallet = () => {
    setCurrentWallet('');
    localStorage.removeItem('demo_wallet_address');
    setIsDemoMode(false);
    window.location.reload();
  };

  if (!isDemoMode && !demoWallets.length) {
    return (
      <div style={{ 
        padding: '16px', 
        marginBottom: '24px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a202c' }}>
            Wallet
          </h3>
          <button
            onClick={addDemoWallet}
            style={{
              padding: '10px 20px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            + Add Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      marginBottom: '24px',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      maxWidth: '600px',
      width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a202c' }}>
          Wallet
        </h3>
        {isDemoMode && (
          <button
            onClick={useRealWallet}
            style={{
              padding: '8px 16px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Use Real Wallet
          </button>
        )}
      </div>
      
      {isDemoMode && currentWallet && (
        <div style={{ 
          padding: '12px', 
          borderRadius: '8px', 
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Current Wallet</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a202c', fontFamily: 'monospace' }}>
            {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {demoWallets.map((wallet, idx) => (
          <button
            key={idx}
            onClick={() => switchWallet(wallet)}
            style={{
              padding: '10px 16px',
              backgroundColor: currentWallet === wallet ? '#667eea' : '#f7fafc',
              color: currentWallet === wallet ? 'white' : '#1a202c',
              border: `2px solid ${currentWallet === wallet ? '#667eea' : '#e2e8f0'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: currentWallet === wallet ? 700 : 600,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              if (currentWallet !== wallet) {
                e.currentTarget.style.backgroundColor = '#edf2f7';
                e.currentTarget.style.borderColor = '#cbd5e0';
              }
            }}
            onMouseOut={(e) => {
              if (currentWallet !== wallet) {
                e.currentTarget.style.backgroundColor = '#f7fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
          >
            Wallet {idx + 1}: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </button>
        ))}
        <button
          onClick={addDemoWallet}
          style={{
            padding: '10px 16px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          + Add Wallet
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
