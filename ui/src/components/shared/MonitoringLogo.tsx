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
        style={animated ? { 
          transformOrigin: 'center',
          animation: 'logoBreathing 4s ease-in-out infinite'
        } : {}}
      >
        {/* SVG Filters for Glow Effects */}
        <defs>
          <filter id={`glow-${dataIdRef}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id={`strong-glow-${dataIdRef}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <style>{`
            @keyframes logoBreathing {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.08); }
            }
            @keyframes rotateClockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes rotateCounterClockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
          `}</style>
        </defs>
        {/* Rotating Background Circle */}
        <g style={animated ? { 
          transformOrigin: '50px 50px', 
          animation: 'rotateClockwise 20s linear infinite'
        } : {}}>
          <circle
            cx="50"
            cy="50"
            r="45"
            fill={theme.palette.primary.main}
            fillOpacity="0.1"
            stroke={theme.palette.primary.main}
            strokeWidth="2"
            filter={animated ? `url(#glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-background-circle`}
          >
            {animated && (
              <>
                <animate
                  attributeName="stroke-width"
                  values="2;4;2"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.3;1;0.3"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke"
                  values={`${theme.palette.primary.main};${theme.palette.secondary.main};${theme.palette.info.main};${theme.palette.primary.main}`}
                  dur="6s"
                  repeatCount="indefinite"
                />
              </>
            )}
          </circle>
        </g>
        
        {/* Enhanced Glowing Pulse Rings */}
        {animated && (
          <>
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke={theme.palette.primary.light}
              strokeWidth="4"
              strokeOpacity="1"
              filter={`url(#strong-glow-${dataIdRef})`}
              data-id-ref={`${dataIdRef}-pulse-ring-1`}
            >
              <animate
                attributeName="r"
                values="10;45;10"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="1;0.01;1"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-width"
                values="5;0.5;5"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke"
                values={`${theme.palette.success.main};${theme.palette.warning.main};${theme.palette.error.main};${theme.palette.success.main}`}
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>
            
            <circle
              cx="50"
              cy="50"
              r="25"
              fill="none"
              stroke={theme.palette.secondary.main}
              strokeWidth="3"
              strokeOpacity="0.9"
              filter={`url(#strong-glow-${dataIdRef})`}
              data-id-ref={`${dataIdRef}-pulse-ring-2`}
            >
              <animate
                attributeName="r"
                values="8;42;8"
                dur="2.3s"
                repeatCount="indefinite"
                begin="0.6s"
              />
              <animate
                attributeName="stroke-opacity"
                values="1;0.01;1"
                dur="2.3s"
                repeatCount="indefinite"
                begin="0.6s"
              />
              <animate
                attributeName="stroke-width"
                values="4;0.3;4"
                dur="2.3s"
                repeatCount="indefinite"
                begin="0.6s"
              />
              <animate
                attributeName="stroke"
                values={`${theme.palette.info.main};${theme.palette.secondary.main};${theme.palette.primary.main};${theme.palette.info.main}`}
                dur="5s"
                repeatCount="indefinite"
              />
            </circle>
            
            <circle
              cx="50"
              cy="50"
              r="20"
              fill="none"
              stroke={theme.palette.info.light}
              strokeWidth="2.5"
              strokeOpacity="0.8"
              filter={`url(#glow-${dataIdRef})`}
              data-id-ref={`${dataIdRef}-pulse-ring-3`}
            >
              <animate
                attributeName="r"
                values="6;38;6"
                dur="2.7s"
                repeatCount="indefinite"
                begin="1.2s"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.9;0.01;0.9"
                dur="2.7s"
                repeatCount="indefinite"
                begin="1.2s"
              />
              <animate
                attributeName="stroke-width"
                values="3;0.2;3"
                dur="2.7s"
                repeatCount="indefinite"
                begin="1.2s"
              />
            </circle>
            
            <circle
              cx="50"
              cy="50"
              r="15"
              fill="none"
              stroke={theme.palette.warning.light}
              strokeWidth="2"
              strokeOpacity="0.7"
              filter={`url(#glow-${dataIdRef})`}
              data-id-ref={`${dataIdRef}-pulse-ring-4`}
            >
              <animate
                attributeName="r"
                values="4;35;4"
                dur="3.1s"
                repeatCount="indefinite"
                begin="1.8s"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.8;0.01;0.8"
                dur="3.1s"
                repeatCount="indefinite"
                begin="1.8s"
              />
              <animate
                attributeName="stroke-width"
                values="2.5;0.1;2.5"
                dur="3.1s"
                repeatCount="indefinite"
                begin="1.8s"
              />
            </circle>
          </>
        )}
        
        {/* Enhanced Central Monitoring Symbol */}
        <g data-id-ref={`${dataIdRef}-central-symbol`} 
           style={animated ? { transformOrigin: '50px 45px' } : {}}>
          {/* Bouncy Monitor Screen */}
          <rect
            x="35"
            y="35"
            width="30"
            height="20"
            rx="2"
            fill={theme.palette.common.white}
            stroke={theme.palette.primary.main}
            strokeWidth="2"
            filter={animated ? `url(#glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-monitor-screen`}
          >
            {animated && (
              <>
                <animate
                  attributeName="stroke-width"
                  values="2;4;2"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke"
                  values={`${theme.palette.primary.main};${theme.palette.success.main};${theme.palette.info.main};${theme.palette.primary.main}`}
                  dur="4s"
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.15;0.95;1.05;1"
                  dur="3s"
                  repeatCount="indefinite"
                  additive="sum"
                />
                <animate
                  attributeName="fill"
                  values={`${theme.palette.common.white};${theme.palette.primary.light};${theme.palette.common.white}`}
                  dur="4s"
                  repeatCount="indefinite"
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
          
          {/* Dynamic Morphing Chart Lines */}
          <g data-id-ref={`${dataIdRef}-chart-lines`}>
            <polyline
              points="38,48 42,44 46,46 50,42 54,45 58,43 62,47"
              fill="none"
              stroke={theme.palette.success.main}
              strokeWidth="3"
              strokeLinecap="round"
              filter={`url(#glow-${dataIdRef})`}
              data-id-ref={`${dataIdRef}-chart-line-1`}
            >
              {animated && (
                <>
                  <animate
                    attributeName="stroke-dasharray"
                    values="0,100;40,60;0,100"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="3;5;3"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.9;1;0.9"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="points"
                    values="38,48 42,44 46,46 50,42 54,45 58,43 62,47;38,46 42,42 46,48 50,44 54,43 58,45 62,49;38,50 42,46 46,44 50,46 54,47 58,41 62,45;38,48 42,44 46,46 50,42 54,45 58,43 62,47"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </>
              )}
            </polyline>
            
            <polyline
              points="38,50 40,47 44,49 48,46 52,48 56,45 60,49 62,46"
              fill="none"
              stroke={theme.palette.warning.main}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="1"
              filter={`url(#glow-${dataIdRef})`}
              data-id-ref={`${dataIdRef}-chart-line-2`}
            >
              {animated && (
                <>
                  <animate
                    attributeName="stroke-dasharray"
                    values="0,100;35,65;0,100"
                    dur="2.2s"
                    repeatCount="indefinite"
                    begin="0.6s"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="2.5;4;2.5"
                    dur="2.2s"
                    repeatCount="indefinite"
                    begin="0.6s"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.8;1;0.8"
                    dur="2.2s"
                    repeatCount="indefinite"
                    begin="0.6s"
                  />
                  <animate
                    attributeName="points"
                    values="38,50 40,47 44,49 48,46 52,48 56,45 60,49 62,46;38,52 40,45 44,51 48,48 52,46 56,47 60,47 62,48;38,48 40,49 44,47 48,44 52,50 56,43 60,51 62,44;38,50 40,47 44,49 48,46 52,48 56,45 60,49 62,46"
                    dur="4.5s"
                    repeatCount="indefinite"
                    begin="1s"
                  />
                </>
              )}
            </polyline>
            
            <polyline
              points="39,52 43,49 47,51 51,48 55,50 59,47"
              fill="none"
              stroke={theme.palette.info.main}
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.9"
              filter={`url(#glow-${dataIdRef})`}
              data-id-ref={`${dataIdRef}-chart-line-3`}
            >
              {animated && (
                <>
                  <animate
                    attributeName="stroke-dasharray"
                    values="0,100;25,75;0,100"
                    dur="2.8s"
                    repeatCount="indefinite"
                    begin="1.2s"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="2;3.5;2"
                    dur="2.8s"
                    repeatCount="indefinite"
                    begin="1.2s"
                  />
                  <animate
                    attributeName="points"
                    values="39,52 43,49 47,51 51,48 55,50 59,47;39,50 43,51 47,49 51,50 55,48 59,49;39,54 43,47 47,53 51,46 55,52 59,45;39,52 43,49 47,51 51,48 55,50 59,47"
                    dur="3.8s"
                    repeatCount="indefinite"
                    begin="1.8s"
                  />
                </>
              )}
            </polyline>
          </g>
          
          {/* Explosive Status Indicator Dots */}
          <circle
            cx="40"
            cy="39"
            r="1.5"
            fill={theme.palette.success.main}
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-status-dot-1`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="1;0.01;1"
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1.5;4;0.5;1.5"
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.5;0.8;1"
                  dur="1s"
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
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-status-dot-2`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="0.1;1;0.01"
                  dur="1.2s"
                  repeatCount="indefinite"
                  begin="0.3s"
                />
                <animate
                  attributeName="r"
                  values="1.5;4.5;0.3;1.5"
                  dur="1.2s"
                  repeatCount="indefinite"
                  begin="0.3s"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.8;0.6;1"
                  dur="1.2s"
                  repeatCount="indefinite"
                  begin="0.3s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="50"
            cy="39"
            r="1.5"
            fill={theme.palette.info.main}
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-status-dot-3`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="1;0.01;1"
                  dur="1.4s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
                <animate
                  attributeName="r"
                  values="1.5;5;0.2;1.5"
                  dur="1.4s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;2;0.5;1"
                  dur="1.4s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="55"
            cy="39"
            r="1.5"
            fill={theme.palette.error.main}
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-status-dot-4`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="0.2;1;0.01"
                  dur="0.9s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
                <animate
                  attributeName="r"
                  values="1.5;3.5;0.4;1.5"
                  dur="0.9s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.6;0.7;1"
                  dur="0.9s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="60"
            cy="39"
            r="1"
            fill={theme.palette.secondary.main}
            filter={animated ? `url(#glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-status-dot-5`}
          >
            {animated && (
              <>
                <animate
                  attributeName="fill-opacity"
                  values="0.5;1;0.01"
                  dur="1.1s"
                  repeatCount="indefinite"
                  begin="1.2s"
                />
                <animate
                  attributeName="r"
                  values="1;3;0.1;1"
                  dur="1.1s"
                  repeatCount="indefinite"
                  begin="1.2s"
                />
              </>
            )}
          </circle>
        </g>
        
        {/* Cascading Corner Activity Explosions */}
        <g data-id-ref={`${dataIdRef}-corner-indicators`}>
          <circle
            cx="20"
            cy="20"
            r="3"
            fill={theme.palette.success.main}
            fillOpacity="1"
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-corner-indicator-1`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="0.5;8;0.5"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="fill-opacity"
                  values="1;0.01;1"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;2.5;0.3;1"
                  dur="1.8s"
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
            fillOpacity="1"
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-corner-indicator-2`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="0.3;7;0.3"
                  dur="2s"
                  repeatCount="indefinite"
                  begin="0.45s"
                />
                <animate
                  attributeName="fill-opacity"
                  values="1;0.01;1"
                  dur="2s"
                  repeatCount="indefinite"
                  begin="0.45s"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;2.2;0.4;1"
                  dur="2s"
                  repeatCount="indefinite"
                  begin="0.45s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="20"
            cy="80"
            r="2"
            fill={theme.palette.info.main}
            fillOpacity="1"
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-corner-indicator-3`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="0.4;6.5;0.4"
                  dur="1.9s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
                <animate
                  attributeName="fill-opacity"
                  values="1;0.01;1"
                  dur="1.9s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;2.8;0.2;1"
                  dur="1.9s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
              </>
            )}
          </circle>
          
          <circle
            cx="80"
            cy="80"
            r="2.8"
            fill={theme.palette.error.main}
            fillOpacity="1"
            filter={animated ? `url(#strong-glow-${dataIdRef})` : undefined}
            data-id-ref={`${dataIdRef}-corner-indicator-4`}
          >
            {animated && (
              <>
                <animate
                  attributeName="r"
                  values="0.6;9;0.6"
                  dur="2.1s"
                  repeatCount="indefinite"
                  begin="1.35s"
                />
                <animate
                  attributeName="fill-opacity"
                  values="1;0.01;1"
                  dur="2.1s"
                  repeatCount="indefinite"
                  begin="1.35s"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;3;0.1;1"
                  dur="2.1s"
                  repeatCount="indefinite"
                  begin="1.35s"
                />
              </>
            )}
          </circle>
          
          {/* Additional rotating particles */}
          <g style={animated ? { 
            transformOrigin: '50px 50px', 
            animation: 'rotateCounterClockwise 15s linear infinite'
          } : {}}>
            <circle cx="15" cy="50" r="1" fill={theme.palette.secondary.light} fillOpacity="0.6">
              {animated && (
                <animate
                  attributeName="r"
                  values="0.5;2.5;0.5"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            <circle cx="85" cy="50" r="1" fill={theme.palette.primary.light} fillOpacity="0.6">
              {animated && (
                <animate
                  attributeName="r"
                  values="0.5;2.5;0.5"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="1.5s"
                />
              )}
            </circle>
            <circle cx="50" cy="15" r="1" fill={theme.palette.warning.light} fillOpacity="0.6">
              {animated && (
                <animate
                  attributeName="r"
                  values="0.5;2.5;0.5"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="0.75s"
                />
              )}
            </circle>
            <circle cx="50" cy="85" r="1" fill={theme.palette.success.light} fillOpacity="0.6">
              {animated && (
                <animate
                  attributeName="r"
                  values="0.5;2.5;0.5"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="2.25s"
                />
              )}
            </circle>
          </g>
        </g>
      </svg>
    </Box>
  );
};

export default MonitoringLogo;