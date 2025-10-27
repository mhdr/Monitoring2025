import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Chip, Box, Stack, Fade, Badge, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Folder, Warning as WarningIcon, Error as ErrorIcon, DriveFileMove as MoveFolderIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import type { Group } from '../types/api';
import { useLanguage } from '../hooks/useLanguage';
import { useGroupAlarmStatus } from '../hooks/useGroupAlarmStatus';
import { useAuth } from '../hooks/useAuth';
import { toPersianDigits } from '../utils/numberFormatting';
import MoveGroupDialog from './MoveGroupDialog';
import DeleteGroupDialog from './DeleteGroupDialog';

interface GroupCardProps {
  group: Group;
  subgroupCount: number;
  itemCount: number;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, subgroupCount, itemCount, onClick }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [elevation, setElevation] = React.useState<number>(1);
  const [contextMenu, setContextMenu] = React.useState<{ mouseX: number; mouseY: number } | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = React.useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState<boolean>(false);
  
  // Get alarm/warning status for this group and all descendants
  const { alarmCount, warningCount, totalAffectedItems, hasAlarms, hasWarnings } = useGroupAlarmStatus(group.id);

  // Check if user is admin
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  // Display Persian name if language is Persian and nameFa is available, otherwise use name
  const displayName = (language === 'fa' && group.nameFa) ? group.nameFa : group.name;

  // Helper function to format numbers based on language
  const formatNumber = (num: number): string => {
    return language === 'fa' ? toPersianDigits(num) : String(num);
  };

  // Handle context menu open (right-click)
  const handleContextMenu = (event: React.MouseEvent) => {
    if (!isAdmin) return; // Only show menu for admins
    
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu(
      contextMenu === null
        ? { mouseX: event.clientX, mouseY: event.clientY }
        : null
    );
  };

  // Handle context menu close
  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Handle move folder action
  const handleMoveFolder = () => {
    setMoveDialogOpen(true);
    handleContextMenuClose();
  };

  // Handle delete folder action
  const handleDeleteFolder = () => {
    setDeleteDialogOpen(true);
    handleContextMenuClose();
  };

  return (
    <Fade in timeout={300}>
      <Card
        elevation={elevation}
        onMouseEnter={() => setElevation(8)}
        onMouseLeave={() => setElevation(1)}
        onContextMenu={handleContextMenu}
        sx={{
          minHeight: 160,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          // Add border if there are alarms or warnings
          ...(hasAlarms && {
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: 'error.main',
          }),
          ...(!hasAlarms && hasWarnings && {
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: 'warning.main',
          }),
        }}
        data-id-ref="group-card-root-container"
      >
      <CardActionArea
        onClick={onClick}
        title={t('openFolder')}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 2,
        }}
        data-id-ref="group-card-action-area"
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            width: '100%',
            textAlign: 'center',
            paddingBottom: 2,
            '&:last-child': {
              paddingBottom: 2,
            },
          }}
          data-id-ref="group-card-content-container"
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            data-id-ref="group-card-icon-container"
          >
            <Badge
              badgeContent={totalAffectedItems > 0 ? formatNumber(totalAffectedItems) : null}
              color={hasAlarms ? "error" : "warning"}
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  fontFamily: language === 'fa' ? 'IRANSansX, sans-serif' : 'inherit',
                },
              }}
              data-id-ref="group-card-alarm-badge"
            >
              <Folder
                sx={{
                  fontSize: '3.5rem',
                  color: hasAlarms ? 'error.main' : hasWarnings ? 'warning.main' : 'warning.main',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'transform',
                  '.MuiCardActionArea-root:hover &': {
                    transform: 'scale(1.15) rotate(-5deg)',
                  },
                }}
                data-id-ref="group-card-folder-icon"
              />
            </Badge>
          </Box>
          
          <Typography
            variant="subtitle1"
            component="h6"
            sx={{
              fontWeight: 600,
              wordBreak: 'break-word',
              lineHeight: 1.4,
              maxWidth: '100%',
            }}
            data-id-ref="group-card-title-heading"
          >
            {displayName}
          </Typography>
          
          <Stack
            direction="row"
            flexWrap="wrap"
            justifyContent="center"
            sx={{ gap: 1 }}
            data-id-ref="group-card-badges-row"
          >
            {/* Alarm count badge */}
            {alarmCount > 0 && (
              <Chip
                icon={<ErrorIcon sx={{ fontSize: 16 }} data-id-ref="group-card-alarm-icon" />}
                label={`${formatNumber(alarmCount)} ${t('itemCard.highPriorityAlarm')}`}
                color="error"
                size="small"
                sx={{
                  transition: 'transform 0.2s ease',
                  '.MuiCardActionArea-root:hover &': {
                    transform: 'scale(1.05)',
                  },
                }}
                data-id-ref="group-card-alarm-count-badge"
              />
            )}
            {/* Warning count badge */}
            {warningCount > 0 && (
              <Chip
                icon={<WarningIcon sx={{ fontSize: 16 }} data-id-ref="group-card-warning-icon" />}
                label={`${formatNumber(warningCount)} ${t('itemCard.lowPriorityAlarm')}`}
                color="warning"
                size="small"
                sx={{
                  transition: 'transform 0.2s ease',
                  '.MuiCardActionArea-root:hover &': {
                    transform: 'scale(1.05)',
                  },
                }}
                data-id-ref="group-card-warning-count-badge"
              />
            )}
            {subgroupCount > 0 && (
              <Chip
                label={`${formatNumber(subgroupCount)} ${subgroupCount === 1 ? t('folder') : t('folders2')}`}
                color="primary"
                size="small"
                sx={{
                  transition: 'transform 0.2s ease',
                  '.MuiCardActionArea-root:hover &': {
                    transform: 'scale(1.05)',
                  },
                }}
                data-id-ref="group-card-subgroup-badge"
              />
            )}
            {itemCount > 0 && (
              <Chip
                label={`${formatNumber(itemCount)} ${itemCount === 1 ? t('item') : t('items2')}`}
                color="info"
                size="small"
                sx={{
                  transition: 'transform 0.2s ease',
                  '.MuiCardActionArea-root:hover &': {
                    transform: 'scale(1.05)',
                  },
                }}
                data-id-ref="group-card-item-badge"
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>

      {/* Admin Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        data-id-ref="group-card-admin-context-menu"
      >
        <MenuItem onClick={handleMoveFolder} data-id-ref="group-card-menu-move-folder">
          <ListItemIcon>
            <MoveFolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('groupCard.adminMenu.moveFolder')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteFolder} data-id-ref="group-card-menu-delete-folder">
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('groupCard.adminMenu.deleteFolder')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Move Group Dialog */}
      <MoveGroupDialog
        open={moveDialogOpen}
        groupId={group.id}
        groupName={group.name}
        onClose={() => setMoveDialogOpen(false)}
        onSuccess={() => {
          setMoveDialogOpen(false);
          // Success feedback is handled by the dialog component
        }}
      />

      {/* Delete Group Dialog */}
      <DeleteGroupDialog
        open={deleteDialogOpen}
        groupId={group.id}
        groupName={displayName}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={() => {
          setDeleteDialogOpen(false);
          // Success feedback is handled by the dialog component
        }}
      />
    </Card>
    </Fade>
  );
};

export default GroupCard;
