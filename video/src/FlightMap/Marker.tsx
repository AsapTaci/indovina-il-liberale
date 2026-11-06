import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from './theme';

type Props = {
  x: number;
  y: number;
  startFrame: number;
  city: string;
  country: string;
  side: 'left' | 'right';
  fonts: {serif: string; sans: string};
};

const Ring: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => {
  // t ∈ [0,1): anello che si espande e svanisce
  const r = interpolate(t, [0, 1], [6, 58]);
  const o = interpolate(t, [0, 0.15, 1], [0, 0.55, 0]);
  return <circle cx={x} cy={y} r={r} fill="none" stroke={theme.gold2} strokeWidth={1.5} opacity={o} />;
};

export const Marker: React.FC<Props> = ({x, y, startFrame, city, country, side, fonts}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - startFrame;
  if (local < 0) return null;

  const pop = spring({frame: local, fps, config: {damping: 12, stiffness: 160, mass: 0.7}});
  const labelIn = spring({frame: local - 6, fps, config: {damping: 200, stiffness: 120}});
  const labelOpacity = interpolate(local, [6, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const period = 2.2 * fps;
  const t1 = (local % period) / period;
  const t2 = ((local + period / 2) % period) / period;

  const dir = side === 'right' ? 1 : -1;
  const labelX = x + dir * 26;
  const labelShift = (1 - labelIn) * 18 * dir;

  return (
    <>
      <svg
        width={1920}
        height={1080}
        style={{position: 'absolute', inset: 0, overflow: 'visible'}}
      >
        {local > 4 && <Ring x={x} y={y} t={t1} />}
        {local > 4 + period / 2 && <Ring x={x} y={y} t={t2} />}
        <g transform={`translate(${x} ${y}) scale(${pop})`}>
          <circle r={13} fill={theme.gold} opacity={0.22} />
          <circle r={7} fill={theme.gold2} />
          <circle r={3} fill={theme.ink} />
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          left: side === 'right' ? labelX : undefined,
          right: side === 'left' ? 1920 - labelX : undefined,
          top: y,
          transform: `translateY(-50%) translateX(${labelShift}px)`,
          opacity: labelOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: side === 'right' ? 'flex-start' : 'flex-end',
          padding: '12px 20px 13px',
          background: theme.panel,
          border: '1px solid rgba(255,255,255,0.09)',
          borderLeft: side === 'right' ? `3px solid ${theme.gold}` : undefined,
          borderRight: side === 'left' ? `3px solid ${theme.gold}` : undefined,
          borderRadius: 10,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: '0.3em',
            color: theme.gold2,
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
        >
          {country}
        </div>
        <div
          style={{
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1,
            color: theme.cream,
            letterSpacing: '0.01em',
          }}
        >
          {city}
        </div>
      </div>
    </>
  );
};
