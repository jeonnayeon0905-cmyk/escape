/**
 * 도트(픽셀) 아이콘. 문자열 격자를 SVG 사각형으로 그린다.
 * '.' 은 투명, 나머지 문자는 palette 의 색.
 */
const SPRITES = {
  key: {
    palette: { O: '#5a3b0a', Y: '#ffd166', y: '#e8a93c' },
    rows: [
      '...OOOO.....',
      '..OYYYYO....',
      '.OYy..yYO...',
      '.OYy..yYO...',
      '..OYYYYO....',
      '...OYYO.....',
      '...OYYO.....',
      '...OYYOOO...',
      '...OYYYYO...',
      '...OYYOO....',
      '...OYYYO....',
      '....OOO.....',
    ],
  },
  lock: {
    palette: { O: '#2a2f66', L: '#c9cdf0', P: '#8f8cff', p: '#6d5efc', K: '#161a44' },
    rows: [
      '...OOOOOO...',
      '..OLLLLLLO..',
      '..OL....LO..',
      '..OL....LO..',
      '.OOOOOOOOOO.',
      '.OPPPPPPPPO.',
      '.OPPPKKPPPO.',
      '.OPPPKKPPPO.',
      '.OPPPPKPPPO.',
      '.OppppKpppO.',
      '.OppppppppO.',
      '.OOOOOOOOOO.',
    ],
  },
  book: {
    palette: { O: '#241a5c', B: '#7b5cff', b: '#5a44c8', G: '#ffd166', W: '#f5f4ff' },
    rows: [
      '.OOOOOOOOO..',
      '.OBBBBBBBBO.',
      '.ObBBBGBBBO.',
      '.ObBBGGGBBO.',
      '.ObBBBGBBBO.',
      '.ObBBBBBBBO.',
      '.ObBBBBBBBO.',
      '.ObBBBBBBBO.',
      '.ObbbbbbbbO.',
      '.OWWWWWWWWO.',
      '..OOOOOOOOO.',
      '............',
    ],
  },
  calendar: {
    palette: { O: '#2a2f66', R: '#ff7aa2', W: '#e8e9ff', D: '#6d5efc' },
    rows: [
      '..O.....O...',
      '.OOOOOOOOOO.',
      '.ORRRRRRRRO.',
      '.ORRRRRRRRO.',
      '.OOOOOOOOOO.',
      '.OWWWWWWWWO.',
      '.OWDWDWDWWO.',
      '.OWWWWWWWWO.',
      '.OWDWDWDWWO.',
      '.OWWWWWWWWO.',
      '.OOOOOOOOOO.',
      '............',
    ],
  },
  flag: {
    palette: { O: '#0f3b30', M: '#5ee6b8', m: '#3cbf95', S: '#c9cdf0' },
    rows: [
      '.S..........',
      '.SOOOOOOO...',
      '.SOMMMMMMO..',
      '.SOMMmMMMMO.',
      '.SOMMMMmMMO.',
      '.SOMMMMMMO..',
      '.SOOOOOOO...',
      '.S..........',
      '.S..........',
      '.S..........',
      'SSS.........',
      '............',
    ],
  },
  trophy: {
    palette: { O: '#5a3b0a', Y: '#ffd166', y: '#e8a93c' },
    rows: [
      '.OOOOOOOOOO.',
      'OOYYYYYYYYOO',
      'OYOYYYYYYOYO',
      'OYOYYYYYYOYO',
      '.OOYYYYYYOO.',
      '...OYYYYO...',
      '....OYYO....',
      '.....YY.....',
      '....OyyO....',
      '...OYYYYO...',
      '...OOOOOO...',
      '............',
    ],
  },
  cat: {
    palette: { K: '#0a0c22', E: '#ffd166' },
    rows: [
      'K...K.....',
      'KK.KK.....',
      'KKKKK.....',
      'KEKEK.....',
      'KKKKK.....',
      '.KKKK.....',
      '.KKKKK....',
      '.KKKKK..K.',
      '.KKKKKK.K.',
      '.KKKKKKKK.',
    ],
  },
};

export default function PixelIcon({ name, size = 32, className = '', title }) {
  const sprite = SPRITES[name];
  if (!sprite) return null;
  const h = sprite.rows.length;
  const w = Math.max(...sprite.rows.map((r) => r.length));
  const rects = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      let run = 1; // 같은 색이 이어지면 한 사각형으로 합침
      while (row[x + run] === ch) run++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={sprite.palette[ch]} />);
      x += run;
    }
  });
  return (
    <svg
      className={`pixel-icon ${className}`}
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
    >
      {rects}
    </svg>
  );
}
