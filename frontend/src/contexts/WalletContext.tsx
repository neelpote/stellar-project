import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isConnected, getPublicKey, requestAccess } from '@stellar/freighter-api';

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await isConnected();
        if (connected) {
          const key = await getPublicKey();
          setPublicKey(key);
          localStorage.setItem('wallet_public_key', key);
        } else {
          const savedKey = localStorage.getItem('wallet_public_key');
          if (savedKey) {
            const stillConnected = await isConnected();
            if (stillConnected) {
              setPublicKey(savedKey);
            } else {
              localStorage.removeItem('wallet_public_key');
            }
          }
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err);
        setError('Failed to check wallet connection');
        localStorage.removeItem('wallet_public_key');
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await requestAccess();
      const key = await getPublicKey();
      setPublicKey(key);
      localStorage.setItem('wallet_public_key', key);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    localStorage.removeItem('wallet_public_key');
    setError(null);
  };

  const value: WalletContextType = {
    publicKey,
    isConnected: !!publicKey,
    isLoading,
    connect,
    disconnect,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
