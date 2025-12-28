import React from 'react';
import {
  Popover,
  Paper,
  Box,
  Typography,
  Stack,
  Divider,
  alpha,
} from '@mui/material';
import { HelpOutline as HelpOutlineIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export interface HelpSection {
  title?: string;
  content: string | string[];
  type?: 'default' | 'warning' | 'tip' | 'example';
}

interface FieldHelpPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  fieldKey: string;
  title?: string;
  sections?: HelpSection[];
  maxWidth?: number;
}

const FieldHelpPopover: React.FC<FieldHelpPopoverProps> = ({
  anchorEl,
  open,
  onClose,
  fieldKey,
  title,
  sections,
  maxWidth = 500,
}) => {
  const { t } = useTranslation();

  // Get content from translations if sections not provided
  const helpTitle = title || t(`${fieldKey}.title`, { defaultValue: t('common.help') });
  const helpSections = sections || [];

  // Try to load sections from translations if not provided
  if (sections === undefined) {
    try {
      const translatedSections = t(`${fieldKey}.sections`, { returnObjects: true });
      if (Array.isArray(translatedSections)) {
        helpSections.push(...translatedSections);
      }
    } catch {
      // Fallback to single content if sections don't exist
      const content = t(`${fieldKey}.content`, { defaultValue: '' });
      if (content) {
        helpSections.push({ content });
      }
    }
  }

  const getSectionIcon = (type?: string) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'tip':
        return '💡';
      case 'example':
        return '📝';
      default:
        return null;
    }
  };

  const getSectionColor = (type?: string) => {
    switch (type) {
      case 'warning':
        return 'warning.main';
      case 'tip':
        return 'success.main';
      case 'example':
        return 'info.main';
      default:
        return 'text.primary';
    }
  };

  const renderContent = (content: string | string[]) => {
    if (Array.isArray(content)) {
      return (
        <Stack spacing={0.5}>
          {content.map((item, index) => (
            <Typography
              key={index}
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
              data-id-ref={`help-content-item-${index}`}
            >
              • {item}
            </Typography>
          ))}
        </Stack>
      );
    }
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}
        data-id-ref="help-content-text"
      >
        {content}
      </Typography>
    );
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      slotProps={{
        paper: {
          sx: {
            maxWidth,
            minWidth: 320,
            borderRadius: 2,
            boxShadow: (theme) => theme.shadows[8],
            overflow: 'hidden',
          },
        },
      }}
      data-id-ref={`field-help-popover-${fieldKey.replace(/\./g, '-')}`}
    >
      <Paper elevation={0} data-id-ref="field-help-paper">
        {/* Header */}
        <Box
          sx={{
            background: (theme) => alpha(theme.palette.info.main, 0.1),
            px: 2.5,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
          data-id-ref="field-help-header"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <HelpOutlineIcon sx={{ color: 'info.main', fontSize: 24 }} />
            <Typography variant="subtitle1" fontWeight={600}>
              {helpTitle}
            </Typography>
          </Stack>
        </Box>

        {/* Content */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            maxHeight: 400,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
          data-id-ref="field-help-content"
        >
          <Stack spacing={2} divider={<Divider />}>
            {helpSections.map((section, index) => {
              const icon = getSectionIcon(section.type);
              const color = getSectionColor(section.type);

              return (
                <Box key={index} data-id-ref={`help-section-${index}`}>
                  {section.title && (
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      gutterBottom
                      sx={{ color, display: 'flex', alignItems: 'center', gap: 0.5 }}
                      data-id-ref={`help-section-title-${index}`}
                    >
                      {icon && <span>{icon}</span>}
                      {section.title}
                    </Typography>
                  )}
                  
                  {section.type === 'example' ? (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        border: 1,
                        borderColor: 'divider',
                      }}
                      data-id-ref={`help-example-box-${index}`}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-line',
                          lineHeight: 1.6,
                        }}
                      >
                        {typeof section.content === 'string' ? section.content : section.content.join('\n')}
                      </Typography>
                    </Box>
                  ) : (
                    renderContent(section.content)
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Paper>
    </Popover>
  );
};

export default FieldHelpPopover;
