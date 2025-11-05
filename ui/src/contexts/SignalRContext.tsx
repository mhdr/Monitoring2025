/**
 * SignalRContext
 * Provides SignalR reconnect functionality to child components
 * Avoids prop drilling while keeping the SignalR connection managed at the app level
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface SignalRContextValue {
  /** Manually reconnect to SignalR hub */
  reconnect: () => Promise<void>;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

interface SignalRProviderProps {
  children: ReactNode;
  reconnect: () => Promise<void>;
}

/**
 * Provider component that wraps the app and provides SignalR reconnect function
 */
export const SignalRProvider: React.FC<SignalRProviderProps> = ({ children, reconnect }) => {
  return (
    <SignalRContext.Provider value={{ reconnect }}>
      {children}
    </SignalRContext.Provider>
  );
};

/**
 * Hook to access SignalR reconnect function
 * @throws Error if used outside SignalRProvider
 */
export const useSignalRContext = (): SignalRContextValue => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalRContext must be used within SignalRProvider');
  }
  return context;
};
