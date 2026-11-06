import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from './theme';

type Props = {
  startFrame: number;
  from: string;
  to: string;
  kicker: string;
  km: number;
  duration: string;
  fonts: {serif: string; sans: string};
};

const fmtKm = (km: number) => Math.round(km).toLocaleString('it-IT');

export const InfoPanel: React.FC<Props> = ({startFrame, from, to, kicker, km, duration, fonts}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - startFrame;
  if (local < 0) return null;

  const rise = spring({frame: local, fps, config: {damping: 200, stiffness: 90, mass: 1}});
  const opacity = interpolate(local, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rule = spring({frame: local - 10, fps, config: {damping: 200, stiffness: 60}});
  const statsIn = spring({frame: local - 16, fps, config: {damping: 200, stiffness: 110}});

  return (
    <div
      style={{
        position: 'absolute',
        left: 84,
        bottom: 84,
        transform: `translateY(${(1 - rise) * 40}px)`,
        opacity,
        padding: '30px 40px 30px 36px',
        background: theme.panel,
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14,
        backdropFilter: 'blur(14px)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        minWidth: 560,
      }}
    >
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '0.34em',
          color: theme.gold2,
          textTransform: 'uppercase',
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: fonts.serif,
          fontWeight: 700,
          fontSize: 68,
          lineHeight: 1.05,
          color: theme.cream,
          display: 'flex',
          alignItems: 'baseline',
          gap: 22,
        }}
      >
        <span>{from}</span>
        <span style={{color: theme.gold, fontFamily: fonts.sans, fontWeight: 300, fontSize: 52, transform: 'translateY(-4px)'}}>
          →
        </span>
        <span>{to}</span>
      </div>
      <div
        style={{
          marginTop: 18,
          height: 2,
          width: `${rule * 100}%`,
          background: `linear-gradient(90deg, ${theme.gold}, rgba(212,169,76,0))`,
        }}
      />
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 44,
          opacity: statsIn,
          transform: `translateY(${(1 - statsIn) * 10}px)`,
        }}
      >
        <Stat label="Distanza" value={`${fmtKm(km)} km`} fonts={fonts} />
        <Stat label="Tempo di volo" value={duration} fonts={fonts} />
      </div>
    </div>
  );
};

const Stat: React.FC<{label: string; value: string; fonts: {serif: string; sans: string}}> = ({label, value, fonts}) => (
  <div>
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: 12,
        letterSpacing: '0.26em',
        textTransform: 'uppercase',
        color: theme.mute,
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div style={{fontFamily: fonts.sans, fontWeight: 500, fontSize: 26, color: theme.cream, letterSpacing: '0.01em'}}>
      {value}
    </div>
  </div>
);
