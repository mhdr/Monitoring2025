/**
 * Item Sort Menu Component
 * Provides a dropdown menu for selecting sort field and direction
 */

import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import {
  Numbers as NumbersIcon,
  SortByAlpha as SortByAlphaIcon,
  Category as CategoryIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
  NotificationsActive as NotificationsActiveIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { ItemSortField, SortDirection, ItemSortConfig } from '../types/sorting';
import { useTranslation } from '../hooks/useTranslation';

interface ItemSortMenuProps {
  /** Anchor element for the menu */
  anchorEl: HTMLElement | null;
  /** Whether the menu is open */
  open: boolean;
  /** Callback when menu is closed */
  onClose: () => void;
  /** Current sort configuration */
  sortConfig: ItemSortConfig;
  /** Callback when sort field is selected */
  onSortFieldChange: (field: ItemSortField) => void;
  /** Callback when sort direction is selected */
  onSortDirectionChange: (direction: SortDirection) => void;
  /** Callback when reset is clicked */
  onReset: () => void;
}

/**
 * Get icon for sort field
 */
const getSortFieldIcon = (field: ItemSortField): React.ReactNode => {
  switch (field) {
    case 'pointNumber':
      return <NumbersIcon fontSize="small" data-id-ref="sort-menu-icon-point-number" />;
    case 'name':
      return <SortByAlphaIcon fontSize="small" data-id-ref="sort-menu-icon-name" />;
    case 'itemType':
      return <CategoryIcon fontSize="small" data-id-ref="sort-menu-icon-item-type" />;
    case 'value':
      return <SpeedIcon fontSize="small" data-id-ref="sort-menu-icon-value" />;
    case 'time':
      return <ScheduleIcon fontSize="small" data-id-ref="sort-menu-icon-time" />;
    case 'alarmStatus':
      return <NotificationsActiveIcon fontSize="small" data-id-ref="sort-menu-icon-alarm-status" />;
    default:
      return null;
  }
};

const ItemSortMenu: React.FC<ItemSortMenuProps> = ({
  anchorEl,
  open,
  onClose,
  sortConfig,
  onSortFieldChange,
  onSortDirectionChange,
  onReset,
}) => {
  const { t } = useTranslation();

  const sortFields: ItemSortField[] = [
    'pointNumber',
    'name',
    'itemType',
    'value',
    'time',
    'alarmStatus',
  ];

  const handleSortFieldClick = (field: ItemSortField) => {
    onSortFieldChange(field);
  };

  const handleSortDirectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSortDirectionChange(event.target.value as SortDirection);
  };

  const handleResetClick = () => {
    onReset();
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      data-id-ref="item-sort-menu"
      PaperProps={{
        sx: {
          minWidth: 280,
          maxWidth: 400,
        },
      }}
    >
      {/* Sort By Section */}
      <Box sx={{ px: 2, py: 1 }} data-id-ref="item-sort-menu-sort-by-header">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {t('itemSortMenu.sortBy')}
        </Typography>
      </Box>

      {sortFields.map((field) => (
        <MenuItem
          key={field}
          selected={sortConfig.field === field}
          onClick={() => handleSortFieldClick(field)}
          data-id-ref={`item-sort-menu-field-${field}`}
        >
          <ListItemIcon>{getSortFieldIcon(field)}</ListItemIcon>
          <ListItemText primary={t(`itemSortMenu.fields.${field}`)} />
        </MenuItem>
      ))}

      <Divider sx={{ my: 1 }} />

      {/* Sort Direction Section */}
      <Box sx={{ px: 2, py: 1 }} data-id-ref="item-sort-menu-direction-header">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {t('itemSortMenu.sortDirection')}
        </Typography>
      </Box>

      <Box sx={{ px: 2, pb: 1 }} data-id-ref="item-sort-menu-direction-options">
        <RadioGroup
          value={sortConfig.direction}
          onChange={handleSortDirectionChange}
        >
          <FormControlLabel
            value="asc"
            control={<Radio size="small" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowUpwardIcon fontSize="small" data-id-ref="item-sort-menu-direction-asc-icon" />
                <Typography variant="body2">{t('itemSortMenu.directions.asc')}</Typography>
              </Box>
            }
            data-id-ref="item-sort-menu-direction-asc"
          />
          <FormControlLabel
            value="desc"
            control={<Radio size="small" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowDownwardIcon fontSize="small" data-id-ref="item-sort-menu-direction-desc-icon" />
                <Typography variant="body2">{t('itemSortMenu.directions.desc')}</Typography>
              </Box>
            }
            data-id-ref="item-sort-menu-direction-desc"
          />
        </RadioGroup>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Reset Button */}
      <MenuItem onClick={handleResetClick} data-id-ref="item-sort-menu-reset">
        <ListItemIcon>
          <RefreshIcon fontSize="small" data-id-ref="item-sort-menu-reset-icon" />
        </ListItemIcon>
        <ListItemText primary={t('itemSortMenu.reset')} />
      </MenuItem>
    </Menu>
  );
};

export default ItemSortMenu;
