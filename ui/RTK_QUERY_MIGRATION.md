# RTK Query Migration

This project has been successfully migrated from Axios to RTK Query for improved data fetching, caching, and state management.

## Key Changes

### 1. API Layer (`src/store/api/apiSlice.ts`)
- Created a comprehensive RTK Query API slice with authentication handling
- Includes base query configuration with automatic token injection
- Implements automatic logout on 401 errors for protected routes
- Provides typed API endpoints for all monitoring system operations

### 2. Authentication System
- **Auth Slice** (`src/store/slices/authSlice.ts`): Simplified to manage only auth state
- **Auth Context** (`src/contexts/AuthContext.tsx`): Updated to use RTK Query mutations
- **Auth Storage**: Moved to `authStorageHelpers` in the API slice

### 3. Store Configuration (`src/store/store.ts`)
- Added RTK Query middleware for caching and background updates
- Integrated API slice reducer

### 4. Type Definitions (`src/types/api.ts`)
- Added comprehensive TypeScript types for all API responses
- Includes types for dashboard data, alarms, audit trail, and more

## Available API Hooks

### Authentication
- `useLoginMutation()` - Login with credentials
- `useRefreshTokenMutation()` - Refresh JWT token
- `useGetCurrentUserQuery()` - Get current user profile

### Dashboard & Monitoring
- `useGetDashboardDataQuery()` - Dashboard statistics and status
- `useGetActiveAlarmsQuery()` - Active system alarms
- `useGetAlarmLogQuery(params)` - Paginated alarm history
- `useGetAuditTrailQuery(params)` - Paginated audit trail

### Alarm Management
- `useAcknowledgeAlarmMutation()` - Acknowledge an alarm
- `useToggleAlarmMutation()` - Enable/disable alarms

## Example Usage

### In Components
```tsx
import { useGetActiveAlarmsQuery, useAcknowledgeAlarmMutation } from '../store/api/apiSlice';

const AlarmsComponent = () => {
  const { data: alarms, error, isLoading } = useGetActiveAlarmsQuery();
  const [acknowledgeAlarm, { isLoading: isAcknowledging }] = useAcknowledgeAlarmMutation();

  const handleAcknowledge = async (alarmId: string) => {
    try {
      await acknowledgeAlarm({ alarmId }).unwrap();
      // Data automatically refetches due to cache invalidation
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
    }
  };

  if (isLoading) return <Spinner />;
  if (error) return <Alert variant="danger">Error loading data</Alert>;
  
  return (
    <div>
      {alarms?.map(alarm => (
        <div key={alarm.id}>
          {alarm.title}
          <Button onClick={() => handleAcknowledge(alarm.id)}>
            Acknowledge
          </Button>
        </div>
      ))}
    </div>
  );
};
```

### Authentication
```tsx
import { useAuth } from '../hooks/useAuth';

const LoginComponent = () => {
  const { login, isLoading } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // User is automatically authenticated and redirected
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // ... rest of component
};
```

## Benefits of RTK Query

1. **Automatic Caching**: Reduces unnecessary API calls
2. **Background Updates**: Keeps data fresh automatically
3. **Loading States**: Built-in loading and error states
4. **Optimistic Updates**: UI updates before API confirmation
5. **Cache Invalidation**: Smart cache management with tags
6. **TypeScript Support**: Fully typed API calls and responses
7. **DevTools Integration**: Enhanced debugging experience
8. **Retry Logic**: Automatic retry on failed requests
9. **Polling**: Automatic data refetching at intervals
10. **Normalized State**: Efficient state updates and access

## Configuration

### Base URL
The API base URL is configured in `src/store/api/apiSlice.ts`:
```typescript
const API_BASE_URL = 'https://localhost:7136';
```

### Authentication
- JWT tokens are automatically included in request headers
- Tokens are stored in localStorage (persistent) or sessionStorage (session-only)
- Automatic logout on 401 errors for protected routes
- Login endpoint excluded from automatic logout logic

### Cache Tags
Cache invalidation is managed using these tags:
- `Auth` - Authentication-related data
- `User` - User profile data
- `Alarm` - Alarm-related data
- `Dashboard` - Dashboard statistics
- `AuditTrail` - Audit log entries

## Migration Notes

1. **Removed Dependencies**: `axios` and `@types/axios` have been removed
2. **Old API Client**: `src/utils/apiClient.ts` has been deleted
3. **Auth Slice**: Simplified to only manage local auth state
4. **Context Compatibility**: Auth context maintains the same interface
5. **Component Updates**: Updated examples show RTK Query usage patterns

## Next Steps

1. Add remaining API endpoints as needed
2. Implement polling for real-time updates
3. Add optimistic updates for mutations
4. Configure retry policies for specific endpoints
5. Add request/response logging for debugging
6. Implement offline support if needed