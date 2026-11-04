"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Line, PerformanceMonitor, MeshReflectorMaterial, RoundedBox, Sparkles, Stars, Trail } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  AppWindow, ApplyScreen, BookingScreen, CalendarCard, CallScreen, CheckPanels, DashScreen, LockScreen, PhoneFrame, ProfileScreen,
  callTime, ease, hhmm, lerp, local, minutesAt, seg,
} from "./film-shared";
import { ScreenAnchor, ScreenOverlay } from "./screen-overlay";

type V3 = [number, number, number];

/* ───────────── world layout (metres) ───────────── */

const PHONE: V3 = [0, 1.25, 0];
const PHONE_BODY = { w: 0.79, h: 1.56, d: 0.085 };
const PHONE_SCREEN = { w: 0.722, h: 1.482 }; // 380 × 780 px
const ROUTER: V3 = [4.2, 0, -0.7];
const CORE: V3 = [14, 1.75, -0.9];
const PANELS: V3 = [14, 1.75, 0.55];
const PANELS_SIZE = { w: 3.0, h: 1.82 }; // 1120 × 680 px
const MONITOR: V3 = [20, 1.98, -0.85];
const MONITOR_SCREEN = { w: 2.6, h: 1.603 }; // 1200 × 740 px
const FOV = 32;


const C1 = new THREE.CatmullRomCurve3(
  [[0, 2.05, 0], [0.9, 2.4, -0.3], [3.6, 1.2, -0.8], [6.4, 1.5, -1.6], [8.1, 2.5, -1.0], [9.7, 1.5, -2.0], [11.4, 2.3, -1.2], [13.2, 1.9, -0.9], [14, 1.75, -0.9]].map((v) => new THREE.Vector3(...(v as V3))),
  false, "catmullrom", 0.4,
);
const C2 = new THREE.CatmullRomCurve3(
  [[14, 1.75, -0.9], [15.6, 3.0, -0.6], [17.8, 2.9, -0.9], [19.4, 2.3, -1.1], [20, 1.98, -0.95]].map((v) => new THREE.Vector3(...(v as V3))),
  false, "catmullrom", 0.4,
);

/** Fixed pseudo-random network nodes between router and Recruit24. */
const NODES: V3[] = (() => {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: V3[] = [];
  for (let i = 0; i < 26; i++) out.push([5.8 + r() * 6.8, 0.7 + r() * 2.6, -3.2 + r() * 3.6]);
  return out;
})();
const EDGES: [V3, V3][] = (() => {
  const e: [V3, V3][] = [];
  NODES.forEach((a, i) => NODES.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 2.1) e.push([a, b]); }));
  return e;
})();

/* ───────────── camera ───────────── */

function fitDistance(w: number, h: number, pad: number, aspect: number) {
  const t = Math.tan((FOV * Math.PI) / 360);
  return Math.max(h / pad / (2 * t), w / pad / (2 * t * aspect));
}

function keyframes(aspect: number): { p: number; pos: V3; look: V3 }[] {
  const phoneLook: V3 = [PHONE[0], PHONE[1], PHONE[2]];
  const phoneClose: V3 = [PHONE[0], PHONE[1], PHONE[2] + fitDistance(PHONE_BODY.w, PHONE_BODY.h, 0.9, aspect)];
  const panelsClose: V3 = [PANELS[0], PANELS[1], PANELS[2] + fitDistance(PANELS_SIZE.w + 0.1, PANELS_SIZE.h + 0.1, 0.94, aspect)];
  const monClose: V3 = [MONITOR[0], MONITOR[1], MONITOR[2] + fitDistance(MONITOR_SCREEN.w, MONITOR_SCREEN.h, 0.97, aspect)];
  return [
    { p: 0, pos: [-2.2, 2.7, 6.8], look: [0, 1.15, 0] },
    { p: 0.045, pos: [-0.6, 1.6, 4.2], look: phoneLook },
    { p: 0.078, pos: phoneClose, look: phoneLook },
    { p: 0.172, pos: phoneClose, look: phoneLook },
    { p: 0.2, pos: [1.0, 2.2, 5.0], look: [1.6, 1.3, 0] },
    { p: 0.235, pos: [4.6, 1.5, 3.0], look: [ROUTER[0], 0.5, ROUTER[2]] },
    { p: 0.265, pos: [8.4, 2.8, 5.4], look: [9.6, 1.8, -1.3] },
    { p: 0.29, pos: [12.6, 2.6, 6.8], look: CORE },
    { p: 0.312, pos: panelsClose, look: PANELS },
    { p: 0.402, pos: panelsClose, look: PANELS },
    { p: 0.43, pos: [10.8, 3.6, 7.4], look: [3.0, 1.3, 0] },
    { p: 0.458, pos: phoneClose, look: phoneLook },
    { p: 0.556, pos: phoneClose, look: phoneLook },
    { p: 0.585, pos: [7.5, 6.2, 12], look: [13.5, 1.4, -0.9] },
    { p: 0.615, pos: [17.4, 2.8, 5.6], look: [19.6, 1.6, -0.9] },
    { p: 0.645, pos: [21.6, 2.6, 4.6], look: [20, 1.7, -0.9] },
    { p: 0.692, pos: monClose, look: MONITOR },
    { p: 0.866, pos: monClose, look: MONITOR },
    { p: 0.871, pos: phoneClose, look: phoneLook },
    { p: 0.906, pos: phoneClose, look: phoneLook },
    { p: 0.911, pos: monClose, look: MONITOR },
    { p: 0.948, pos: monClose, look: MONITOR },
    { p: 0.985, pos: [9, 7.6, 17], look: [10, 1.2, -1] },
    { p: 1, pos: [9, 8, 18], look: [10, 1.2, -1] },
  ];
}

function Rig({ p }: { p: number }) {
  const { camera, size } = useThree();
  const pRef = useRef(p);
  pRef.current = p;
  const kf = useMemo(() => keyframes(size.width / size.height), [size.width, size.height]);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const q = pRef.current;
    let i = kf.length - 2;
    for (let k = 0; k < kf.length - 1; k++) if (q <= kf[k + 1].p) { i = k; break; }
    const a = kf[i], b = kf[i + 1];
    const u = ease(seg(q, a.p, b.p));
    pos.set(lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], u), lerp(a.pos[2], b.pos[2], u));
    look.set(lerp(a.look[0], b.look[0], u), lerp(a.look[1], b.look[1], u), lerp(a.look[2], b.look[2], u));
    camera.position.copy(pos);
    camera.lookAt(look);
  });
  return null;
}

/* ───────────── objects ───────────── */

/** The glass of a screen; the real content is laid on top as HTML (see ScreenOverlay). `glow` lights the floor reflection. */
function Screen({ id, width, height, z, glow }: { id: string; width: number; height: number; z: number; glow: string }) {
  const c = useMemo(() => new THREE.Color(glow), [glow]);
  return (
    <>
      <mesh position={[0, 0, z - 0.001]}><planeGeometry args={[width, height]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
      <group position={[0, 0, z]}><ScreenAnchor id={id} width={width} height={height} /></group>
    </>
  );
}

const phoneLight = (p: number) => (p < 0.19 || (p >= 0.869 && p < 0.909) ? "#d9d6e6" : "#1a1733");
const monitorLight = (p: number) => (p < 0.655 ? "#1a1733" : "#c9c6d6");

function PhoneUI({ p }: { p: number }) {
  const m = minutesAt(p);
  if (p < 0.19) return <PhoneFrame bare time="21:14"><ApplyScreen t={local(p, "apply")} /></PhoneFrame>;
  if (p < 0.405) return <PhoneFrame bare dark time="21:15"><LockScreen time="21:15" day="Sonntag" note="Bewerbung gesendet" /></PhoneFrame>;
  const callT = seg(p, 0.44, 0.556);
  if (p < 0.565) return <PhoneFrame bare dark time={callTime(callT)}><CallScreen t={callT} /></PhoneFrame>;
  if (p < 0.869) return <PhoneFrame bare dark time={hhmm(m)}><LockScreen time={hhmm(m)} day={m < 1440 ? "Sonntag" : "Montag"} note="Vorabgespräch abgeschlossen" /></PhoneFrame>;
  if (p < 0.909) return <PhoneFrame bare time="12:15"><BookingScreen t={seg(p, 0.874, 0.904) * 0.62} /></PhoneFrame>;
  return <PhoneFrame bare dark time="12:16"><LockScreen time="12:16" day="Montag" note="Gespräch am Donnerstag, 09:00" /></PhoneFrame>;
}

function Phone({ p }: { p: number }) {
  return (
    <group position={PHONE} rotation={[-0.05, 0.12 * (1 - seg(p, 0.03, 0.078)), 0]}>
      <RoundedBox args={[PHONE_BODY.w, PHONE_BODY.h, PHONE_BODY.d]} radius={0.1} smoothness={8}>
        <meshPhysicalMaterial color="#1b1a24" metalness={0.9} roughness={0.25} clearcoat={1} clearcoatRoughness={0.12} />
      </RoundedBox>
      {[0.32, 0.1, -0.06].map((y, i) => (
        <RoundedBox key={i} args={[0.012, i ? 0.13 : 0.08, 0.03]} radius={0.005} position={[(i ? -1 : 1) * (PHONE_BODY.w / 2 + 0.004), y, 0]}>
          <meshStandardMaterial color="#2a2833" metalness={0.9} roughness={0.3} />
        </RoundedBox>
      ))}
      <Screen id="phone" width={PHONE_SCREEN.w} height={PHONE_SCREEN.h} z={PHONE_BODY.d / 2 + 0.002} glow={phoneLight(p)} />
      <pointLight position={[0, 0, 0.5]} color="#BDB2F7" intensity={1.2} distance={2.5} />
    </group>
  );
}

function Router({ near }: { near: number }) {
  return (
    <group position={ROUTER}>
      <RoundedBox args={[1.7, 0.3, 1.0]} radius={0.12} smoothness={6} position={[0, 0.18, 0]}>
        <meshPhysicalMaterial color="#ECEAF4" roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.3} />
      </RoundedBox>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.66, -0.36]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}>
          <capsuleGeometry args={[0.035, 0.7, 6, 14]} />
          <meshPhysicalMaterial color="#DDDAE8" roughness={0.4} clearcoat={0.4} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.42 + i * 0.16, 0.2, 0.505]}>
          <boxGeometry args={[0.07, 0.022, 0.01]} />
          <meshBasicMaterial color={new THREE.Color("#34D399").multiplyScalar(1.5 + 3 * near * ((i + 1) % 2))} toneMapped={false} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.9, -0.36]} rotation={[0, 0, Math.PI / 4]} scale={0.25 + i * 0.22}>
          <torusGeometry args={[1, 0.02, 8, 48, Math.PI / 2]} />
          <meshBasicMaterial color="#BDB2F7" transparent opacity={0.15 + 0.55 * near} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Network({ packetPos }: { packetPos: THREE.Vector3 | null }) {
  return (
    <group>
      {EDGES.map(([a, b], i) => <Line key={i} points={[a, b]} color="#5B4AD8" lineWidth={1} transparent opacity={0.32} />)}
      {NODES.map((n, i) => {
        const d = packetPos ? packetPos.distanceTo(new THREE.Vector3(...n)) : 99;
        const glow = Math.max(0, 1 - d / 1.6);
        return (
          <mesh key={i} position={n} scale={1 + glow * 0.8}>
            <sphereGeometry args={[0.055, 20, 20]} />
            <meshBasicMaterial color={new THREE.Color("#9A8AF0").multiplyScalar(1.2 + glow * 4)} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Neon "R" from the Recruit24 logo, built from tubes. */
function NeonR() {
  const geos = useMemo(() => {
    const s = 0.036, o = 16;
    const v = (x: number, y: number) => new THREE.Vector3((x - o) * s, -(y - o) * s, 0);
    const main = new THREE.CurvePath<THREE.Vector3>();
    main.add(new THREE.LineCurve3(v(10.5, 24), v(10.5, 8)));
    main.add(new THREE.LineCurve3(v(10.5, 8), v(16.25, 8)));
    const arc: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 24; arc.push(v(16.25 + 4.6 * Math.cos(a), 12.6 + 4.6 * Math.sin(a))); }
    main.add(new THREE.CatmullRomCurve3(arc));
    main.add(new THREE.LineCurve3(v(16.25, 17.2), v(10.5, 17.2)));
    const leg = new THREE.LineCurve3(v(15.5, 17.2), v(21.5, 24));
    return [new THREE.TubeGeometry(main, 220, 0.045, 14, false), new THREE.TubeGeometry(leg, 30, 0.045, 14, false)];
  }, []);
  const white = useMemo(() => new THREE.Color("#E4DEFF").multiplyScalar(2.6), []);
  return (
    <group>
      {geos.map((g, i) => <mesh key={i} geometry={g}><meshBasicMaterial color={white} toneMapped={false} /></mesh>)}
      <mesh position={[(24 - 16) * 0.036, -(8.5 - 16) * 0.036, 0]}><sphereGeometry args={[0.08, 24, 24]} /><meshBasicMaterial color={new THREE.Color("#FDBA74").multiplyScalar(3)} toneMapped={false} /></mesh>
    </group>
  );
}

function Core({ active }: { active: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.08; });
  return (
    <group position={CORE}>
      <group ref={ref}>
        <RoundedBox args={[1.9, 1.9, 1.9]} radius={0.2} smoothness={6}>
          <meshPhysicalMaterial color="#e2ddff" transmission={1} thickness={0.5} roughness={0.12} ior={1.15} clearcoat={1} clearcoatRoughness={0.1} attenuationColor="#9A8AF0" attenuationDistance={6} envMapIntensity={1.4} />
        </RoundedBox>
      </group>
      <mesh><sphereGeometry args={[0.75, 32, 32]} /><meshBasicMaterial color="#5B4AD8" transparent opacity={0.22} toneMapped={false} /></mesh>
      <NeonR />
      <pointLight color="#7A68E6" intensity={4 + active * 10} distance={7} />
      <Sparkles count={50} scale={[3.6, 3.2, 3.6]} size={2.4} speed={0.35} color="#BDB2F7" />
    </group>
  );
}

function MonitorUI({ p }: { p: number }) {
  if (p < 0.655)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-night text-white">
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-600 text-[48px] font-bold">R</span>
        <p className="mt-6 text-[28px] font-semibold">Recruit<span className="text-[#F59E5B]">24</span></p>
      </div>
    );
  if (p < 0.77) return <DashScreen t={seg(p, 0.69, 0.77)} tall={false} flat />;
  if (p < 0.87) return <ProfileScreen t={local(p, "profile")} tall={false} flat />;
  return (
    <AppWindow tall={false} active="calendar" flat>
      <div className="flex h-full items-start justify-center pt-2"><CalendarCard t={lerp(0.45, 1, seg(p, 0.912, 0.95))} bare /></div>
    </AppWindow>
  );
}

function Office({ p, dawn }: { p: number; dawn: number }) {
  const wood = "#3a2b24";
  const windowColor = useMemo(() => new THREE.Color(), []);
  windowColor.set("#1a1640").lerp(new THREE.Color("#F59E5B"), dawn).multiplyScalar(0.6 + dawn * 1.6);
  return (
    <group>
      {/* desk */}
      <RoundedBox args={[4.6, 0.08, 1.7]} radius={0.03} position={[20, 1.0, -0.45]}><meshStandardMaterial color={wood} roughness={0.55} /></RoundedBox>
      {[[-2.15, -1.2], [2.15, -1.2], [-2.15, 0.3], [2.15, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[20 + x, 0.48, z]}><boxGeometry args={[0.06, 0.96, 0.06]} /><meshStandardMaterial color="#1c1a22" metalness={0.6} roughness={0.4} /></mesh>
      ))}
      {/* monitor */}
      <group position={MONITOR}>
        <RoundedBox args={[MONITOR_SCREEN.w + 0.08, MONITOR_SCREEN.h + 0.08, 0.07]} radius={0.035} smoothness={6}>
          <meshPhysicalMaterial color="#18171f" metalness={0.8} roughness={0.3} clearcoat={0.8} />
        </RoundedBox>
        <Screen id="monitor" width={MONITOR_SCREEN.w} height={MONITOR_SCREEN.h} z={0.037} glow={monitorLight(p)} />
        <pointLight position={[0, 0, 1.2]} color="#ffffff" intensity={p > 0.655 ? 2.5 : 0.8} distance={4} />
      </group>
      <mesh position={[20, 1.1, -0.95]}><boxGeometry args={[0.14, 0.18, 0.06]} /><meshStandardMaterial color="#2a2833" metalness={0.8} roughness={0.3} /></mesh>
      <RoundedBox args={[0.8, 0.025, 0.38]} radius={0.01} position={[20, 1.055, -0.95]}><meshStandardMaterial color="#2a2833" metalness={0.8} roughness={0.3} /></RoundedBox>
      {/* keyboard, mug, plant */}
      <RoundedBox args={[1.35, 0.035, 0.42]} radius={0.015} position={[20, 1.06, -0.05]}><meshStandardMaterial color="#d8d6e2" roughness={0.5} /></RoundedBox>
      <mesh position={[21.6, 1.15, -0.1]}><cylinderGeometry args={[0.09, 0.085, 0.22, 32]} /><meshPhysicalMaterial color="#F6F5FA" roughness={0.2} clearcoat={1} /></mesh>
      <mesh position={[21.72, 1.16, -0.1]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.055, 0.015, 12, 24]} /><meshPhysicalMaterial color="#F6F5FA" roughness={0.2} /></mesh>
      <mesh position={[18.1, 1.16, -0.7]}><cylinderGeometry args={[0.16, 0.12, 0.26, 32]} /><meshStandardMaterial color="#E8E4F5" roughness={0.6} /></mesh>
      {[[0, 0.42, 0, 0.2], [-0.12, 0.55, 0.05, 0.16], [0.13, 0.52, -0.04, 0.15], [0, 0.66, 0, 0.13], [0.05, 0.36, 0.12, 0.13]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[18.1 + x, 1.0 + y, -0.7 + z]}><sphereGeometry args={[r, 24, 24]} /><meshStandardMaterial color="#2F9E74" roughness={0.7} /></mesh>
      ))}
      {/* window with sunrise */}
      <mesh position={[23.6, 2.6, -2.5]} rotation={[0, -0.55, 0]}><planeGeometry args={[2.6, 2.2]} /><meshBasicMaterial color={windowColor} toneMapped={false} /></mesh>
      {/* morning sun from the right; a directional light points at the world origin, so it crosses the office from that side */}
      <directionalLight position={[32, 6, 2]} color="#FDBA74" intensity={dawn * 2.4} />
    </group>
  );
}

/** A glowing data packet travelling along a curve. */
function Packet({ curve, f, color }: { curve: THREE.CatmullRomCurve3; f: number; color: string }) {
  const pt = curve.getPointAt(Math.min(0.999, Math.max(0.001, f)));
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(4), [color]);
  return (
    <Trail width={0.9} length={5} color={color} attenuation={(w) => w * w}>
      <mesh position={pt}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color={c} toneMapped={false} />
        <pointLight color={color} intensity={3} distance={2.5} />
      </mesh>
    </Trail>
  );
}

function Path({ curve, f, color }: { curve: THREE.CatmullRomCurve3; f: number; color: string }) {
  const base = useMemo(() => new THREE.TubeGeometry(curve, 400, 0.01, 8, false), [curve]);
  const lit = useMemo(() => new THREE.TubeGeometry(curve, 400, 0.016, 8, false), [curve]);
  lit.setDrawRange(0, Math.floor(400 * Math.max(0, Math.min(1, f))) * 8 * 6);
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(2.5), [color]);
  return (
    <>
      <mesh geometry={base}><meshBasicMaterial color="#3A3566" transparent opacity={0.6} /></mesh>
      {f > 0 && <mesh geometry={lit}><meshBasicMaterial color={c} toneMapped={false} /></mesh>}
    </>
  );
}

function Atmosphere({ dawn }: { dawn: number }) {
  const { scene } = useThree();
  const bg = useMemo(() => new THREE.Color(), []);
  useEffect(() => {
    bg.set("#07061A").lerp(new THREE.Color("#2B1E4A"), dawn);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg.getHex(), 12, 34);
  }, [dawn, bg, scene]);
  return null;
}

function World({ p }: { p: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); }, [p, invalidate]);
  const dawn = seg(p, 0.565, 0.64);
  const f1 = ease(seg(p, 0.19, 0.29));
  const fBack = ease(seg(p, 0.405, 0.445));
  const f2 = ease(seg(p, 0.565, 0.625));
  const p1 = f1 > 0 && f1 < 1 ? C1.getPointAt(f1) : null;
  const pBack = fBack > 0 && fBack < 1 ? C1.getPointAt(1 - fBack) : null;
  const routerNear = Math.max(p1 ? Math.max(0, 1 - p1.distanceTo(new THREE.Vector3(ROUTER[0], 0.6, ROUTER[2])) / 2.2) : 0, pBack ? Math.max(0, 1 - pBack.distanceTo(new THREE.Vector3(ROUTER[0], 0.6, ROUTER[2])) / 2.2) : 0);
  const panelsOn = panels(p);
  return (
    <>
      <Rig p={p} />
      <Atmosphere dawn={dawn} />
      <ambientLight intensity={0.18} />
      <spotLight position={[-3, 5, 3]} angle={0.55} penumbra={1} intensity={40 * (1 - dawn)} color="#FDBA74" distance={14} />
      <directionalLight position={[6, 9, 7]} intensity={0.7} color="#c9c1ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.4} position={[-6, 2, 4]} rotation-y={Math.PI / 2.5} scale={[6, 2, 1]} color="#BDB2F7" />
        <Lightformer form="rect" intensity={1.2} position={[8, 2, 4]} rotation-y={-Math.PI / 2.5} scale={[6, 2, 1]} color="#FDBA74" />
        <Lightformer form="ring" intensity={1.5} position={[0, 3, -6]} scale={3} color="#7A68E6" />
      </Environment>
      {dawn < 0.7 && <Stars radius={70} depth={40} count={1800} factor={3.2} saturation={0} fade speed={0.4} />}

      <mesh rotation-x={-Math.PI / 2} position={[10, 0, 0]}>
        <planeGeometry args={[220, 160]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={384} mixBlur={1} mixStrength={14} roughness={1} depthScale={1.1} minDepthThreshold={0.35} maxDepthThreshold={1.3} color="#06051a" metalness={0.35} mirror={0.35} envMapIntensity={0.15} />
      </mesh>

      <Phone p={p} />
      <Router near={routerNear} />
      <Network packetPos={p1 ?? pBack} />
      <Core active={panelsOn} />
      <Office p={p} dawn={dawn} />

      <Path curve={C1} f={Math.max(f1, p > 0.29 ? 1 : 0)} color="#9A8AF0" />
      <Path curve={C2} f={f2} color="#FDBA74" />
      {p1 && <Packet curve={C1} f={f1} color="#BDB2F7" />}
      {pBack && <Packet curve={C1} f={1 - fBack} color="#FDBA74" />}
      {f2 > 0 && f2 < 1 && <Packet curve={C2} f={f2} color="#FDBA74" />}

      <group position={PANELS}><ScreenAnchor id="panels" width={PANELS_SIZE.w} height={PANELS_SIZE.h} /></group>

      <EffectComposer multisampling={2}>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.9} luminanceSmoothing={0.15} />
        <Vignette eskil={false} offset={0.22} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

/** How visible the CV check panels in front of Recruit24 are. */
const panels = (p: number) => Math.min(seg(p, 0.296, 0.31), 1 - seg(p, 0.402, 0.412));

/** Dark dips that hide the two hard cuts between the office monitor and Max's phone. */
const dip = (p: number) => Math.max(...[[0.862, 0.869, 0.878], [0.902, 0.9085, 0.917]].map(([a, m, b]) => (p < m ? seg(p, a, m) : 1 - seg(p, m, b))));

export default function Film3D({ p }: { p: number; W: number; H: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [test, setTest] = useState(false);
  const [dpr, setDpr] = useState(1.5);
  useEffect(() => { setTest(new URLSearchParams(window.location.search).get("film") === "test"); }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className="absolute inset-0">
      <Canvas
        frameloop={!active ? "never" : test ? "demand" : "always"}
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: FOV, near: 0.05, far: 200, position: [-2.2, 2.7, 6.8] }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <World p={p} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <ScreenOverlay id="phone" w={380} h={780} className="rounded-[52px]"><PhoneUI p={p} /></ScreenOverlay>
        <ScreenOverlay id="monitor" w={1200} h={740}><MonitorUI p={p} /></ScreenOverlay>
        {panels(p) > 0.01 && <ScreenOverlay id="panels" w={1120} h={680} opacity={panels(p)}><CheckPanels t={seg(p, 0.312, 0.4)} tall={false} /></ScreenOverlay>}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-night" style={{ opacity: dip(p) }} />
    </div>
  );
}
