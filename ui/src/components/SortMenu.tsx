/**
 * SortMenu Component
 * Provides a dropdown menu for selecting sort options with direction toggle
 * 
 * Features:
 * - MUI-based dropdown menu
 * - Internationalized labels (fa/en)
 * - Visual indicators for active sort
 * - Direction toggle with icons
 * - Keyboard accessible
 */

import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Sort as SortIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
  Close as ClearIcon,
  Check as CheckIcon,
  SortByAlpha as NameIcon,
  Numbers as ValueIcon,
  Error as AlarmIcon,
  Category as TypeIcon,
  Tag as PointIcon,
  Schedule as TimestampIcon,
} from '@mui/icons-material';
import type { SortField, SortConfig } from '../types/sort';
import { SORT_OPTIONS } from '../types/sort';
import { useLanguage } from '../hooks/useLanguage';

/**
 * Component props
 */
interface SortMenuProps {
  /** Current sort configuration */
  sortConfig: SortConfig;
  /** Callback when sort field changes */
  onSortFieldChange: (field: SortField) => void;
  /** Callback when sort direction toggles */
  onDirectionToggle: () => void;
  /** Callback to reset sort */
  onReset: () => void;
  /** Optional custom button element ID for testing */
  'data-id-ref'?: string;
}

/**
 * Get icon for sort field
 */
const getSortFieldIcon = (field: SortField) => {
  switch (field) {
    case 'name':
      return <NameIcon fontSize="small" />;
    case 'value':
      return <ValueIcon fontSize="small" />;
    case 'alarm':
      return <AlarmIcon fontSize="small" />;
    case 'type':
      return <TypeIcon fontSize="small" />;
    case 'pointNumber':
      return <PointIcon fontSize="small" />;
    case 'timestamp':
      return <TimestampIcon fontSize="small" />;
    case 'none':
    default:
      return <SortIcon fontSize="small" />;
  }
};

/**
 * SortMenu component
 * Displays a menu button with sort options
 * 
 * @example
 * <SortMenu
 *   sortConfig={sortConfig}
 *   onSortFieldChange={setSortField}
 *   onDirectionToggle={toggleDirection}
 *   onReset={resetSort}
 *   data-id-ref="monitoring-sort-menu"
 * />
 */
export const SortMenu: React.FC<SortMenuProps> = ({
  sortConfig,
  onSortFieldChange,
  onDirectionToggle,
  onReset,
  'data-id-ref': dataIdRef = 'sort-menu',
}) => {
  const { t } = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleSortFieldSelect = (field: SortField) => {
    onSortFieldChange(field);
    handleClose();
  };
  
  const handleDirectionToggle = () => {
    onDirectionToggle();
  };
  
  const handleReset = () => {
    onReset();
    handleClose();
  };
  
  // Get current sort field icon
  const currentIcon = getSortFieldIcon(sortConfig.field);
  
  return (
    <>
      <Tooltip title={t('sort.tooltip')}>
        <IconButton
          onClick={handleClick}
          data-id-ref={dataIdRef}
          aria-label={t('sort.tooltip')}
          aria-controls={open ? 'sort-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          color={sortConfig.field !== 'none' ? 'primary' : 'default'}
        >
          {currentIcon}
        </IconButton>
      </Tooltip>
      
      <Menu
        id="sort-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        data-id-ref={`${dataIdRef}-dropdown`}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary">
            {t('sort.currentSort')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="body2" fontWeight="medium">
              {t(SORT_OPTIONS.find(opt => opt.field === sortConfig.field)?.labelKey || 'sort.fields.none')}
            </Typography>
            {sortConfig.field !== 'none' && (
              <IconButton
                size="small"
                onClick={handleDirectionToggle}
                data-id-ref={`${dataIdRef}-toggle-direction`}
                aria-label={t('sort.toggleDirection')}
              >
                {sortConfig.direction === 'asc' ? (
                  <AscIcon fontSize="small" />
                ) : (
                  <DescIcon fontSize="small" />
                )}
              </IconButton>
            )}
          </Box>
        </Box>
        
        <Divider />
        
        {SORT_OPTIONS.map((option) => {
          const isActive = sortConfig.field === option.field;
          
          return (
            <MenuItem
              key={option.field}
              onClick={() => handleSortFieldSelect(option.field)}
              selected={isActive}
              data-id-ref={`${dataIdRef}-option-${option.field}`}
            >
              <ListItemIcon>
                {getSortFieldIcon(option.field)}
              </ListItemIcon>
              <ListItemText>
                {t(option.labelKey)}
              </ListItemText>
              {isActive && (
                <CheckIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
              )}
            </MenuItem>
          );
        })}
        
        {sortConfig.field !== 'none' && <Divider />}
        {sortConfig.field !== 'none' && (
          <MenuItem
            onClick={handleReset}
            data-id-ref={`${dataIdRef}-reset`}
          >
            <ListItemIcon>
              <ClearIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t('sort.reset')}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default SortMenu;
