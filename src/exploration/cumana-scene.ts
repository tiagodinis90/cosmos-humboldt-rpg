import type { ExplorationMap, Point, Rectangle, SceneHotspot } from './world';

/**
 * Original set for a lane behind the harbour of Cumaná, 1799.
 * Layout, buildings and figures are invented for the game; see
 * docs/source-ledger.md for what is documented and what is dramatized.
 * One world unit is roughly 2.7 cm; a tile (32 units) is a little under a metre.
 */
export type StructureKind = 'house' | 'wall' | 'seawall' | 'crates' | 'table' | 'press' | 'palm' | 'tree' | 'well' | 'boat';

export type Structure = {
  id: string;
  kind: StructureKind;
  footprint: Rectangle;
  /** Wall height in world units. */
  height: number;
  /** Rise of a hipped roof above the walls. */
  roof?: number;
  /** Clicking the structure approaches this hotspot instead of the ground. */
  hotspot?: string;
};

export type FigureKind = 'ines' | 'bonpland' | 'porter' | 'clerk';

export type SceneFigure = {
  id: string;
  kind: FigureKind;
  position: Point;
  /** World-space heading in radians. */
  heading: number;
  hotspot?: string;
};

export const CUMANA_STRUCTURES: Structure[] = [
  { id: 'house-west', kind: 'house', footprint: { x: 60, y: 130, width: 240, height: 230 }, height: 128, roof: 58 },
  { id: 'store', kind: 'house', footprint: { x: 420, y: 150, width: 330, height: 270 }, height: 138, roof: 66 },
  { id: 'customs', kind: 'house', footprint: { x: 900, y: 110, width: 420, height: 290 }, height: 156, roof: 72 },
  { id: 'storehouse', kind: 'house', footprint: { x: 1060, y: 690, width: 280, height: 130 }, height: 104, roof: 44 },
  { id: 'damaged-wall', kind: 'wall', footprint: { x: 820, y: 590, width: 150, height: 34 }, height: 72, hotspot: 'damaged-wall' },
  { id: 'sea-wall', kind: 'seawall', footprint: { x: 1390, y: 470, width: 110, height: 360 }, height: 46 },
  { id: 'cargo', kind: 'crates', footprint: { x: 330, y: 770, width: 170, height: 60 }, height: 46 },
  { id: 'field-table', kind: 'table', footprint: { x: 330, y: 600, width: 84, height: 42 }, height: 30, hotspot: 'field-case' },
  { id: 'plant-press', kind: 'press', footprint: { x: 160, y: 505, width: 64, height: 36 }, height: 26, hotspot: 'bonpland' },
  { id: 'well', kind: 'well', footprint: { x: 1112, y: 502, width: 36, height: 36 }, height: 28, hotspot: 'plaza' },
  { id: 'pirogue', kind: 'boat', footprint: { x: 640, y: 846, width: 160, height: 28 }, height: 22 },
  { id: 'palm-a', kind: 'palm', footprint: { x: 318, y: 458, width: 20, height: 20 }, height: 210 },
  { id: 'palm-b', kind: 'palm', footprint: { x: 790, y: 470, width: 20, height: 20 }, height: 190 },
  { id: 'palm-c', kind: 'palm', footprint: { x: 1345, y: 410, width: 20, height: 20 }, height: 220 },
  { id: 'tamarind', kind: 'tree', footprint: { x: 1240, y: 560, width: 28, height: 28 }, height: 150 },
];

export const CUMANA_FIGURES: SceneFigure[] = [
  { id: 'ines', kind: 'ines', position: { x: 612, y: 484 }, heading: Math.PI / 2, hotspot: 'ines' },
  { id: 'bonpland', kind: 'bonpland', position: { x: 252, y: 545 }, heading: Math.PI * 0.9, hotspot: 'bonpland' },
  { id: 'porter', kind: 'porter', position: { x: 980, y: 860 }, heading: Math.PI / 4 },
  { id: 'clerk', kind: 'clerk', position: { x: 1300, y: 858 }, heading: Math.PI * 0.75 },
];

/** Static characters block movement with a small body-sized collider. */
export function figureCollider(figure: SceneFigure): Rectangle {
  return { x: figure.position.x - 12, y: figure.position.y - 11, width: 24, height: 22 };
}

/** The pier is the gap between the two stretches of open water. */
export const CUMANA_SHORE = { beach: 828, water: 884, pier: { from: 1160, to: 1250 } };

export const CUMANA_HOTSPOTS: SceneHotspot[] = [
  {
    id: 'ines', label: 'Inés Ávila', kind: 'person', point: { x: 612, y: 484 }, radius: 76, markerHeight: 74,
    description: 'A shipping clerk who knows which walls were repaired, and by whom.',
  },
  {
    id: 'bonpland', label: 'Aimé Bonpland', kind: 'person', point: { x: 252, y: 545 }, radius: 76, markerHeight: 80,
    description: 'Your companion, at his plant press.',
  },
  {
    id: 'field-case', label: 'Field instruments', kind: 'object', point: { x: 372, y: 621 }, radius: 78, markerHeight: 58,
    description: 'Thermometers, a barometer, a hygrometer and a card of blues.',
  },
  {
    id: 'damaged-wall', label: 'Broken masonry', kind: 'object', point: { x: 895, y: 607 }, radius: 84, markerHeight: 100,
    description: 'A courtyard wall with repairs of different ages.',
  },
  {
    id: 'quay', label: 'The pier', kind: 'place', point: { x: 1205, y: 930 }, radius: 84, markerHeight: 36,
    description: 'Boats, porters and a clerk counting barrels.',
  },
  {
    id: 'plaza', label: 'The square', kind: 'place', point: { x: 1130, y: 520 }, radius: 84, markerHeight: 60,
    description: 'The public square, with a well at its centre.',
  },
];

export const CUMANA_MAP: ExplorationMap = {
  width: 1536,
  height: 1024,
  tileSize: 32,
  margin: 12,
  spawn: { x: 150, y: 720 },
  obstacles: [
    ...CUMANA_STRUCTURES.map(s => s.footprint),
    ...CUMANA_FIGURES.map(figureCollider),
    { x: 0, y: CUMANA_SHORE.water, width: CUMANA_SHORE.pier.from, height: 1024 - CUMANA_SHORE.water },
    { x: CUMANA_SHORE.pier.to, y: CUMANA_SHORE.water, width: 1536 - CUMANA_SHORE.pier.to, height: 1024 - CUMANA_SHORE.water },
  ],
  hotspots: CUMANA_HOTSPOTS,
};

/** The scene shows July 1799 until the fieldwork chapter ends, then November. */
export function cumanaPeriod(flags: readonly string[]): 'july' | 'november' {
  return flags.includes('cumana_fieldwork_complete') ? 'november' : 'july';
}
