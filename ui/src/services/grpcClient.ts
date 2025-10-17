/**
 * gRPC Client Service
 * Configures the gRPC-web transport for browser-based gRPC communication
 * with the .NET backend server streaming service
 */

import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { MonitoringService } from '../gen/monitoring_pb';
import { authStorageHelpers } from '../utils/authStorage';

// Base URL for the gRPC server - matches the backend API
// The .NET server must be configured with gRPC-web middleware
const GRPC_BASE_URL = 'https://localhost:7136';

/**
 * Creates the gRPC-web transport for browser clients
 * Uses the fetch API under the hood for HTTP/1.1 communication
 * Includes JWT authentication headers automatically
 */
const transport = createGrpcWebTransport({
  baseUrl: GRPC_BASE_URL,
  // Add credentials and authentication headers
  fetch: (input, init) => {
    // Use synchronous token access from cache (populated by AuthContext)
    // This is necessary because fetch interceptor must be synchronous
    const token = authStorageHelpers.getStoredTokenSync();
    const headers = new Headers(init?.headers);
    
    // Add JWT Bearer token if available
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return fetch(input, { 
      ...init, 
      credentials: 'include',
      headers 
    });
  },
});

/**
 * Type-safe gRPC client for the MonitoringService
 * Provides access to the StreamActiveAlarms server streaming RPC
 */
export const monitoringClient = createClient(MonitoringService, transport);

/**
 * Export the transport for custom use cases or testing
 */
export { transport };
