"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Real HTML on 3D screens: inside the canvas an anchor projects the four corners of a screen
 * every frame; outside the canvas an overlay element is warped onto exactly those corners
 * with a CSS matrix3d. Text stays sharp and the content is ordinary React.
 */

type Quad = [number, number][] | null;
const quads = new Map<string, Quad>();
const listeners = new Map<string, Set<(q: Quad) => void>>();

function publish(id: string, q: Quad) {
  quads.set(id, q);
  listeners.get(id)?.forEach((fn) => fn(q));
}

export function ScreenAnchor({ id, width, height, z = 0 }: { id: string; width: number; height: number; z?: number }) {
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const corners = useMemo(() => [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => new THREE.Vector3((x * width) / 2, (y * height) / 2, z)), [width, height, z]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.updateWorldMatrix(true, false);
    const out: [number, number][] = [];
    for (const c of corners) {
      v.copy(c).applyMatrix4(g.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      if (v.z > -0.02) return publish(id, null); // behind the camera
      v.applyMatrix4(camera.projectionMatrix);
      out.push([((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height]);
    }
    publish(id, out);
  });
  useEffect(() => () => publish(id, null), [id]);
  return <group ref={group} />;
}

/* homography from the element's rectangle to the projected quad */
type M3 = number[];
const adj = (m: M3): M3 => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mul = (a: M3, b: M3): M3 => {
  const c: M3 = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
  return c;
};
const mulv = (m: M3, v: number[]) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const basis = (p: [number, number][]) => {
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const s = mulv(adj(m), [p[3][0], p[3][1], 1]);
  return mul(m, [s[0], 0, 0, 0, s[1], 0, 0, 0, s[2]]);
};
function matrix3d(w: number, h: number, q: [number, number][]) {
  const t = mul(basis(q), adj(basis([[0, 0], [w, 0], [w, h], [0, h]])));
  const n = t.map((x) => x / t[8]);
  return `matrix3d(${n[0]},${n[3]},0,${n[6]},${n[1]},${n[4]},0,${n[7]},0,0,1,0,${n[2]},${n[5]},0,${n[8]})`;
}

export function ScreenOverlay({ id, w, h, children, opacity = 1, className }: { id: string; w: number; h: number; children: ReactNode; opacity?: number; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const apply = (q: Quad) => {
      const e = el.current;
      if (!e) return;
      const off = !q || q.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y));
      e.style.visibility = off ? "hidden" : "visible";
      if (!off) e.style.transform = matrix3d(w, h, q!);
    };
    const set = listeners.get(id) ?? new Set();
    set.add(apply);
    listeners.set(id, set);
    apply(quads.get(id) ?? null);
    return () => { set.delete(apply); };
  }, [id, w, h]);
  return (
    <div
      ref={el}
      className={className}
      style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", visibility: "hidden", opacity, pointerEvents: "none", overflow: "hidden" }}
    >
      {children}
    </div>
  );
}
