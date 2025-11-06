/**
 * Example usage of the GetPermissions API endpoint
 * 
 * This file demonstrates how to use the getPermissions function
 * to retrieve user permissions for monitoring items.
 * 
 * @example
 * ```typescript
 * import { getPermissions } from '../services/api';
 * 
 * // Get permissions for a specific user
 * const permissions = await getPermissions({ userId: 'user-id-here' });
 * console.log('User has access to items:', permissions.itemPermissions);
 * 
 * // Get permissions for current user (userId can be null/undefined)
 * const myPermissions = await getPermissions({});
 * console.log('My accessible items:', myPermissions.itemPermissions);
 * ```
 */

import { getPermissions } from '../services/api';
import type { GetPermissionsRequestDto, GetPermissionsResponseDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('GetPermissionsExample');

/**
 * Fetch permissions for a specific user
 * @param userId - The user ID to fetch permissions for (optional, defaults to current user)
 * @returns Promise with the list of item IDs the user has access to
 */
export const fetchUserPermissions = async (userId?: string): Promise<string[]> => {
  try {
    const request: GetPermissionsRequestDto = {
      userId: userId ?? null,
    };

    logger.log('Fetching permissions for user:', userId ?? 'current user');

    const response: GetPermissionsResponseDto = await getPermissions(request);

    logger.log('Permissions fetched successfully:', {
      userId: userId ?? 'current user',
      itemCount: response.itemIds?.length ?? 0,
      itemIds: response.itemIds,
    });

    return response.itemIds ?? [];
  } catch (error) {
    logger.error('Error fetching user permissions:', error);
    throw error;
  }
};

/**
 * Check if a user has access to a specific item
 * @param itemId - The item ID to check access for
 * @param userId - The user ID to check (optional, defaults to current user)
 * @returns Promise<boolean> - True if user has access, false otherwise
 */
export const checkItemAccess = async (itemId: string, userId?: string): Promise<boolean> => {
  try {
    const permissions = await fetchUserPermissions(userId);
    const hasAccess = permissions.includes(itemId);

    logger.log('Access check result:', {
      userId: userId ?? 'current user',
      itemId,
      hasAccess,
    });

    return hasAccess;
  } catch (error) {
    logger.error('Error checking item access:', error);
    return false;
  }
};

/**
 * Example: Get permissions and filter items based on access
 * @param allItems - Array of all items to filter
 * @param userId - The user ID to filter for (optional, defaults to current user)
 * @returns Promise with filtered items the user has access to
 */
export const filterAccessibleItems = async <T extends { id: string }>(
  allItems: T[],
  userId?: string
): Promise<T[]> => {
  try {
    const permissions = await fetchUserPermissions(userId);
    const permissionSet = new Set(permissions);

    const accessibleItems = allItems.filter((item) => permissionSet.has(item.id));

    logger.log('Items filtered by permissions:', {
      userId: userId ?? 'current user',
      totalItems: allItems.length,
      accessibleItems: accessibleItems.length,
    });

    return accessibleItems;
  } catch (error) {
    logger.error('Error filtering accessible items:', error);
    return [];
  }
};

/**
 * Example: Usage in a React component or service
 * 
 * @example
 * ```typescript
 * import { useEffect, useState } from 'react';
 * import { fetchUserPermissions } from './getPermissionsExample';
 * 
 * function MyComponent() {
 *   const [permissions, setPermissions] = useState<string[]>([]);
 * 
 *   useEffect(() => {
 *     const loadPermissions = async () => {
 *       const userPermissions = await fetchUserPermissions();
 *       setPermissions(userPermissions);
 *     };
 *     loadPermissions();
 *   }, []);
 * 
 *   return (
 *     <div>
 *       <h2>Your Accessible Items: {permissions.length}</h2>
 *       <ul>
 *         {permissions.map((itemId) => (
 *           <li key={itemId}>{itemId}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
