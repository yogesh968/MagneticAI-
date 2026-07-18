"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A real WebGL 3D orb — a noise-displaced icosahedron "AI core" with a fresnel
 * rim-glow, a slowly counter-rotating wireframe shell, and a particle halo. It
 * breathes, rotates, and leans toward the pointer. Honours prefers-reduced-
 * motion by rendering a single settled frame. Everything is disposed on unmount.
 */
type Variant = "core" | "wire" | "swarm";

// Three distinct "models" off the same rig: a solid displaced core, a wireframe
// globe, and a particle swarm. Same restrained palette across all three.
const VARIANTS: Record<Variant, { meshScale: number; wireOpacity: number; wireDetail: number; wireScale: number; pCount: number; pSize: number; pOpacity: number; spin: number }> = {
  core:  { meshScale: 1.0,  wireOpacity: 0.09, wireDetail: 2, wireScale: 1.34, pCount: 90,  pSize: 0.028, pOpacity: 0.40, spin: 0.24 },
  wire:  { meshScale: 0.78, wireOpacity: 0.34, wireDetail: 4, wireScale: 1.26, pCount: 70,  pSize: 0.030, pOpacity: 0.55, spin: 0.30 },
  swarm: { meshScale: 0.52, wireOpacity: 0.05, wireDetail: 2, wireScale: 1.55, pCount: 320, pSize: 0.030, pOpacity: 0.75, spin: 0.42 },
};

export function OrbBot3D({ size = 260, variant = "core", className = "" }: { size?: number; variant?: Variant; className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const V = VARIANTS[variant] ?? VARIANTS.core;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(size, size);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uColorA: { value: new THREE.Color("#4453D6") }, // accent mid-tone
      uColorB: { value: new THREE.Color("#191B33") }, // graphite core
      uColorC: { value: new THREE.Color("#9AA2EC") }, // soft indigo rim
    };

    const vertexShader = /* glsl */ `
      uniform float uTime; uniform float uHover;
      varying vec3 vNormal; varying vec3 vView; varying float vDisp;

      // Ashima simplex noise 3D
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
      float snoise(vec3 v){
        const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
        vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+1.0*C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
        i=mod(i,289.0);
        vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
        float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.0*floor(p*ns.z*ns.z);
        vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
        vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
        vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
        return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
      }

      void main(){
        float n1 = snoise(position*1.4 + uTime*0.35);
        float n2 = snoise(position*2.9 - uTime*0.22)*0.5;
        float disp = (n1 + n2) * 0.16 * (1.0 + uHover*0.7);
        vDisp = disp;
        vec3 p = position + normal * disp;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
      varying vec3 vNormal; varying vec3 vView; varying float vDisp;
      void main(){
        float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.1);
        vec3 base = mix(uColorB, uColorA, smoothstep(-0.24, 0.30, vDisp));
        vec3 col = mix(base, uColorC, fres*0.7);
        col += uColorA * fres * 0.22;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const geo = new THREE.IcosahedronGeometry(1, 24);
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(V.meshScale);
    scene.add(mesh);

    const wireGeo = new THREE.IcosahedronGeometry(V.wireScale, V.wireDetail);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x6b76ff, wireframe: true, transparent: true, opacity: V.wireOpacity });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wire);

    const pCount = V.pCount;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = (variant === "swarm" ? 0.9 : 1.55) + Math.random() * (variant === "swarm" ? 0.7 : 0.75);
      const t = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x8b93ff, size: V.pSize, transparent: true, opacity: V.pOpacity, depthWrite: false });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      uniforms.uHover.value = 1;
    };
    const onLeave = () => { tx = 0; ty = 0; uniforms.uHover.value = 0; };
    mount.addEventListener("pointermove", onMove);
    mount.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      mesh.rotation.y = t * V.spin + mx * 0.6;
      mesh.rotation.x = my * 0.4;
      wire.rotation.y = -t * 0.12; wire.rotation.x = t * 0.08;
      points.rotation.y = t * (variant === "swarm" ? 0.16 : 0.05);
      points.rotation.x = t * (variant === "swarm" ? 0.08 : 0.0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };

    if (reduced) {
      uniforms.uTime.value = 1.2;
      renderer.render(scene, camera);
    } else {
      render();
    }

    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerleave", onLeave);
      renderer.dispose();
      geo.dispose(); mat.dispose();
      wireGeo.dispose(); wireMat.dispose();
      pGeo.dispose(); pMat.dispose();
      renderer.domElement.remove();
    };
  }, [size, variant]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full blur-3xl"
        style={{
          width: size * 0.85, height: size * 0.85,
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(68,83,214,.15), transparent 70%)",
        }}
      />
      <div ref={mountRef} className="relative h-full w-full" />
    </div>
  );
}
