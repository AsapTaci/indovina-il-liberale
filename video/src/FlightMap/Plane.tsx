import React from 'react';
import {theme} from './theme';

// Aereo di linea visto dall'alto, muso verso l'alto (-y), in un box 64x64.
const PLANE_D = [
  // fusoliera
  'M32 1.5 C35 1.5 36.6 6 36.6 12 L36.6 53 C36.6 58 34.8 62.5 32 62.5 C29.2 62.5 27.4 58 27.4 53 L27.4 12 C27.4 6 29 1.5 32 1.5 Z',
  // ali
  'M27.6 22 L3 39.5 Q2 40.5 2.6 42.4 L4 45.5 L27.6 38.5 Z',
  'M36.4 22 L61 39.5 Q62 40.5 61.4 42.4 L60 45.5 L36.4 38.5 Z',
  // stabilizzatori di coda
  'M28 51 L16.5 59.5 Q15.8 60.3 16.3 61.6 L17 63 L28 58.5 Z',
  'M36 51 L47.5 59.5 Q48.2 60.3 47.7 61.6 L47 63 L36 58.5 Z',
  // motori
  'M14 36.5 L19.5 36.5 L19.5 44.5 L14 44.5 Z',
  'M44.5 36.5 L50 36.5 L50 44.5 L44.5 44.5 Z',
].join(' ');

type Props = {
  x: number;
  y: number;
  angleDeg: number;
  size: number; // px della diagonale del box
  altitude: number; // 0..1 → ombra più lontana e più sfumata
  opacity: number;
};

export const Plane: React.FC<Props> = ({x, y, angleDeg, size, altitude, opacity}) => {
  const s = size / 64;
  const shadowDx = 10 + altitude * 26;
  const shadowDy = 14 + altitude * 34;
  const shadowBlur = 2 + altitude * 7;
  const shadowOpacity = 0.42 - altitude * 0.22;

  return (
    <g style={{opacity}}>
      <defs>
        <filter id="planeShadow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={shadowBlur} />
        </filter>
        <filter id="planeGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="planeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="0.55" stopColor={theme.gold2} />
          <stop offset="1" stopColor={theme.gold} />
        </linearGradient>
      </defs>

      {/* ombra proiettata al suolo */}
      <g
        transform={`translate(${x + shadowDx} ${y + shadowDy}) rotate(${angleDeg}) scale(${s}) translate(-32 -32)`}
        filter="url(#planeShadow)"
      >
        <path d={PLANE_D} fill="#000" opacity={shadowOpacity} />
      </g>

      {/* aereo */}
      <g
        transform={`translate(${x} ${y}) rotate(${angleDeg}) scale(${s}) translate(-32 -32)`}
        filter="url(#planeGlow)"
      >
        <path d={PLANE_D} fill="url(#planeFill)" />
        {/* finestrini di cabina: una linea sottile scura lungo la fusoliera */}
        <path d="M32 9 L32 50" stroke={theme.ink} strokeWidth="1.1" strokeOpacity="0.35" strokeLinecap="round" />
      </g>
    </g>
  );
};
