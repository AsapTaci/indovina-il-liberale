import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength, getTangentAtLength} from '@remotion/paths';
import {loadFont as loadSerif} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as loadSans} from '@remotion/google-fonts/Inter';
import {
  BASE_H,
  BASE_W,
  arcPath,
  arcPoint,
  arcToScreen,
  cameraTransform,
  coastPath,
  countryPaths,
  distanceKm,
  graticulePath,
  makeArc,
  project,
  toScreen,
  type Camera,
  type LonLat,
} from './geo';
import {theme} from './theme';
import {Plane} from './Plane';
import {Marker} from './Marker';
import {InfoPanel} from './InfoPanel';

const serif = loadSerif('normal', {weights: ['700'], subsets: ['latin', 'latin-ext']});
const sans = loadSans('normal', {weights: ['300', '400', '500', '600'], subsets: ['latin', 'latin-ext']});
const fonts = {serif: serif.fontFamily, sans: sans.fontFamily};

export type City = {name: string; country: string; countryId: string; lonLat: LonLat};

export type FlightMapProps = {
  origin: City;
  destination: City;
  kicker: string;
  flightDuration: string;
  // etichette geografiche di contesto
  countryLabels: {name: string; lonLat: LonLat}[];
  cityDots: {name: string; lonLat: LonLat}[];
};

export const flightMapDefaults: FlightMapProps = {
  origin: {name: 'Roma', country: 'Italia', countryId: 'Italy', lonLat: [12.4964, 41.9028]},
  destination: {name: 'Bruxelles', country: 'Belgio', countryId: 'Belgium', lonLat: [4.3517, 50.8503]},
  kicker: 'Volo diretto',
  flightDuration: '≈ 2 h 10 min',
  countryLabels: [
    {name: 'Italia', lonLat: [13.9, 42.55]},
    {name: 'Francia', lonLat: [2.3, 46.9]},
    {name: 'Germania', lonLat: [10.4, 51.3]},
    {name: 'Svizzera', lonLat: [8.25, 46.55]},
    {name: 'Austria', lonLat: [14.4, 47.45]},
    {name: 'Belgio', lonLat: [4.95, 50.3]},
    {name: 'Paesi Bassi', lonLat: [5.9, 52.75]},
    {name: 'Spagna', lonLat: [-3.6, 40.3]},
    {name: 'Regno Unito', lonLat: [-1.6, 52.6]},
    {name: 'Rep. Ceca', lonLat: [15.4, 49.85]},
    {name: 'Croazia', lonLat: [16.6, 45.35]},
    {name: 'Slovenia', lonLat: [14.9, 46.1]},
    {name: 'Ungheria', lonLat: [19.3, 47.15]},
    {name: 'Polonia', lonLat: [19.6, 52.1]},
    {name: 'Danimarca', lonLat: [9.4, 56.0]},
  ],
  cityDots: [
    {name: 'Milano', lonLat: [9.19, 45.4642]},
    {name: 'Torino', lonLat: [7.6869, 45.0703]},
    {name: 'Genova', lonLat: [8.9463, 44.4056]},
    {name: 'Bologna', lonLat: [11.3426, 44.4949]},
    {name: 'Venezia', lonLat: [12.3155, 45.4408]},
    {name: 'Napoli', lonLat: [14.2681, 40.8518]},
    {name: 'Parigi', lonLat: [2.3522, 48.8566]},
    {name: 'Lione', lonLat: [4.8357, 45.764]},
    {name: 'Marsiglia', lonLat: [5.3698, 43.2965]},
    {name: 'Strasburgo', lonLat: [7.7521, 48.5734]},
    {name: 'Zurigo', lonLat: [8.5417, 47.3769]},
    {name: 'Ginevra', lonLat: [6.1432, 46.2044]},
    {name: 'Monaco di Baviera', lonLat: [11.582, 48.1351]},
    {name: 'Francoforte', lonLat: [8.6821, 50.1109]},
    {name: 'Colonia', lonLat: [6.9603, 50.9375]},
    {name: 'Lussemburgo', lonLat: [6.1296, 49.6116]},
    {name: 'Amsterdam', lonLat: [4.9041, 52.3676]},
    {name: 'Vienna', lonLat: [16.3738, 48.2082]},
    {name: 'Londra', lonLat: [-0.1276, 51.5072]},
    {name: 'Berlino', lonLat: [13.405, 52.52]},
    {name: 'Praga', lonLat: [14.4378, 50.0755]},
    {name: 'Barcellona', lonLat: [2.1734, 41.3851]},
  ],
};

// --- Timeline (frame a 30 fps) ---------------------------------------------
const T = {
  fadeIn: 18,
  originPin: 14,
  dottedRoute: 44,
  takeoff: 72,
  landing: 312,
  destPin: 306,
  panel: 326,
  fadeOutStart: 396,
};

const smoothInOut = Easing.bezier(0.55, 0, 0.18, 1);
const gentle = Easing.bezier(0.3, 0, 0.2, 1);

export const FlightMap: React.FC<FlightMapProps> = ({
  origin,
  destination,
  kicker,
  flightDuration,
  countryLabels,
  cityDots,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const arc = useMemo(() => makeArc(origin.lonLat, destination.lonLat, 0.2), [origin, destination]);
  const km = useMemo(() => distanceKm(origin.lonLat, destination.lonLat), [origin, destination]);

  // Avanzamento del volo: parte piano, cruise, frena all'arrivo.
  const p = interpolate(frame, [T.takeoff, T.landing], [0, 1], {
    easing: smoothInOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // --- Camera ---------------------------------------------------------------
  // Centro: segue l'aereo ma "tira" verso la corda Roma–Bruxelles, così l'arco
  // resta leggibile e l'aereo non è mai piantato in mezzo al frame.
  const onArc = arcPoint(arc, p);
  const onChord: [number, number] = [
    arc.a[0] + (arc.b[0] - arc.a[0]) * p,
    arc.a[1] + (arc.b[1] - arc.a[1]) * p,
  ];
  const cx = onArc[0] * 0.55 + onChord[0] * 0.45;
  const cy = onArc[1] * 0.55 + onChord[1] * 0.45;

  const preZoom = interpolate(frame, [0, T.takeoff], [2.55, 2.38], {
    easing: gentle,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flightZoom = interpolate(p, [0, 0.5, 1], [2.38, 1.32, 2.25], {
    easing: Easing.inOut(Easing.sin),
  });
  const postZoom = interpolate(frame, [T.landing, durationInFrames], [2.25, 2.42], {
    easing: gentle,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zoom = frame < T.takeoff ? preZoom : frame <= T.landing ? flightZoom : postZoom;

  const cam: Camera = {cx, cy, zoom};

  // --- Rotta in coordinate schermo ------------------------------------------
  const screenArc = arcToScreen(arc, cam);
  const routeD = arcPath(screenArc);
  const routeLen = getLength(routeD);
  const evolved = evolvePath(p, routeD);

  const dottedProgress = interpolate(frame, [T.dottedRoute, T.takeoff + 10], [0, 1], {
    easing: gentle,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dotted = evolvePath(dottedProgress, routeD);

  // --- Aereo ----------------------------------------------------------------
  const planePt = getPointAtLength(routeD, routeLen * p) ?? {x: screenArc.a[0], y: screenArc.a[1]};
  const tangent = getTangentAtLength(routeD, routeLen * Math.min(p, 0.999)) ?? {x: 0, y: -1};
  const angle = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI + 90;
  const altitude = Math.sin(Math.PI * p);
  const planeScale = 1 + altitude * 0.28;
  const planeOpacity =
    interpolate(frame, [T.takeoff - 10, T.takeoff + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(frame, [T.landing - 2, T.landing + 14], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // --- Fade globali ---------------------------------------------------------
  const fade =
    interpolate(frame, [0, T.fadeIn], [0, 1], {easing: gentle, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(frame, [T.fadeOutStart, durationInFrames - 1], [1, 0], {
      easing: gentle,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const originXY = toScreen(cam, arc.a);
  const destXY = toScreen(cam, arc.b);

  // Le etichette di contesto spariscono gradualmente quando siamo molto zoomati
  // o molto larghi: restano leggibili senza affollare.
  const contextOpacity = interpolate(zoom, [1.2, 1.5, 2.3, 2.7], [0.55, 0.75, 0.75, 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: fade, background: theme.ocean}}>
        {/* --- MAPPA (SVG statico, muove solo il gruppo camera) --- */}
        <svg width={BASE_W} height={BASE_H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="oceanGrad" cx="50%" cy="40%" r="75%">
              <stop offset="0" stopColor={theme.oceanLight} />
              <stop offset="1" stopColor={theme.ocean} />
            </radialGradient>
            <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#214a73" />
              <stop offset="1" stopColor={theme.land} />
            </linearGradient>
          </defs>
          <rect width={BASE_W} height={BASE_H} fill="url(#oceanGrad)" />
          <g transform={cameraTransform(cam)}>
            <path d={graticulePath} fill="none" stroke={theme.graticule} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {/* alone costiero: la terra "si stacca" dal mare */}
            <path d={coastPath} fill="none" stroke={theme.coast} strokeWidth={5} strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />
            <path d={coastPath} fill="none" stroke={theme.coast} strokeWidth={14} strokeOpacity={0.12} vectorEffect="non-scaling-stroke" />
            {countryPaths.map((c) => (
              <path
                key={c.name}
                d={c.d}
                fill="url(#landGrad)"
                stroke={theme.border}
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            ))}
            {/* i paesi evidenziati vengono ridisegnati sopra per avere il bordo pulito */}
            {countryPaths
              .filter((c) => c.name === origin.countryId || c.name === destination.countryId)
              .map((c) => (
                <path key={`hi-${c.name}`} d={c.d} fill={theme.highlight} stroke={theme.highlightEdge} strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              ))}
            <path d={coastPath} fill="none" stroke={theme.coast} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {/* --- Etichette geografiche di contesto (HTML, nitide a ogni zoom) --- */}
        <div style={{position: 'absolute', inset: 0, opacity: contextOpacity}}>
          {countryLabels.filter((l) => l.name !== origin.country && l.name !== destination.country).map((l) => {
            const [x, y] = toScreen(cam, project(l.lonLat));
            return (
              <div
                key={l.name}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: fonts.sans,
                  fontWeight: 500,
                  fontSize: 15,
                  letterSpacing: '0.42em',
                  textTransform: 'uppercase',
                  color: theme.mute,
                  opacity: 0.55,
                  whiteSpace: 'nowrap',
                }}
              >
                {l.name}
              </div>
            );
          })}
          {cityDots.map((c) => {
            const [x, y] = toScreen(cam, project(c.lonLat));
            return (
              <div key={c.name} style={{position: 'absolute', left: x, top: y}}>
                <div
                  style={{
                    position: 'absolute',
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: theme.mute,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 2px rgba(10,23,41,0.9)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: -9,
                    fontFamily: fonts.sans,
                    fontWeight: 500,
                    fontSize: 14,
                    letterSpacing: '0.08em',
                    color: theme.mute,
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}
                >
                  {c.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* --- Rotta + aereo (SVG in coordinate schermo) --- */}
        <svg width={BASE_W} height={BASE_H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <linearGradient id="routeGrad" gradientUnits="userSpaceOnUse" x1={screenArc.a[0]} y1={screenArc.a[1]} x2={screenArc.b[0]} y2={screenArc.b[1]}>
              <stop offset="0" stopColor={theme.gold} stopOpacity="0.55" />
              <stop offset="1" stopColor={theme.gold2} />
            </linearGradient>
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* rotta prevista, punteggiata: si "scrive" prima del decollo */}
          <mask id="dottedMask">
            <path d={routeD} fill="none" stroke="#fff" strokeWidth={12} strokeDasharray={dotted.strokeDasharray} strokeDashoffset={dotted.strokeDashoffset} />
          </mask>
          <path
            d={routeD}
            fill="none"
            stroke={theme.gold2}
            strokeOpacity={0.5}
            strokeWidth={2}
            strokeDasharray="1.5 10"
            strokeLinecap="round"
            mask="url(#dottedMask)"
          />

          {/* rotta percorsa: alone + linea */}
          <path d={routeD} fill="none" stroke={theme.gold2} strokeOpacity={0.55} strokeWidth={9} strokeLinecap="round" filter="url(#routeGlow)" strokeDasharray={evolved.strokeDasharray} strokeDashoffset={evolved.strokeDashoffset} />
          <path d={routeD} fill="none" stroke="url(#routeGrad)" strokeWidth={3} strokeLinecap="round" strokeDasharray={evolved.strokeDasharray} strokeDashoffset={evolved.strokeDashoffset} />

          <Plane x={planePt.x} y={planePt.y} angleDeg={angle} size={62 * planeScale} altitude={altitude} opacity={planeOpacity} />
        </svg>

        {/* --- Marker città --- */}
        <Marker x={originXY[0]} y={originXY[1]} startFrame={T.originPin} city={origin.name} country={origin.country} side="right" fonts={fonts} />
        <Marker x={destXY[0]} y={destXY[1]} startFrame={T.destPin} city={destination.name} country={destination.country} side="left" fonts={fonts} />

        {/* --- Vignettatura e luce --- */}
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 70% 62% at 50% 46%, rgba(0,0,0,0) 55%, rgba(4,10,20,0.62) 100%), linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.32) 100%)',
          }}
        />

        {/* --- Pannello finale --- */}
        <InfoPanel startFrame={T.panel} from={origin.name} to={destination.name} kicker={kicker} km={km} duration={flightDuration} fonts={fonts} />

        {/* --- Firma in alto a destra --- */}
        <div
          style={{
            position: 'absolute',
            top: 64,
            right: 84,
            textAlign: 'right',
            opacity: interpolate(frame, [10, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          <div style={{fontFamily: fonts.sans, fontWeight: 600, fontSize: 13, letterSpacing: '0.34em', textTransform: 'uppercase', color: theme.gold2}}>
            Europa
          </div>
          <div style={{fontFamily: fonts.serif, fontWeight: 700, fontSize: 22, color: theme.cream, marginTop: 6, opacity: 0.9}}>
            {origin.name} · {destination.name}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
