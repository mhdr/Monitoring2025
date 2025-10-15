import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Chip, Box, Stack, Fade } from '@mui/material';
import { Folder } from '@mui/icons-material';
import type { Group } from '../types/api';
import { useLanguage } from '../hooks/useLanguage';

interface GroupCardProps {
  group: Group;
  subgroupCount: number;
  itemCount: number;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, subgroupCount, itemCount, onClick }) => {
  const { t, language } = useLanguage();
  const [elevation, setElevation] = React.useState<number>(1);

  // Display Persian name if language is Persian and nameFa is available, otherwise use name
  const displayName = (language === 'fa' && group.nameFa) ? group.nameFa : group.name;

  return (
    <Fade in timeout={300}>
      <Card
        elevation={elevation}
        onMouseEnter={() => setElevation(8)}
        onMouseLeave={() => setElevation(1)}
        sx={{
          minHeight: 160,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
          },
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
              color: 'warning.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            data-id-ref="group-card-icon-container"
          >
            <Folder
              sx={{
                fontSize: '3.5rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '.MuiCardActionArea-root:hover &': {
                  transform: 'scale(1.15) rotate(-5deg)',
                  color: 'primary.main',
                },
              }}
              data-id-ref="group-card-folder-icon"
            />
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
            spacing={1}
            flexWrap="wrap"
            justifyContent="center"
            data-id-ref="group-card-badges-row"
          >
            {subgroupCount > 0 && (
              <Chip
                label={`${subgroupCount} ${subgroupCount === 1 ? t('folder') : t('folders2')}`}
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
                label={`${itemCount} ${itemCount === 1 ? t('item') : t('items2')}`}
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
    </Card>
    </Fade>
  );
};

export default GroupCard;
