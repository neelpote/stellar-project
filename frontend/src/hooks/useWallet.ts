import { useState, useEffect } from 'react';
import { isConnected, getPublicKey, setAllowed } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';
import { WalletState } from '../types';

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    publicKey: null,
    isConnected: false,
  });

  const connectWallet = async () => {
    try {
      const connected = await isConnected();

      if (!connected) {
        const install = window.confirm('Freighter wallet is not installed. Click OK to open the install page.');
        if (install) window.open('https://www.freighter.app/', '_blank');
        return;
      }

      await setAllowed();
      const publicKey = await getPublicKey();

      if (!publicKey) {
        throw new Error('No public key received from wallet');
      }

      try {
        StellarSdk.StrKey.decodeEd25519PublicKey(publicKey);
      } catch {
        throw new Error('Invalid Stellar address format');
      }

      setWallet({ publicKey, isConnected: true });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const disconnectWallet = () => {
    setWallet({ publicKey: null, isConnected: false });
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await isConnected();
        if (connected) {
          const publicKey = await getPublicKey();
          if (publicKey) {
            try {
              StellarSdk.StrKey.decodeEd25519PublicKey(publicKey);
              setWallet({ publicKey, isConnected: true });
            } catch {
              // Invalid key format — don't restore the session
            }
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();
  }, []);

  return { wallet, connectWallet, disconnectWallet };
};
