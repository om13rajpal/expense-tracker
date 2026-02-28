"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

// Inline GLSL simplex 3D noise for vertex morphing
const simplexNoise3D = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

const vertexShader = `
${simplexNoise3D}

attribute vec3 targetPosition;
attribute float particleAlpha;

uniform float uTime;
uniform float uMorph;      // 0 = scattered, 1 = dollar formation
uniform float uNoiseScale;
uniform float uNoiseStrength;

varying float vAlpha;
varying float vDisplacement;

void main() {
  // Blend between scattered position and $ target
  vec3 pos = mix(position, targetPosition, uMorph);

  // Add organic noise displacement when scattered
  float noiseAmount = (1.0 - uMorph) * uNoiseStrength;
  float displacement = snoise(pos * uNoiseScale + uTime * 0.3) * noiseAmount;
  pos += normalize(position) * displacement;
  vDisplacement = displacement;

  // Gentle breathing even when formed
  pos += normalize(targetPosition) * sin(uTime * 2.0 + length(targetPosition) * 3.0) * 0.02 * uMorph;

  vAlpha = particleAlpha;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = mix(2.0, 3.0, uMorph);
}
`

const fragmentShader = `
uniform vec3 uColor;
uniform vec3 uScatteredColor;
uniform float uMorph;
varying float vAlpha;
varying float vDisplacement;

void main() {
  float alpha = mix(vAlpha * 0.85, vAlpha * 0.95, uMorph);
  alpha = clamp(alpha, 0.3, 0.95);
  vec3 color = mix(uScatteredColor, uColor, uMorph);
  gl_FragColor = vec4(color, alpha);
}
`

// Sample $ sign from offscreen canvas → target positions
function sampleDollarSign(
  width: number,
  height: number,
  cx: number,
  cy: number,
  fontSize: number,
  step: number
): { x: number; y: number }[] {
  const off = document.createElement("canvas")
  off.width = width
  off.height = height
  const oc = off.getContext("2d")
  if (!oc) return []
  oc.fillStyle = "white"
  oc.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
  oc.textAlign = "center"
  oc.textBaseline = "middle"
  oc.fillText("$", cx, cy)

  const pts: { x: number; y: number }[] = []
  const img = oc.getImageData(0, 0, width, height).data
  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      if (img[(py * width + px) * 4 + 3] > 80) {
        pts.push({ x: px, y: py })
      }
    }
  }
  return pts
}

export function MorphingParticleBlobs() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let rect = container.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
    })
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.pointerEvents = "auto"

    // Scene + Camera (orthographic for 2D $ mapping)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(0, w, 0, h, -100, 100)

    // Sample two $ signs — left and right of mascot
    const fontSize = Math.min(w * 0.15, h * 0.4)
    const centerY = h * 0.38
    const step = 14 // larger step = fewer particles = thinner look

    const leftTargets = sampleDollarSign(w, h, w * 0.25, centerY, fontSize, step)
    const rightTargets = sampleDollarSign(w, h, w * 0.75, centerY, fontSize, step)
    const dollarTargets = [...leftTargets, ...rightTargets]
    const TOTAL = Math.max(300, dollarTargets.length + 80)

    // Build geometry
    const scattered = new Float32Array(TOTAL * 3)
    const targets = new Float32Array(TOTAL * 3)
    const alphas = new Float32Array(TOTAL)

    // Scatter uniformly across canvas
    for (let i = 0; i < TOTAL; i++) {
      scattered[i * 3] = Math.random() * w
      scattered[i * 3 + 1] = Math.random() * h
      scattered[i * 3 + 2] = 0

      alphas[i] = 0.2 + Math.random() * 0.6
    }

    // Assign targets
    for (let i = 0; i < TOTAL; i++) {
      if (i < dollarTargets.length) {
        targets[i * 3] = dollarTargets[i].x + (Math.random() * 2 - 1)
        targets[i * 3 + 1] = dollarTargets[i].y + (Math.random() * 2 - 1)
        targets[i * 3 + 2] = 0
      } else {
        targets[i * 3] = scattered[i * 3]
        targets[i * 3 + 1] = scattered[i * 3 + 1]
        targets[i * 3 + 2] = 0
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(scattered, 3))
    geometry.setAttribute("targetPosition", new THREE.BufferAttribute(targets, 3))
    geometry.setAttribute("particleAlpha", new THREE.BufferAttribute(alphas, 1))

    const uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uColor: { value: new THREE.Color("#a3e635") },
      uScatteredColor: { value: new THREE.Color("#d1d5db") },
      uNoiseScale: { value: 0.004 },
      uNoiseStrength: { value: 30 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // Hover detection
    let hovering = false
    let morphTarget = 0
    const triggerRadius = Math.min(w, h) * 0.28

    const onMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const dist = Math.hypot(mx - w / 2, my - h / 2)

      if (dist < triggerRadius && !hovering) {
        hovering = true
        morphTarget = 1
      } else if (dist > triggerRadius * 1.3 && hovering) {
        hovering = false
        morphTarget = 0
      }
    }

    const onLeave = () => {
      hovering = false
      morphTarget = 0
    }

    renderer.domElement.addEventListener("mousemove", onMove)
    renderer.domElement.addEventListener("mouseleave", onLeave)

    // Animation
    let raf: number
    const clock = new THREE.Clock()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      uniforms.uTime.value = elapsed

      // Smooth morph interpolation
      const current = uniforms.uMorph.value
      uniforms.uMorph.value += (morphTarget - current) * 0.03

      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      renderer.setSize(width, height)
      camera.right = width
      camera.bottom = height
      camera.updateProjectionMatrix()
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.domElement.removeEventListener("mousemove", onMove)
      renderer.domElement.removeEventListener("mouseleave", onLeave)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  )
}
