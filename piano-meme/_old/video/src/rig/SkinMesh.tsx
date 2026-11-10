import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import type { V, Xf } from "./math";

export type PieceRect = { file: string; x: number; y: number; w: number; h: number };

const textureCache = new WeakMap<HTMLImageElement, THREE.Texture>();
const textureOf = (img: HTMLImageElement) => {
  let t = textureCache.get(img);
  if (!t) {
    t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 4;
    t.needsUpdate = true;
    textureCache.set(img, t);
  }
  return t;
};

/**
 * One piece of a character on a deformable grid ("mesh warp").
 * `deform` says where every point of the rest drawing is on stage in this frame:
 * bones (rotation around joints) and soft bends are both expressed through it,
 * so the picture bends instead of breaking at the joints.
 *
 * `extend` grows the grid beyond the picture (in rest pixels); the edge pixels are
 * stretched there. Used for parts that continue under another piece.
 */
export const SkinMesh: React.FC<{
  img: HTMLImageElement;
  rect: PieceRect;
  /** the grid may cover only part of the texture (used by small face overlays) */
  texRect?: PieceRect;
  deform: Xf;
  cell?: number;
  order?: number;
  opacity?: number;
  extend?: { top?: number; bottom?: number; left?: number; right?: number };
}> = ({ img, rect, texRect, deform, cell = 14, order = 0, opacity = 1, extend }) => {
  const tr = texRect ?? rect;
  const ex = { top: 0, bottom: 0, left: 0, right: 0, ...extend };
  const x0 = rect.x - ex.left;
  const y0 = rect.y - ex.top;
  const w = rect.w + ex.left + ex.right;
  const h = rect.h + ex.top + ex.bottom;
  const cols = Math.max(1, Math.round(w / cell));
  const rows = Math.max(1, Math.round(h / cell));

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = (cols + 1) * (rows + 1);
    const uv = new Float32Array(n * 2);
    const rest = new Float32Array(n * 2);
    let k = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const px = x0 + (w * i) / cols;
        const py = y0 + (h * j) / rows;
        rest[k * 2] = px;
        rest[k * 2 + 1] = py;
        uv[k * 2] = (px - tr.x) / tr.w;
        uv[k * 2 + 1] = 1 - (py - tr.y) / tr.h;
        k++;
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = j * (cols + 1) + i;
        const b = a + 1;
        const c = a + cols + 1;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.userData.rest = rest;
    return g;
  }, [cols, rows, x0, y0, w, h, tr.x, tr.y, tr.w, tr.h]);

  // Recompute vertex positions for this frame (pure function of `deform`).
  useMemo(() => {
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const rest = geometry.userData.rest as Float32Array;
    const arr = pos.array as Float32Array;
    const p: V = [0, 0];
    for (let k = 0; k < rest.length / 2; k++) {
      p[0] = rest[k * 2];
      p[1] = rest[k * 2 + 1];
      const q = deform(p);
      arr[k * 3] = q[0];
      arr[k * 3 + 1] = q[1];
      arr[k * 3 + 2] = 0;
    }
    pos.needsUpdate = true;
    geometry.computeBoundingSphere();
  }, [geometry, deform]);

  const tex = textureOf(img);
  return (
    <mesh geometry={geometry} renderOrder={order} frustumCulled={false}>
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/** A transparent WebGL layer whose units are stage pixels (0,0 = top-left, y down). */
export const Stage3D: React.FC<{ width: number; height: number; children: React.ReactNode }> = ({
  width,
  height,
  children,
}) => {
  const camera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(0, width, 0, height, -1000, 1000);
    cam.position.set(0, 0, 10);
    cam.updateProjectionMatrix();
    (cam as unknown as { manual: boolean }).manual = true;
    return cam;
  }, [width, height]);
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={camera}
      flat
      gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      {children}
    </ThreeCanvas>
  );
};
