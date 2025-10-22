import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import { createLogger } from '../../utils/logger';

const logger = createLogger('MonitoringLogo');

interface MonitoringLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
  'data-id-ref'?: string;
}

const MonitoringLogo: React.FC<MonitoringLogoProps> = ({
  size = 40,
  animated = true,
  className,
  'data-id-ref': dataIdRef = 'monitoring-logo'
}) => {
  const theme = useTheme();

  logger.debug('Rendering MonitoringLogo', { size, animated, theme: theme.palette.mode });

  return (
    <Box
      component="div"
      className={className}
      data-id-ref={dataIdRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        data-id-ref={`${dataIdRef}-svg`}
      >
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={theme.palette.primary.main}
          fillOpacity="0.1"
          stroke={theme.palette.primary.main}
          strokeWidth="2"
          data-id-ref={`${dataIdRef}-background-circle`}
        >
          {animated && (
            <>
              <animate
                attributeName="stroke-width"
                values="2;3;2"
                dur="4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.3;0.8;0.3"
                dur="4s"
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
        
        {/* Animated Pulse Rings */}
        {animated && (
          <>
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke={theme.palette.primary.light}
              strokeWidth="3"
              strokeOpacity="0.8"
              data-id-ref={`${dataIdRef}-pulse-ring-1`}
            >
              <animate
                attributeName="r"
                values="15;42;15"
                dur="2.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="1;0.05;1"
                dur="2.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-width"
                values="3;1;3"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
            
            <circle
              cx="50"
              cy="50"
              r="25"
              fill="none"
              stroke={theme.palette.secondary.main}
              strokeWidth="2.5"
              strokeOpacity="0.7"
              data-id-ref={`${dataIdRef}-pulse-ring-2`}
            >
              <animate
                attributeName="r"
                values="12;38;12"
                dur="2.8s"
                repeatCount="indefinite"
                begin="0.7s"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.9;0.03;0.9"
                dur="2.8s"
                repeatCount="indefinite"
                begin="0.7s"
              />
              <animate
                attributeName="stroke-width"
                values="2.5;0.8;2.5"
                dur="2.8s"
                repeatCount="indefinite"
                begin="0.7s"
              />
            </circle>
            
            <circle
              cx="50"
              cy="50"
              r="20"
              fill="none"
              stroke={theme.palette.info.light}
              strokeWidth="2"
              strokeOpacity="0.6"
              data-id-ref={`${dataIdRef}-pulse-ring-3`}
            >
              <animate
                attributeName="r"
                values="10;35;10"
                dur="3.2s"
                repeatCount="indefinite"
                begin="1.4s"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.8;0.02;0.8"
                dur="3.2s"
                repeatCount="indefinite"
                begin="1.4s"
              />
              <animate
                attributeName="stroke-width"
                values="2;0.5;2"
                dur="3.2s"
                repeatCount="indefinite"
                begin="1.4s"
              />
            </circle>
          </>
        )}
        
        {/* Central Monitoring Symbol */}
        <g data-id-ref={`${dataIdRef}-central-symbol`}>
          {/* Monitor Screen */}
          <rect
            x="35"
            y="35"
            width="30"
            height="20"
            rx="2"
            fill={theme.palette.common.white}
            stroke={theme.palette.primary.main}
            strokeWidth="2"
            data-id-ref={`${dataIdRef}-monitor-screen`}
          >
            {animated && (
              <>
                <animate
                  attributeName="stroke-width"
                  values="2;3;2"
                  dur="3.5s"
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.05;1"
                  dur="3.5s"
                  repeatCount="indefinite"
                  additive="sum"
                />
              </>
            )}
          </rect>
          
          {/* Monitor Stand */}
          <rect
            x="47"
            y="55"
            width="6"
            height="8"
            fill={theme.palette.primary.main}
            data-id-ref={`${dataIdRef}-monitor-stand`}
          />
          
          {/* Monitor Base */}
          <rect
            x="42"
            y="63"
            width="16"
            height="3"
            rx="1.5"
            fill={theme.palette.primary.main}
            data-id-ref={`${dataIdRef}-monitor-base`}
          />
          
          {/* Animated Chart Lines */}
          <g data-id-ref={`${dataIdRef}-chart-lines`}>
            <polyline
              points="38,48 42,44 46,46 50,42 54,45 58,43 62,47"
              fill="none"
              stroke={theme.palette.success.main}
              strokeWidth="2.5"
              strokeLinecap="round"
              data-id-ref={`${dataIdRef}-chart-line-1`}
            >
              {animated && (
                <>
                  <animate
                    attributeName="stroke-dasharray"
                    values="0,100;30,70;0,100"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="2.5;3.5;2.5"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.8;1;0.8"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </>
              )}
            </polyline>
            
            <polyline
              points="38,50 40,47 44,49 48,46 52,48 56,45 60,49 62,46"
              fill="none"
              stroke={theme.palette.warning.main}
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.9"
              data-id-ref={`${dataIdRef}-chart-line-2`}
            >
              {animated && (
                <>
                  <animate
                    attributeName="stroke-dasharray"
                    values="0,100;25,75;0,100"
                    dur="3s"
                    repeatCount="indefinite"
                    begin="0.8s"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="2;3;2"
                    dur="3s"
                    repeatCount="indefinite"
                    begin="0.8s"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.7;1;0.7"
                    dur="3s"
                    repeatCount="indefinite"
                    begin="0.8s"
                  />
                </>
              )}
            </polyline>
            
            <polyline
              points="39,52 43,49 47,51 51,48 55,50 59,47"
              fill="none"
              stroke={theme.palette.info.main}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.8"
              data-id-ref={`${dataIdRef}-chart-line-3`}
            >
              {animated && (
                <>
                  <animate
                    attributeName="stroke-dasharray"
                    values="0,100;20,80;0,100"
                    dur="3.5s"
                    repeatCount="indefinite"
                    begin="1.5s"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="1.5;2.5;1.5"
                    dur="3.5s"
                    repeatCount="indefinite"
                    begin="1.5s"
                  />
                </>
              )}
            </polyline>
          </g>
          
          {/* Status Indicator Dots */}
          <circle
            cx="40"
            cy="39"
            r="1.5"
            fill={theme.palette.success.main}
            data-id-ref={`${dataIdRef}-status-dot-1`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="1;0.1;1"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1.5;2.5;1.5"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="45"
            cy="39"
            r="1.5"
            fill={theme.palette.warning.main}
            data-id-ref={`${dataIdRef}-status-dot-2`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="0.1;1;0.1"
                  dur="1.8s"
                  repeatCount="indefinite"
                  begin="0.5s"
                />
                <animate
                  attributeName="r"
                  values="1.5;2.8;1.5"
                  dur="1.8s"
                  repeatCount="indefinite"
                  begin="0.5s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="50"
            cy="39"
            r="1.5"
            fill={theme.palette.info.main}
            data-id-ref={`${dataIdRef}-status-dot-3`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="1;0.05;1"
                  dur="2s"
                  repeatCount="indefinite"
                  begin="1s"
                />
                <animate
                  attributeName="r"
                  values="1.5;3;1.5"
                  dur="2s"
                  repeatCount="indefinite"
                  begin="1s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="55"
            cy="39"
            r="1.5"
            fill={theme.palette.error.main}
            data-id-ref={`${dataIdRef}-status-dot-4`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="0.2;1;0.2"
                  dur="1.3s"
                  repeatCount="indefinite"
                  begin="1.5s"
                />
                <animate
                  attributeName="r"
                  values="1.5;2.2;1.5"
                  dur="1.3s"
                  repeatCount="indefinite"
                  begin="1.5s"
                />
              </>
            )}
          </circle>
        </g>
        
        {/* Corner Activity Indicators */}
        <g data-id-ref={`${dataIdRef}-corner-indicators`}>
          <circle
            cx="20"
            cy="20"
            r="3"
            fill={theme.palette.success.main}
            fillOpacity="0.9"
            data-id-ref={`${dataIdRef}-corner-indicator-1`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="1;5;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="fill-opacity"
                  values="0.9;0.1;0.9"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="80"
            cy="20"
            r="2.5"
            fill={theme.palette.warning.main}
            fillOpacity="0.8"
            data-id-ref={`${dataIdRef}-corner-indicator-2`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="1;4.5;1"
                  dur="2.6s"
                  repeatCount="indefinite"
                  begin="0.7s"
                />
                <animate
                  attributeName="fill-opacity"
                  values="0.8;0.05;0.8"
                  dur="2.6s"
                  repeatCount="indefinite"
                  begin="0.7s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="20"
            cy="80"
            r="2"
            fill={theme.palette.info.main}
            fillOpacity="0.85"
            data-id-ref={`${dataIdRef}-corner-indicator-3`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="0.8;4;0.8"
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin="1.4s"
                />
                <animate
                  attributeName="fill-opacity"
                  values="0.85;0.03;0.85"
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin="1.4s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="80"
            cy="80"
            r="2.8"
            fill={theme.palette.error.main}
            fillOpacity="0.8"
            data-id-ref={`${dataIdRef}-corner-indicator-4`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="1.2;5.2;1.2"
                  dur="2.8s"
                  repeatCount="indefinite"
                  begin="2.1s"
                />
                <animate
                  attributeName="fill-opacity"
                  values="0.8;0.02;0.8"
                  dur="2.8s"
                  repeatCount="indefinite"
                  begin="2.1s"
                />
              </>
            )}
          </circle>
        </g>
      </svg>
    </Box>
  );
};

export default MonitoringLogo;