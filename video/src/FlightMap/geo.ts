import {
  geoConicConformal,
  geoPath,
  geoGraticule,
  geoBounds,
  geoDistance,
  type GeoProjection,
} from 'd3-geo';
import {feature, merge} from 'topojson-client';
import type {Topology, GeometryCollection} from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-50m.json';
import landTopo from 'world-atlas/land-50m.json';

export type LonLat = [number, number];

export const BASE_W = 1920;
export const BASE_H = 1080;

// Regione inquadrata a zoom 1: dall'Iberia alla Polonia, dalla Sicilia alla Danimarca.
const REGION = {
  type: 'Polygon' as const,
  coordinates: [
    // NB: in d3-geo gli anelli vanno in senso orario, altrimenti il poligono
    // è "tutto il mondo tranne questo rettangolo" e il fit esplode.
    [
      [-6, 36],
      [-6, 56],
      [22, 56],
      [22, 36],
      [-6, 36],
    ],
  ],
};

// Proiezione conica conforme (la classica delle carte d'Europa): paralleli e
// meridiani leggermente curvi, forme fedeli.
export const projection: GeoProjection = geoConicConformal()
  .parallels([40, 55])
  .rotate([-9, 0])
  .fitExtent(
    [
      [0, 0],
      [BASE_W, BASE_H],
    ],
    REGION,
  );

// Ritaglio generoso attorno al frame base: la camera può zoomare fino a ~1.2x
// out senza mostrare bordi vuoti.
const PAD = 1400;
projection.clipExtent([
  [-PAD, -PAD],
  [BASE_W + PAD, BASE_H + PAD],
]);

const pathGen = geoPath(projection);

type CountryProps = {name: string};

const countriesFC = feature(
  countriesTopo as unknown as Topology,
  (countriesTopo as unknown as Topology).objects.countries as GeometryCollection<CountryProps>,
);

// Teniamo solo i paesi che cadono nell'area europea/mediterranea: evita di
// proiettare l'Antartide con una conica e tiene il DOM leggero.
const inEurope = (bounds: [[number, number], [number, number]]) => {
  const [[minX, minY], [maxX, maxY]] = bounds;
  return maxX > -35 && minX < 60 && maxY > 20 && minY < 80;
};

export type CountryPath = {name: string; d: string};

export const countryPaths: CountryPath[] = countriesFC.features
  .filter((f) => inEurope(geoBounds(f)))
  .map((f) => ({name: f.properties.name, d: pathGen(f) ?? ''}))
  .filter((c) => c.d.length > 0);

const landMerged = merge(
  landTopo as unknown as Topology,
  ((landTopo as unknown as Topology).objects.land as GeometryCollection).geometries as Array<
    import('topojson-specification').Polygon | import('topojson-specification').MultiPolygon
  >,
);
export const coastPath = pathGen(landMerged) ?? '';

export const graticulePath = pathGen(geoGraticule().step([5, 5])()) ?? '';

export const project = (p: LonLat): [number, number] => {
  const r = projection(p);
  if (!r) {
    throw new Error(`Point out of projection: ${p}`);
  }
  return r;
};

export const distanceKm = (a: LonLat, b: LonLat) => geoDistance(a, b) * 6371;

// --- Camera -----------------------------------------------------------------
// La camera è definita in coordinate "base" (quelle della proiezione a zoom 1).
// screen = (base - center) * zoom + (BASE_W/2, BASE_H/2)
export type Camera = {cx: number; cy: number; zoom: number};

export const toScreen = (cam: Camera, [x, y]: [number, number]): [number, number] => [
  (x - cam.cx) * cam.zoom + BASE_W / 2,
  (y - cam.cy) * cam.zoom + BASE_H / 2,
];

export const cameraTransform = (cam: Camera) =>
  `translate(${BASE_W / 2} ${BASE_H / 2}) scale(${cam.zoom}) translate(${-cam.cx} ${-cam.cy})`;

// --- Rotta ------------------------------------------------------------------
// Arco quadratico in coordinate base, con bombatura verso nord-est.
export type Arc = {a: [number, number]; c: [number, number]; b: [number, number]};

export const makeArc = (from: LonLat, to: LonLat, bulge = 0.2): Arc => {
  const a = project(from);
  const b = project(to);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  // normale "verso l'alto a destra" rispetto alla direzione di volo
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const mid: [number, number] = [a[0] + dx / 2, a[1] + dy / 2];
  const c: [number, number] = [mid[0] + nx * len * bulge, mid[1] + ny * len * bulge];
  return {a, c, b};
};

export const arcToScreen = (arc: Arc, cam: Camera): Arc => ({
  a: toScreen(cam, arc.a),
  c: toScreen(cam, arc.c),
  b: toScreen(cam, arc.b),
});

export const arcPath = ({a, c, b}: Arc) =>
  `M ${a[0]} ${a[1]} Q ${c[0]} ${c[1]} ${b[0]} ${b[1]}`;

// Punto sulla bezier quadratica (per far seguire la camera all'aereo).
export const arcPoint = ({a, c, b}: Arc, t: number): [number, number] => {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
};
