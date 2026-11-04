/** Line-art scenes for the scroll film. Pure SVG, no text that needs to be read closely. */

export type Pt = { x: number; y: number };

/** Applicant's phone → WLAN router → internet → Recruit24. */
export const PATH_1: Pt[] = [
  { x: 262, y: 545 }, { x: 430, y: 560 }, { x: 700, y: 560 }, { x: 980, y: 420 }, { x: 1120, y: 600 },
  { x: 1260, y: 380 }, { x: 1400, y: 560 }, { x: 1540, y: 420 }, { x: 1850, y: 470 },
];
/** Recruit24 → the HR office. */
export const PATH_2: Pt[] = [{ x: 1850, y: 470 }, { x: 2000, y: 430 }, { x: 2140, y: 520 }, { x: 2255, y: 560 }];

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

export function pointAt(path: Pt[], f: number): Pt {
  const total = path.slice(1).reduce((n, p, i) => n + dist(path[i], p), 0);
  let left = Math.min(1, Math.max(0, f)) * total;
  for (let i = 1; i < path.length; i++) {
    const d = dist(path[i - 1], path[i]);
    if (left <= d) {
      const k = d ? left / d : 0;
      return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * k, y: path[i - 1].y + (path[i].y - path[i - 1].y) * k };
    }
    left -= d;
  }
  return path[path.length - 1];
}

/** The part of a path travelled so far. */
export function partial(path: Pt[], f: number): Pt[] {
  if (f <= 0) return [path[0]];
  const end = pointAt(path, f);
  const total = path.slice(1).reduce((n, p, i) => n + dist(path[i], p), 0);
  let left = Math.min(1, f) * total;
  const out: Pt[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const d = dist(path[i - 1], path[i]);
    if (left <= d) break;
    out.push(path[i]);
    left -= d;
  }
  out.push(end);
  return out;
}

const pts = (p: Pt[]) => p.map((q) => `${q.x},${q.y}`).join(" ");

const STARS = [[140, 90], [320, 160], [520, 70], [690, 190], [860, 110], [1040, 60], [1210, 170], [1390, 90], [1580, 150], [1730, 60], [1960, 120], [2290, 80], [2380, 190], [60, 230], [940, 240]];

/** Night living room with Max on the sofa; the phone sits exactly in the middle (800/500) so the film can zoom into it. */
export function RoomArt({ glow = 1, hands = 1 }: { glow?: number; hands?: number }) {
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FDBA74" stopOpacity=".45" /><stop offset="1" stopColor="#FDBA74" stopOpacity="0" /></radialGradient>
        <radialGradient id="phoneglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FDB48C" stopOpacity=".55" /><stop offset="1" stopColor="#FDB48C" stopOpacity="0" /></radialGradient>
        <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#23293A" /><stop offset="1" stopColor="#313950" /></linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="#10131D" />
      {/* window with moon and city */}
      <rect x="1010" y="120" width="430" height="430" rx="14" fill="url(#win)" stroke="#2C3245" strokeWidth="6" />
      <circle cx="1350" cy="220" r="34" fill="#FDE7C4" opacity=".9" />
      {[[1060, 180], [1120, 260], [1220, 170], [1290, 300], [1400, 330], [1170, 330]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.5" fill="#fff" opacity=".7" />)}
      <path d="M1013 547 V450 h50 v-40 h40 v60 h45 v-90 h55 v70 h40 v-50 h60 v80 h50 v-30 h80 V547 Z" fill="#1E2330" />
      {[[1030, 470], [1080, 440], [1120, 490], [1170, 420], [1210, 470], [1260, 500], [1330, 480], [1390, 500]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="10" height="12" fill="#FDBA74" opacity=".75" />)}
      <line x1="1225" y1="120" x2="1225" y2="550" stroke="#2C3245" strokeWidth="6" />
      {/* floor lamp */}
      <circle cx="300" cy="330" r="260" fill="url(#lamp)" />
      <line x1="300" y1="360" x2="300" y2="840" stroke="#3B4560" strokeWidth="10" strokeLinecap="round" />
      <path d="M235 360 L365 360 L335 280 L265 280 Z" fill="#FDBA74" opacity=".9" />
      <ellipse cx="300" cy="845" rx="60" ry="10" fill="#2C3449" />
      {/* floor */}
      <rect x="0" y="830" width="1600" height="170" fill="#101219" />
      <ellipse cx="820" cy="845" rx="460" ry="22" fill="#08090F" opacity=".8" />
      {/* sofa */}
      <rect x="430" y="420" width="760" height="230" rx="60" fill="#343D56" />
      <rect x="400" y="560" width="820" height="200" rx="48" fill="#3F4966" />
      <rect x="380" y="520" width="110" height="260" rx="44" fill="#30384F" />
      <rect x="1130" y="520" width="110" height="260" rx="44" fill="#30384F" />
      <rect x="470" y="770" width="24" height="60" rx="8" fill="#222838" />
      <rect x="1126" y="770" width="24" height="60" rx="8" fill="#222838" />
      {/* Max */}
      <circle cx="800" cy="500" r={180} fill="url(#phoneglow)" opacity={glow} />
      <path d="M700 640 h110 v190 h-52 Z" fill="#262D3F" />
      <rect x="704" y="600" width="230" height="74" rx="36" fill="#2D354A" />
      <rect x="862" y="610" width="64" height="216" rx="30" fill="#2D354A" />
      <ellipse cx="900" cy="830" rx="54" ry="16" fill="#191D29" />
      <ellipse cx="760" cy="830" rx="54" ry="16" fill="#191D29" />
      <path d="M690 420 Q760 392 830 420 L850 620 Q760 646 670 620 Z" fill="#C84F14" />
      <path d="M760 400 Q800 410 830 420 L850 620 Q800 634 770 632 Z" fill="#F97A3A" opacity={0.35 + 0.4 * glow} />
      <rect x="742" y="372" width="34" height="34" rx="10" fill="#C99A7E" />
      <circle cx="759" cy="330" r="52" fill="#D8AE92" />
      <path d="M707 322 Q712 268 762 268 Q812 270 812 318 Q790 296 760 300 Q728 302 707 322 Z" fill="#2A1E1A" />
      <circle cx="759" cy="330" r="52" fill="#FDB48C" opacity={0.18 * glow} />
      <g opacity={0.25 + 0.75 * hands}><path d="M700 440 Q672 540 742 560 L782 536" fill="none" stroke="#A8420F" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M826 446 Q860 540 830 556 L816 540" fill="none" stroke="#A8420F" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" /></g>
      {/* phone in the hands, centred at 800/500 */}
      <rect x="779" y="463" width="42" height="74" rx="8" fill="#0A0C14" />
      <rect x="782.5" y="467" width="35" height="66" rx="5.5" fill="#FFF6F0" opacity={0.85 + 0.15 * glow} />
      <rect x="787" y="478" width="26" height="4" rx="2" fill="#C84F14" />
      <rect x="787" y="488" width="20" height="3" rx="1.5" fill="#FFD3B8" />
      <rect x="787" y="496" width="24" height="3" rx="1.5" fill="#FFD3B8" />
      <rect x="787" y="518" width="26" height="8" rx="3" fill="#C84F14" />
      <g opacity={hands}><circle cx="778" cy="532" r="13" fill="#D8AE92" /><circle cx="823" cy="530" r="12" fill="#D8AE92" /></g>
    </svg>
  );
}

/** Panorama: Max's home, the WLAN router, the internet, Recruit24 and the HR office. 2400 × 900. */
export function NetworkArt({ f1, f2, packet, dawn, packetLabel }: { f1: number; f2: number; packet: Pt | null; dawn: number; packetLabel: "cv" | "report" }) {
  const t1 = partial(PATH_1, f1);
  const t2 = partial(PATH_2, f2);
  const near = (x: number) => (packet ? Math.max(0, 1 - Math.abs(packet.x - x) / 260) : 0);
  return (
    <svg viewBox="0 0 2400 900" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12151D" /><stop offset="1" stopColor="#212736" /></linearGradient>
        <linearGradient id="dsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#313950" /><stop offset=".65" stopColor="#566284" /><stop offset="1" stopColor="#F97A3A" /></linearGradient>
        <radialGradient id="pglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FDB48C" stopOpacity=".9" /><stop offset="1" stopColor="#F97A3A" stopOpacity="0" /></radialGradient>
        <radialGradient id="r24glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#F97A3A" stopOpacity=".55" /><stop offset="1" stopColor="#F97A3A" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="2400" height="900" fill="url(#nsky)" />
      <rect width="2400" height="900" fill="url(#dsky)" opacity={dawn * 0.85} />
      {STARS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#fff" opacity={0.65 * (1 - dawn)} />)}
      <circle cx="2120" cy="150" r="38" fill="#FDE7C4" opacity={0.9 * (1 - dawn)} />
      <circle cx="2140" cy={760 - 150 * dawn} r="80" fill="#FDBA74" opacity={dawn} />
      {/* skyline */}
      <path d="M0 760 V690 h80 v-50 h70 v80 h90 v-120 h60 v120 h120 v-40 h90 v70 h140 v-90 h80 v90 h160 v-60 h120 v60 h200 v-100 h70 v100 h180 v-50 h120 v50 h160 v-80 h100 v80 h240 v-40 h120 V760 Z" fill="#191D28" opacity={1 - dawn * 0.4} />
      <rect x="0" y="760" width="2400" height="140" fill="#0F1118" />
      {/* Max's home */}
      <rect x="110" y="380" width="300" height="380" rx="10" fill="#191D2B" stroke="#2C3245" strokeWidth="4" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={140 + c * 90} y={410 + r * 105} width="60" height="70" rx="6" fill={r === 1 && c === 1 ? "#FDBA74" : "#272E40"} opacity={r === 1 && c === 1 ? 0.9 : 1} />))}
      <circle cx="262" cy="545" r={40 + 30 * near(262)} fill="url(#pglow)" opacity=".8" />
      {/* WLAN router */}
      {[0, 1, 2].map((i) => <path key={i} d={`M${440 + i * 34} ${520 - i * 6} q 22 40 0 80`} fill="none" stroke="#FDB48C" strokeWidth="5" strokeLinecap="round" opacity={0.25 + 0.6 * near(520)} />)}
      <line x1="642" y1="560" x2="626" y2="490" stroke="#4C5879" strokeWidth="8" strokeLinecap="round" />
      <line x1="758" y1="560" x2="774" y2="490" stroke="#4C5879" strokeWidth="8" strokeLinecap="round" />
      <rect x="610" y="555" width="180" height="62" rx="16" fill="#252C3D" stroke="#414C6A" strokeWidth="4" />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={642 + i * 34} cy="590" r="6" fill="#34D399" className="film-blink" style={{ animationDelay: `${i * 0.25}s` }} />)}
      <text x="700" y="665" textAnchor="middle" fontSize="24" fill="#fff" opacity=".55" fontFamily="inherit">WLAN-Router</text>
      {/* internet mesh */}
      {[[980, 420, 1120, 600], [1120, 600, 1260, 380], [1260, 380, 1400, 560], [1400, 560, 1540, 420], [980, 420, 1260, 380], [1120, 600, 1400, 560], [1260, 380, 1540, 420], [980, 420, 900, 300], [1540, 420, 1600, 280], [1120, 600, 1000, 700], [1400, 560, 1500, 700]].map(([a, b, c, d], i) => (
        <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#3B4560" strokeWidth="3" />
      ))}
      {[[980, 420], [1120, 600], [1260, 380], [1400, 560], [1540, 420], [900, 300], [1600, 280], [1000, 700], [1500, 700]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={10 + 6 * near(x)} fill="#333B53" stroke="#F97A3A" strokeWidth="3" />
      ))}
      <text x="1260" y="300" textAnchor="middle" fontSize="24" fill="#fff" opacity=".55" fontFamily="inherit">Internet · verschlüsselt</text>
      <g transform="translate(1238 318)" opacity=".7"><rect x="0" y="14" width="44" height="34" rx="6" fill="#F97A3A" /><path d="M9 14 v-6 a13 13 0 0 1 26 0 v6" fill="none" stroke="#F97A3A" strokeWidth="5" /></g>
      {/* Recruit24 */}
      <circle cx="1850" cy="480" r="240" fill="url(#r24glow)" opacity={0.6 + 0.4 * near(1850)} />
      <rect x="1760" y="360" width="180" height="270" rx="24" fill="#293043" stroke="#C84F14" strokeWidth="4" />
      {[0, 1, 2].map((i) => (
        <g key={i}><rect x="1782" y={450 + i * 52} width="136" height="36" rx="8" fill="#343D56" /><circle cx="1898" cy={468 + i * 52} r="5" fill="#34D399" className="film-blink" style={{ animationDelay: `${i * 0.4}s` }} /></g>
      ))}
      <image href="/brand/recruit24-icon-light.svg" x="1805" y="365" width="90" height="90" />
      <text x="1850" y="680" textAnchor="middle" fontSize="28" fontWeight="600" fill="#fff" opacity=".85" fontFamily="inherit">Recruit24</text>
      {/* HR office */}
      <rect x="2160" y="400" width="210" height="360" rx="10" fill="#191D2B" stroke="#2C3245" strokeWidth="4" />
      {[0, 1, 2, 3].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={2190 + c * 90} y={430 + r * 78} width="60" height="52" rx="6" fill={r === 1 && c === 1 ? "#FDBA74" : "#272E40"} opacity={r === 1 && c === 1 ? 0.35 + 0.6 * dawn : 1} />))}
      <text x="2265" y="820" textAnchor="middle" fontSize="24" fill="#fff" opacity=".55" fontFamily="inherit">Ihr Büro</text>
      {/* paths */}
      <polyline points={pts(PATH_1)} fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="4" strokeDasharray="8 14" strokeLinecap="round" />
      <polyline points={pts(PATH_2)} fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="4" strokeDasharray="8 14" strokeLinecap="round" />
      {f1 > 0 && <polyline points={pts(t1)} fill="none" stroke="#FB9561" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
      {f2 > 0 && <polyline points={pts(t2)} fill="none" stroke="#FDBA74" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
      {packet && (
        <g transform={`translate(${packet.x} ${packet.y})`}>
          <circle r="70" fill="url(#pglow)" />
          <circle r="30" fill="#fff" />
          <rect x="-11" y="-15" width="22" height="30" rx="3" fill={packetLabel === "cv" ? "#C84F14" : "#F97A3A"} />
          <rect x="-6" y="-7" width="12" height="3" rx="1.5" fill="#fff" />
          <rect x="-6" y="0" width="12" height="3" rx="1.5" fill="#fff" />
          <rect x="-6" y="7" width="8" height="3" rx="1.5" fill="#fff" />
        </g>
      )}
    </svg>
  );
}

/** Monday morning in the HR office; the monitor screen is centred at 800/500 for the zoom. */
export function OfficeArt() {
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sunrise" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F97A3A" /><stop offset=".6" stopColor="#F97A3A" /><stop offset="1" stopColor="#FDE7C4" /></linearGradient>
        <radialGradient id="sunlight" cx="0.15" cy="0.3" r="0.9"><stop offset="0" stopColor="#FDBA74" stopOpacity=".28" /><stop offset="1" stopColor="#FDBA74" stopOpacity="0" /></radialGradient>
        <radialGradient id="screenglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffffff" stopOpacity=".18" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="1000" fill="#2C3347" />
      <rect width="1600" height="1000" fill="url(#sunlight)" />
      {/* window */}
      <rect x="90" y="110" width="360" height="460" rx="14" fill="url(#sunrise)" stroke="#414C6A" strokeWidth="8" />
      <circle cx="300" cy="470" r="70" fill="#FFF1DC" opacity=".9" />
      <path d="M94 520 h80 v-40 h60 v50 h70 v-70 h50 v60 h92 V566 H94 Z" fill="#454E68" opacity=".7" />
      <line x1="270" y1="110" x2="270" y2="570" stroke="#414C6A" strokeWidth="8" />
      {/* shelf and plant */}
      <rect x="1220" y="230" width="280" height="14" rx="7" fill="#414C6A" />
      <rect x="1240" y="170" width="40" height="60" rx="4" fill="#C84F14" /><rect x="1290" y="185" width="34" height="45" rx="4" fill="#F97A3A" /><rect x="1334" y="175" width="30" height="55" rx="4" fill="#FB9561" />
      <circle cx="1440" cy="190" r="34" fill="#2F9E74" /><rect x="1420" y="200" width="40" height="30" rx="6" fill="#F5F6F8" />
      {/* monitor */}
      <circle cx="800" cy="500" r="420" fill="url(#screenglow)" />
      <rect x="540" y="330" width="520" height="340" rx="22" fill="#0A0C14" />
      <rect x="560" y="350" width="480" height="300" rx="8" fill="#F5F6F8" />
      <rect x="560" y="350" width="90" height="300" rx="8" fill="#141824" />
      <rect x="574" y="366" width="26" height="26" rx="7" fill="#C84F14" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="574" y={410 + i * 22} width={52 - (i % 2) * 14} height="8" rx="4" fill="#3B4560" />)}
      <rect x="672" y="372" width="170" height="16" rx="5" fill="#161A26" />
      <rect x="672" y="396" width="230" height="9" rx="4" fill="#94A3B8" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={672 + i * 88} y="420" width="78" height="54" rx="8" fill="#fff" stroke="#E2E8F0" />)}
      <rect x="672" y="488" width="300" height="146" rx="8" fill="#fff" stroke="#E2E8F0" />
      <rect x="688" y="504" width="120" height="10" rx="4" fill="#161A26" />
      <rect x="688" y="532" width="268" height="34" rx="6" fill="#FFF6F0" stroke="#FDB48C" />
      <rect x="900" y="540" width="48" height="18" rx="5" fill="#C84F14" />
      <rect x="986" y="488" width="44" height="146" rx="8" fill="#fff" stroke="#E2E8F0" />
      <rect x="770" y="670" width="60" height="70" fill="#191D2B" />
      <rect x="700" y="736" width="200" height="16" rx="8" fill="#191D2B" />
      {/* desk */}
      <rect x="0" y="750" width="1600" height="30" fill="#465273" />
      <rect x="0" y="780" width="1600" height="220" fill="#252B3C" />
      <rect x="620" y="765" width="360" height="22" rx="6" fill="#3B4560" />
      <rect x="1040" y="700" width="70" height="64" rx="12" fill="#F5F6F8" /><path d="M1110 715 q30 0 30 22 q0 22 -30 22" fill="none" stroke="#F5F6F8" strokeWidth="10" />
      <path d="M1052 690 q8 -20 0 -40 M1076 690 q8 -20 0 -40" stroke="#fff" strokeOpacity=".4" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Sandra from behind */}
      <path d="M180 1000 Q200 820 330 800 Q460 820 480 1000 Z" fill="#C84F14" />
      <circle cx="330" cy="740" r="78" fill="#3A2420" />
      <path d="M262 760 Q250 860 300 880 L360 880 Q410 860 398 760 Z" fill="#3A2420" />
    </svg>
  );
}
