"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function makeGlyphTexture(glyph: string) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 54, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20, 11, 42, 0.9)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f5c242";
    ctx.stroke();
    ctx.font = "bold 62px 'Segoe UI Symbol', 'Noto Sans Symbols', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f9dc8c";
    ctx.fillText(glyph, size / 2, size / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function Wheel() {
  const spin = useRef<THREE.Group>(null);
  const textures = useMemo(() => GLYPHS.map(makeGlyphTexture), []);

  useFrame((state) => {
    if (!spin.current) return;
    const scroll = typeof window !== "undefined" ? window.scrollY : 0;
    spin.current.rotation.z = -(state.clock.elapsedTime * 0.12 + scroll * 0.0025);
  });

  const R = 2.55;
  return (
    <group rotation={[0.5, 0, 0]}>
      <group ref={spin}>
        {/* outer golden ring */}
        <mesh>
          <torusGeometry args={[R + 0.3, 0.035, 16, 160]} />
          <meshStandardMaterial color="#f5c242" emissive="#d4a12a" emissiveIntensity={0.7} metalness={0.9} roughness={0.25} />
        </mesh>
        {/* inner violet ring */}
        <mesh>
          <torusGeometry args={[R - 0.4, 0.015, 12, 160]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.7} />
        </mesh>
        {/* 12 ticks */}
        {GLYPHS.map((_, i) => {
          const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
          return (
            <mesh key={`tick-${i}`} position={[Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05), 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.55, 0.02, 0.02]} />
              <meshBasicMaterial color="#f5c242" transparent opacity={0.8} />
            </mesh>
          );
        })}
        {/* 12 glyph sprites */}
        {textures.map((tex, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <sprite key={`glyph-${i}`} position={[Math.cos(a) * R, Math.sin(a) * R, 0.02]} scale={[0.62, 0.62, 1]}>
              <spriteMaterial map={tex} transparent depthWrite={false} />
            </sprite>
          );
        })}
      </group>
    </group>
  );
}

function Orbiters() {
  const ref = useRef<THREE.Group>(null);
  const ref2 = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.45;
    if (ref2.current) ref2.current.rotation.y = -s.clock.elapsedTime * 0.3;
  });
  return (
    <>
      <group ref={ref} rotation={[0.4, 0, 0.2]}>
        <mesh position={[1.55, 0, 0]}>
          <sphereGeometry args={[0.11, 24, 24]} />
          <meshStandardMaterial color="#f5c242" emissive="#f5c242" emissiveIntensity={1.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.55, 0.005, 8, 120]} />
          <meshBasicMaterial color="#f5c242" transparent opacity={0.35} />
        </mesh>
      </group>
      <group ref={ref2} rotation={[-0.6, 0, -0.3]}>
        <mesh position={[1.95, 0, 0]}>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={1.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.95, 0.004, 8, 120]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.3} />
        </mesh>
      </group>
    </>
  );
}

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.15;
      ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.2) * 0.2;
    }
  });
  return (
    <>
      <mesh>
        <sphereGeometry args={[0.72, 48, 48]} />
        <meshStandardMaterial color="#2a1560" emissive="#6d28d9" emissiveIntensity={0.9} roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.12, 1]} />
        <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.28} />
      </mesh>
    </>
  );
}

export default function ZodiacScene() {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.6, 7.6], fov: 42 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent" }}>
      <ambientLight intensity={0.55} />
      <pointLight position={[5, 5, 5]} intensity={60} color="#f5c242" />
      <pointLight position={[-5, -3, 4]} intensity={45} color="#a855f7" />
      <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.7}>
        <Core />
        <Orbiters />
        <Wheel />
      </Float>
      <Stars radius={40} depth={30} count={1400} factor={3} saturation={0} fade speed={0.6} />
      <Sparkles count={70} scale={7} size={2.2} color="#f5c242" speed={0.25} opacity={0.6} />
    </Canvas>
  );
}
