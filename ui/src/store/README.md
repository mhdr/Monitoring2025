# Redux Setup for Monitoring2025 UI

This project uses Redux Toolkit for state management, specifically for authentication state.

## Structure

```
src/
  store/
    slices/
      authSlice.ts     # Authentication state and actions
    store.ts           # Store configuration
    index.ts           # Store exports
  hooks/
    useRedux.ts        # Typed Redux hooks
    useAuthRedux.ts    # Auth-specific hook with familiar API
```

## Authentication State

The auth slice manages:
- `user`: Current logged-in user object
- `token`: JWT authentication token
- `isAuthenticated`: Boolean auth status
- `isLoading`: Loading state for async operations
- `error`: Error messages from failed operations

## Available Actions

### Async Actions (Thunks)
- `loginAsync(credentials)`: Authenticate user
- `logoutAsync()`: Logout user
- `initializeAuth()`: Load auth state from storage

### Sync Actions
- `clearError()`: Clear error state
- `resetAuth()`: Reset entire auth state

## Usage Examples

### In Components
```tsx
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { loginAsync, logoutAsync } from '../store/slices/authSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading, error } = useAppSelector(state => state.auth);

  const handleLogin = async () => {
    await dispatch(loginAsync({ username: 'user', password: 'pass' }));
  };

  const handleLogout = () => {
    dispatch(logoutAsync());
  };
  
  // Component JSX...
};
```

### Using the Auth Hook (Familiar API)
```tsx
import { useAuthRedux } from '../hooks/useAuthRedux';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuthRedux();
  
  // Usage similar to the old useAuth hook
};
```

## Migration from AuthContext

The Redux implementation replaces the previous AuthContext pattern:

**Before (Context):**
```tsx
const { user, isAuthenticated, login, logout } = useAuth();
```

**After (Redux):**
```tsx
const { user, isAuthenticated } = useAppSelector(state => state.auth);
const dispatch = useAppDispatch();
const handleLogin = () => dispatch(loginAsync(credentials));
const handleLogout = () => dispatch(logoutAsync());
```

**Or using the compatibility hook:**
```tsx
const { user, isAuthenticated, login, logout } = useAuthRedux();
```

## Redux DevTools

Redux DevTools are enabled in development mode with enhanced tracing for better debugging experience.

## Key Benefits

1. **Predictable State**: Centralized auth state management
2. **Time Travel Debugging**: Redux DevTools integration
3. **Type Safety**: Full TypeScript integration
4. **Performance**: Optimized re-renders with useSelector
5. **Testing**: Easier to unit test Redux logic
6. **Scalability**: Easy to add more slices as the app grows