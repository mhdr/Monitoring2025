/**
 * Authentication Broadcast Channel Utility
 * 
 * Shares authentication state between browser tabs/windows using the BroadcastChannel API.
 * This reduces redundant auth checks and improves new tab load performance by:
 * 1. Sharing login state immediately when user logs in
 * 2. Broadcasting logout events to all tabs
 * 3. Sharing token refresh events
 * 
 * Benefits:
 * - New tabs can skip auth validation if another tab is already authenticated
 * - Logout in one tab immediately logs out all tabs
 * - Reduces API calls for token validation
 * 
 * Browser Support: Modern browsers (Chrome 54+, Firefox 38+, Safari 15.4+)
 */

export type AuthBroadcastMessage =
  | { type: 'LOGIN'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'AUTH_CHECK_REQUEST' }
  | { type: 'AUTH_CHECK_RESPONSE'; payload: { isAuthenticated: boolean } };

// BroadcastChannel instance (singleton)
let authChannel: BroadcastChannel | null = null;

/**
 * Initialize the authentication broadcast channel
 * Call this once during app initialization
 */
export const initAuthBroadcast = (): BroadcastChannel | null => {
  // Check if BroadcastChannel is supported
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel API is not supported in this browser');
    return null;
  }

  // Return existing channel if already initialized
  if (authChannel) {
    return authChannel;
  }

  try {
    authChannel = new BroadcastChannel('auth-channel');
    console.debug('Auth BroadcastChannel initialized');
    return authChannel;
  } catch (error) {
    console.error('Failed to initialize Auth BroadcastChannel:', error);
    return null;
  }
};

/**
 * Broadcast a login event to all tabs
 */
export const broadcastLogin = (accessToken: string, refreshToken: string): void => {
  const channel = authChannel || initAuthBroadcast();
  if (!channel) return;

  try {
    const message: AuthBroadcastMessage = {
      type: 'LOGIN',
      payload: { accessToken, refreshToken },
    };
    channel.postMessage(message);
    console.debug('Broadcasted LOGIN event');
  } catch (error) {
    console.error('Failed to broadcast LOGIN event:', error);
  }
};

/**
 * Broadcast a logout event to all tabs
 */
export const broadcastLogout = (): void => {
  const channel = authChannel || initAuthBroadcast();
  if (!channel) return;

  try {
    const message: AuthBroadcastMessage = { type: 'LOGOUT' };
    channel.postMessage(message);
    console.debug('Broadcasted LOGOUT event');
  } catch (error) {
    console.error('Failed to broadcast LOGOUT event:', error);
  }
};

/**
 * Broadcast a token refresh event to all tabs
 */
export const broadcastTokenRefresh = (accessToken: string, refreshToken: string): void => {
  const channel = authChannel || initAuthBroadcast();
  if (!channel) return;

  try {
    const message: AuthBroadcastMessage = {
      type: 'TOKEN_REFRESHED',
      payload: { accessToken, refreshToken },
    };
    channel.postMessage(message);
    console.debug('Broadcasted TOKEN_REFRESHED event');
  } catch (error) {
    console.error('Failed to broadcast TOKEN_REFRESHED event:', error);
  }
};

/**
 * Request auth status from other tabs
 * Useful when a new tab opens and wants to check if another tab is authenticated
 */
export const requestAuthStatus = (): void => {
  const channel = authChannel || initAuthBroadcast();
  if (!channel) return;

  try {
    const message: AuthBroadcastMessage = { type: 'AUTH_CHECK_REQUEST' };
    channel.postMessage(message);
    console.debug('Broadcasted AUTH_CHECK_REQUEST');
  } catch (error) {
    console.error('Failed to broadcast AUTH_CHECK_REQUEST:', error);
  }
};

/**
 * Respond to auth status request
 */
export const respondAuthStatus = (isAuthenticated: boolean): void => {
  const channel = authChannel || initAuthBroadcast();
  if (!channel) return;

  try {
    const message: AuthBroadcastMessage = {
      type: 'AUTH_CHECK_RESPONSE',
      payload: { isAuthenticated },
    };
    channel.postMessage(message);
    console.debug('Broadcasted AUTH_CHECK_RESPONSE:', isAuthenticated);
  } catch (error) {
    console.error('Failed to broadcast AUTH_CHECK_RESPONSE:', error);
  }
};

/**
 * Subscribe to auth broadcast messages
 * @param callback - Function to call when a message is received
 * @returns Unsubscribe function
 */
export const subscribeToAuthBroadcast = (
  callback: (message: AuthBroadcastMessage) => void
): (() => void) => {
  const channel = authChannel || initAuthBroadcast();
  if (!channel) {
    return () => {}; // No-op unsubscribe
  }

  const handler = (event: MessageEvent<AuthBroadcastMessage>) => {
    try {
      callback(event.data);
    } catch (error) {
      console.error('Error handling auth broadcast message:', error);
    }
  };

  channel.addEventListener('message', handler);

  // Return unsubscribe function
  return () => {
    channel.removeEventListener('message', handler);
  };
};

/**
 * Close the broadcast channel
 * Call this during app cleanup
 */
export const closeAuthBroadcast = (): void => {
  if (authChannel) {
    authChannel.close();
    authChannel = null;
    console.debug('Auth BroadcastChannel closed');
  }
};
