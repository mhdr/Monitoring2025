/**
 * gRPC Client Service
 * Configures the gRPC-web transport for browser-based gRPC communication
 * with the .NET backend server streaming service
 */

import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { MonitoringService } from '../gen/monitoring_pb';

// Base URL for the gRPC server - matches the backend API
// The .NET server must be configured with gRPC-web middleware
const GRPC_BASE_URL = 'https://localhost:7136';

/**
 * Creates the gRPC-web transport for browser clients
 * Uses the fetch API under the hood for HTTP/1.1 communication
 */
const transport = createGrpcWebTransport({
  baseUrl: GRPC_BASE_URL,
  // Add credentials to include cookies/auth headers
  fetch: (input, init) => 
    fetch(input, { 
      ...init, 
      credentials: 'include' 
    }),
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
