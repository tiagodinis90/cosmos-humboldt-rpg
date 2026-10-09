import { screenFacing } from '../../exploration/iso';

/**
 * Original vector characters. Each figure is built from a few shapes so that
 * eight facings and a walk cycle can be derived procedurally.
 */
type Palette = {
  coat: string; coatDark: string; under: string; legs: string; boots: string;
  skin: string; hair: string; hat?: string; hatBand?: string; skirt?: string;
};

export const HUMBOLDT: Palette = {
  coat: '#2f4655', coatDark: '#22333f', under: '#d8c08a', legs: '#ded4bf', boots: '#2a1d16',
  skin: '#e2b996', hair: '#6b4a32', hat: '#2d2620', hatBand: '#5a4a3a',
};
const BONPLAND: Palette = {
  coat: '#7a5a3a', coatDark: '#5d432b', under: '#efe8da', legs: '#8a8070', boots: '#3a2a1e',
  skin: '#e4bb98', hair: '#3b2a1e', hat: '#d9c27a', hatBand: '#8a6a3a',
};
const INES: Palette = {
  coat: '#efe6d6', coatDark: '#d8ccb6', under: '#a6553a', legs: '#3e4f7a', boots: '#2a1f1a',
  skin: '#a8714f', hair: '#2a1f1a', skirt: '#3e4f7a',
};
const PORTER: Palette = {
  coat: '#e8e0cc', coatDark: '#cfc5ad', under: '#cfc5ad', legs: '#9a8a6a', boots: '#5a3f2a',
  skin: '#6e4630', hair: '#1f1712', hat: '#c9b27a', hatBand: '#8a6a3a',
};
const CLERK: Palette = {
  coat: '#4a3b2e', coatDark: '#372b21', under: '#e9e0cc', legs: '#5b4e3e', boots: '#241a13',
  skin: '#d6a986', hair: '#4a3a2c', hat: '#1f1a16', hatBand: '#1f1a16',
};

type View = { kind: 'front' | 'front3q' | 'side' | 'back3q' | 'back'; flip: boolean };

function viewFor(sector: number): View {
  switch (sector) {
    case 0: return { kind: 'side', flip: false };
    case 1: return { kind: 'front3q', flip: false };
    case 2: return { kind: 'front', flip: false };
    case 3: return { kind: 'front3q', flip: true };
    case 4: return { kind: 'side', flip: true };
    case 5: return { kind: 'back3q', flip: true };
    case 6: return { kind: 'back', flip: false };
    default: return { kind: 'back3q', flip: false };
  }
}

type Pose = 'stand' | 'sit' | 'kneel' | 'carry';

export function Person({
  x, y, heading, stride = 0, moving = false, palette, pose = 'stand', idle = true, ledger = false,
}: {
  x: number; y: number; heading: number; stride?: number; moving?: boolean;
  palette: Palette; pose?: Pose; idle?: boolean; ledger?: boolean;
}) {
  const view = viewFor(screenFacing(heading));
  const phase = stride / 10;
  const swing = moving ? Math.sin(phase) : 0;
  const bob = moving ? -Math.abs(Math.cos(phase)) * 1.6 : 0;
  const front = view.kind === 'front' || view.kind === 'front3q';
  const back = view.kind === 'back' || view.kind === 'back3q';
  const side = view.kind === 'side';
  const width = side ? 11 : view.kind === 'front' || view.kind === 'back' ? 17 : 14;
  const seated = pose === 'sit';
  const kneel = pose === 'kneel';
  const hip = seated ? -22 : kneel ? -18 : -30;
  const shoulder = hip - 22;
  const head = shoulder - 9;
  const legLen = 27;

  // Legs: swing around the hip in profile, alternate lifting when seen from front/back.
  const legs = [-1, 1].map(sideSign => {
    const s = swing * sideSign;
    if (seated) {
      const knee = { x: sideSign * 4 + (side ? 12 : 0), y: hip + (side ? 0 : 6) };
      return (
        <g key={sideSign}>
          <polyline points={`${sideSign * 4},${hip} ${knee.x},${knee.y} ${knee.x},${-3}`} stroke={palette.skirt ?? palette.legs} strokeWidth="6" fill="none" strokeLinecap="round" />
          <ellipse cx={knee.x + 2} cy={-2} rx="4" ry="2.4" fill={palette.boots} />
        </g>
      );
    }
    if (kneel) {
      return (
        <g key={sideSign}>
          <polyline points={`${sideSign * 4},${hip} ${sideSign * 4 + 10},${-6} ${sideSign * 4 - 4},${-4}`} stroke={palette.legs} strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      );
    }
    if (side) {
      const angle = s * 0.5;
      const foot = { x: Math.sin(angle) * legLen, y: hip + Math.cos(angle) * legLen };
      return (
        <g key={sideSign} opacity={sideSign < 0 ? 0.85 : 1}>
          <line x1="0" y1={hip} x2={foot.x} y2={foot.y - 2} stroke={sideSign < 0 ? shade(palette.legs) : palette.legs} strokeWidth="6" strokeLinecap="round" />
          <ellipse cx={foot.x + 3} cy={foot.y - 1} rx="5" ry="2.6" fill={palette.boots} />
        </g>
      );
    }
    const lift = Math.max(0, s) * 4;
    const lean = back ? -s * 1.5 : s * 1.5;
    const fx = sideSign * 4.5 + (view.kind === 'front3q' || view.kind === 'back3q' ? s * 3 : 0);
    return (
      <g key={sideSign}>
        <line x1={sideSign * 4} y1={hip} x2={fx + lean} y2={-3 - lift} stroke={palette.legs} strokeWidth="6.5" strokeLinecap="round" />
        <ellipse cx={fx + lean} cy={-2 - lift} rx="4" ry="2.5" fill={palette.boots} />
      </g>
    );
  });

  const coatHem = seated || kneel ? hip + 4 : hip + 8;
  const body = (
    <g>
      {palette.skirt && !seated && (
        <path d={`M${-width / 2} ${hip - 2} L${-width / 2 - 5} ${-3} L${width / 2 + 5} ${-3} L${width / 2} ${hip - 2} Z`} fill={palette.skirt} />
      )}
      {palette.skirt && seated && (
        <path d={`M${-width / 2 - 2} ${hip - 2} L${-width / 2 - 4 + (side ? 10 : 0)} ${-4} L${width / 2 + 6 + (side ? 10 : 0)} ${-4} L${width / 2 + 2} ${hip - 2} Z`} fill={palette.skirt} />
      )}
      <path
        d={`M${-width / 2} ${shoulder + 2} Q${-width / 2 - 1} ${shoulder - 2} ${-width / 2 + 3} ${shoulder - 3} L${width / 2 - 3} ${shoulder - 3} Q${width / 2 + 1} ${shoulder - 2} ${width / 2} ${shoulder + 2} L${width / 2 + 1.5} ${coatHem} L${-width / 2 - 1.5} ${coatHem} Z`}
        fill={back ? palette.coatDark : palette.coat}
      />
      {back && !palette.skirt && <path d={`M-4 ${hip} L-6 ${coatHem + 8} L-1 ${coatHem + 6} Z M4 ${hip} L6 ${coatHem + 8} L1 ${coatHem + 6} Z`} fill={palette.coatDark} />}
      {front && !palette.skirt && (
        <g>
          <path d={`M-3 ${shoulder - 3} L0 ${hip - 2} L3 ${shoulder - 3} Z`} fill={palette.under} />
          <path d={`M-3 ${shoulder - 3} L0 ${shoulder + 3} L3 ${shoulder - 3} Z`} fill="#f4efe2" />
        </g>
      )}
      {palette.skirt && front && <path d={`M${-width / 2} ${shoulder - 1} Q0 ${shoulder + 6} ${width / 2} ${shoulder - 1} L${width / 2} ${shoulder + 4} Q0 ${shoulder + 11} ${-width / 2} ${shoulder + 4} Z`} fill={palette.under} />}
    </g>
  );

  const arm = (sideSign: number) => {
    const s = moving ? -swing * sideSign : 0;
    const ax = side ? 0 : sideSign * (width / 2 + 1);
    const handX = ax + (side ? s * 9 : s * 2) + (ledger ? -sideSign * 5 : 0);
    const handY = ledger ? shoulder + 14 : shoulder + 20 - Math.abs(s) * 2;
    if (side && sideSign < 0) return null;
    return (
      <g key={'arm' + sideSign}>
        <line x1={ax} y1={shoulder} x2={handX} y2={handY} stroke={back ? palette.coatDark : palette.coat} strokeWidth="5" strokeLinecap="round" />
        <circle cx={handX} cy={handY + 2} r="2.3" fill={palette.skin} />
      </g>
    );
  };

  const faceOffset = view.kind === 'front3q' ? 2.5 : side ? 4 : 0;
  const headGroup = (
    <g>
      <rect x="-2.5" y={head + 5} width="5" height="5" fill={palette.skin} />
      <circle cx="0" cy={head} r="7" fill={back ? palette.hair : palette.skin} />
      {!back && (
        <g>
          <path d={`M-7 ${head - 1} Q-6 ${head - 9} 1 ${head - 8} Q7 ${head - 7} 7 ${head - 2} Q${faceOffset - 3} ${head - 6} -7 ${head - 1} Z`} fill={palette.hair} />
          {side && <path d={`M-7 ${head - 2} Q-9 ${head + 4} -4 ${head + 6} L-2 ${head} Z`} fill={palette.hair} />}
          <circle cx={faceOffset + 2.4} cy={head - 0.5} r="0.9" fill="#2a1d16" opacity="0.8" />
          {view.kind !== 'side' && <circle cx={faceOffset - 2.4} cy={head - 0.5} r="0.9" fill="#2a1d16" opacity="0.8" />}
        </g>
      )}
      {palette.skirt && <path d={`M-8 ${head - 3} Q0 ${head - 12} 8 ${head - 3} L9 ${head + 9} L6 ${head + 2} Q0 ${head - 5} -6 ${head + 2} L-9 ${head + 9} Z`} fill="#a6553a" opacity="0.95" />}
      {palette.hat && (
        <g>
          <ellipse cx="0" cy={head - 5} rx="12" ry="3.4" fill={palette.hat} />
          <path d={`M-6.5 ${head - 5} L-6 ${head - 13} Q0 ${head - 15} 6 ${head - 13} L6.5 ${head - 5} Z`} fill={palette.hat} />
          <rect x="-6.5" y={head - 8} width="13" height="2.2" fill={palette.hatBand} />
        </g>
      )}
    </g>
  );

  return (
    <g transform={`translate(${x.toFixed(1)},${(y + bob).toFixed(1)})`}>
      <ellipse cx="0" cy="0" rx="14" ry="5.5" fill="#1f160d" opacity="0.32" />
      <g transform={view.flip ? 'scale(-1,1)' : undefined}>
        <g className={idle && !moving ? 'cosmos-breathe' : undefined}>
          {back && headGroup}
          {legs}
          {!side && arm(-1)}
          {body}
          {arm(1)}
          {!back && headGroup}
          {ledger && (
            <g>
              <rect x={-9} y={shoulder + 10} width="16" height="11" fill="#5b3a28" transform={`rotate(-8 0 ${shoulder + 14})`} />
              <rect x={-8} y={shoulder + 11} width="14" height="9" fill="#efe6d0" transform={`rotate(-8 0 ${shoulder + 14})`} />
            </g>
          )}
          {pose === 'carry' && (
            <g>
              <rect x="5" y={shoulder - 15} width="15" height="17" rx="4" fill="#7b5233" />
              <ellipse cx="12.5" cy={shoulder - 15} rx="7.5" ry="3" fill="#9b6e46" />
              <line x1="5" y1={shoulder - 7} x2="20" y2={shoulder - 7} stroke="#3f2a1b" strokeWidth="1.5" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

function shade(color: string): string {
  const n = parseInt(color.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.8), g = Math.round(((n >> 8) & 255) * 0.8), b = Math.round((n & 255) * 0.8);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function NpcFigure({ kind, x, y, heading, period }: {
  kind: 'ines' | 'bonpland' | 'porter' | 'clerk'; x: number; y: number; heading: number; period: 'july' | 'november';
}) {
  switch (kind) {
    case 'ines':
      return (
        <g>
          <rect x={x - 9} y={y - 18} width="18" height="4" fill="#6b4a2e" />
          <line x1={x - 7} y1={y - 14} x2={x - 8} y2={y} stroke="#4a3322" strokeWidth="2" />
          <line x1={x + 7} y1={y - 14} x2={x + 8} y2={y} stroke="#4a3322" strokeWidth="2" />
          <Person x={x} y={y} heading={heading} palette={INES} pose="sit" ledger />
        </g>
      );
    case 'bonpland':
      return <Person x={x} y={y} heading={heading} palette={BONPLAND} pose={period === 'july' ? 'kneel' : 'stand'} ledger={period === 'november'} />;
    case 'porter':
      return <Person x={x} y={y} heading={heading} palette={PORTER} pose="carry" />;
    case 'clerk':
      return <Person x={x} y={y} heading={heading} palette={CLERK} ledger />;
  }
}
