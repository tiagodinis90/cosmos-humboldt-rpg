import {
  advanceAlongPath, distance, planRoute, stepDirect,
  type ExplorationMap, type Point, type SceneHotspot,
} from './world';

/**
 * Pure state machine for a point-and-click character. The React scene only
 * feeds it clicks, keys and frame times; everything here is testable in Node.
 */
export const WALK_SPEED = 125;
export const RUN_SPEED = 215;
/** Characters stop this far inside an interaction radius. */
export const APPROACH_SLACK = 12;
/** Preferred distance when walking up to a person. */
export const PERSONAL_SPACE = 56;

export type Walker = {
  position: Point;
  /** World-space heading in radians; persisted with the save. */
  heading: number;
  route: Point[];
  /** Hotspot to interact with on arrival. */
  target: string | null;
  running: boolean;
  /** Distance walked so far; drives the walk cycle. */
  stride: number;
};

export type WalkEvent =
  | { type: 'interact'; hotspot: SceneHotspot }
  | { type: 'arrived'; snapped: boolean }
  | { type: 'out-of-reach'; hotspot: SceneHotspot }
  | { type: 'unreachable' };

export type WalkResult = { walker: Walker; event: WalkEvent | null };

export function createWalker(position: Point, heading = Math.PI / 4): Walker {
  return { position: { ...position }, heading, route: [], target: null, running: false, stride: 0 };
}

function headingTowards(from: Point, to: Point, fallback: number): number {
  return distance(from, to) < 1e-6 ? fallback : Math.atan2(to.y - from.y, to.x - from.x);
}

/** Stop walking and forget any pending interaction (e.g. a dialogue opened). */
export function stopWalker(walker: Walker): Walker {
  if (!walker.route.length && !walker.target && !walker.running) return walker;
  return { ...walker, route: [], target: null, running: false };
}

/**
 * Respond to a click. A new command always replaces the previous route and
 * target, including when the new destination is impossible.
 */
export function walkTo(
  walker: Walker,
  map: ExplorationMap,
  destination: Point,
  options: { hotspot?: SceneHotspot; run?: boolean } = {},
): WalkResult {
  const { hotspot, run = false } = options;
  if (hotspot && distance(walker.position, hotspot.point) <= hotspot.radius) {
    return {
      walker: { ...stopWalker(walker), heading: headingTowards(walker.position, hotspot.point, walker.heading) },
      event: { type: 'interact', hotspot },
    };
  }
  const plan = hotspot
    ? planRoute(map, walker.position, hotspot.point, hotspot.radius - APPROACH_SLACK, hotspot.kind === 'person' ? PERSONAL_SPACE : 0)
    : planRoute(map, walker.position, destination);
  if (plan.status === 'unreachable') {
    return { walker: stopWalker(walker), event: { type: 'unreachable' } };
  }
  if (plan.status === 'here') {
    return { walker: stopWalker(walker), event: { type: 'arrived', snapped: false } };
  }
  return {
    walker: {
      ...walker,
      route: plan.waypoints,
      target: hotspot?.id ?? null,
      running: run,
      heading: headingTowards(walker.position, plan.waypoints[0], walker.heading),
    },
    event: null,
  };
}

/** Advance along the route by one frame. Arrival events fire exactly once. */
export function tickWalker(walker: Walker, map: ExplorationMap, dt: number): WalkResult {
  if (!walker.route.length) return { walker, event: null };
  const speed = walker.running ? RUN_SPEED : WALK_SPEED;
  const step = advanceAlongPath(walker.position, walker.route, speed * Math.max(0, dt));
  const moved = distance(walker.position, step.position);
  const next: Walker = {
    ...walker,
    position: step.position,
    route: step.remaining,
    stride: walker.stride + moved,
    heading: moved > 1e-6 ? headingTowards(walker.position, step.position, walker.heading) : walker.heading,
  };
  if (step.remaining.length) return { walker: next, event: null };
  const hotspot = walker.target ? map.hotspots.find(h => h.id === walker.target) : undefined;
  const stopped: Walker = { ...next, target: null, running: false };
  if (!hotspot) return { walker: stopped, event: { type: 'arrived', snapped: false } };
  if (distance(stopped.position, hotspot.point) <= hotspot.radius) {
    return {
      walker: { ...stopped, heading: headingTowards(stopped.position, hotspot.point, stopped.heading) },
      event: { type: 'interact', hotspot },
    };
  }
  return { walker: stopped, event: { type: 'out-of-reach', hotspot } };
}

/**
 * Keyboard movement in a world-space direction (normalised by the caller's
 * camera). Cancels any click route and slides along obstacles.
 */
export function pushWalker(walker: Walker, map: ExplorationMap, direction: Point, dt: number): Walker {
  const length = Math.hypot(direction.x, direction.y);
  if (length < 1e-6 || dt <= 0) return stopWalker(walker);
  const travel = WALK_SPEED * dt;
  const delta = { x: direction.x / length * travel, y: direction.y / length * travel };
  const position = stepDirect(walker.position, delta, map);
  const moved = distance(walker.position, position);
  return {
    ...walker,
    route: [],
    target: null,
    running: false,
    position,
    stride: walker.stride + moved,
    heading: Math.atan2(direction.y, direction.x),
  };
}
