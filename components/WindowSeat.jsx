'use client';
import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_dayState; // 1.0 = Day, 0.0 = Night
  
  // Hash & Noise
  float hash(vec2 p) {
      p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.11));
      return -1.0 + 2.0 * fract(p.x * p.y * (p.x + p.y));
  }
  
  float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                 mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }
  
  // Fractional Brownian Motion for cloud texture
  float fbm(vec2 p) {
      float f = 0.0;
      float amp = 0.55;
      for(int i = 0; i < 6; i++) {
          f += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
      }
      return f;
  }
  
  // Domain Warping for procedural volumetric feel
  float warp(vec2 p, out vec2 q, out vec2 r) {
      q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
      r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
      return fbm(p + 4.0 * r);
  }

  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = (uv - 0.5) * 2.0;
      p.x *= u_resolution.x / u_resolution.y;
      
      float t = u_time * 0.015; // Slow, constant forward drift (Cinematic)
      
      // ── EXTERIOR SKY ──
      // Day: Deep Cobalt Blue
      vec3 skyDay = mix(vec3(0.05, 0.25, 0.6), vec3(0.01, 0.1, 0.35), uv.y);
      // Night: Deep Ink-Black
      vec3 skyNight = mix(vec3(0.01, 0.01, 0.02), vec3(0.0, 0.0, 0.0), uv.y);
      vec3 sky = mix(skyNight, skyDay, u_dayState);
      
      // ── CITY LIGHTS (Giza Sprawl at Night) ──
      float cityDensity = fbm(p * 5.0 - vec2(0.0, t * 0.1));
      float cityGrid = smoothstep(0.5, 1.0, noise(p * 200.0)) * smoothstep(0.3, 0.7, cityDensity);
      // Fade out city towards horizon
      cityGrid *= smoothstep(0.2, -0.6, p.y); 
      vec3 cityGlow = vec3(1.0, 0.65, 0.2) * cityGrid * (1.0 - u_dayState) * 2.0;
      
      // ── VOLUMETRIC CUMULUS CLOUDS ──
      vec2 cloudPos = p * 1.2 - vec2(t * 1.5, t * 0.4);
      vec2 q, r;
      float n = warp(cloudPos, q, r);
      
      // Cloud shaping (flatter bottoms, billowy tops)
      float shape = smoothstep(-0.8, -0.1, p.y) * smoothstep(1.0, 0.2, p.y);
      n *= shape * 1.2;
      
      // Cloud mask for density
      float cloudMask = smoothstep(0.15, 0.65, n);
      
      // Directional Lighting (Sun angle high and right during day)
      vec2 lightDir = normalize(vec2(0.6, 0.8));
      float nLight = warp(cloudPos + lightDir * 0.08, q, r) * shape * 1.2;
      float shadow = smoothstep(0.0, 0.4, n - nLight); // Self-shadowing
      
      // Day Cloud Lighting: Crisp detail, deep shadows
      vec3 cDayLight = vec3(1.0, 1.0, 1.0);
      vec3 cDayShadow = vec3(0.3, 0.4, 0.55);
      vec3 cDay = mix(cDayLight, cDayShadow, shadow);
      
      // Night Cloud Lighting: Dark masses
      vec3 cNightDark = vec3(0.02, 0.02, 0.03);
      vec3 cNightShadow = vec3(0.0, 0.0, 0.0);
      vec3 cNight = mix(cNightDark, cNightShadow, shadow);
      
      // City light reflection catching cloud edges at night
      float cityGlowMask = smoothstep(0.3, 0.8, -lightDir.y * shadow) * smoothstep(-0.1, 0.4, -p.y);
      cNight += vec3(1.0, 0.5, 0.1) * 0.25 * cityGlowMask * (1.0 - u_dayState);
      
      vec3 clouds = mix(cNight, cDay, u_dayState);
      
      // ── WING NAVIGATION LIGHT (Red Strobe) ──
      // Visible at night. Flashes sharply.
      float strobe = pow(sin(u_time * 3.0), 100.0) * (1.0 - u_dayState);
      clouds += vec3(1.0, 0.0, 0.0) * strobe * 0.6 * cloudMask;
      
      // ── FINAL BLEND ──
      // Atmospheric perspective
      float distFade = smoothstep(0.0, 0.8, uv.y + 0.3);
      vec3 color = mix(sky + cityGlow, clouds, cloudMask * distFade);
      
      // Subtle Grain (Macro-photography detail)
      float grain = hash(p * u_time) * 0.025;
      color += grain;
      
      gl_FragColor = vec4(color, 1.0);
  }
`;

function initWebGL(canvas) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return null;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const positionLocation = gl.getAttribLocation(program, 'position');
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0
  ]), gl.STATIC_DRAW);

  return { gl, program, positionLocation, buffer };
}

export default function WindowSeat({ onClose }) {
  const canvasRef = useRef(null);
  const [glReady, setGlReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const webglParams = initWebGL(canvas);
    if (!webglParams) return;
    
    setGlReady(true);
    const { gl, program, positionLocation, buffer } = webglParams;

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uDayState = gl.getUniformLocation(program, 'u_dayState');

    let animationFrameId;
    const startTime = performance.now();

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - startTime) / 1000);

      // System Time Synchronization (Seamless Cross-fade)
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hour * 60 + minutes;
      
      const sunrise = 6 * 60;   // 6:00 AM
      const sunset = 18 * 60;   // 6:00 PM
      const transitionDuration = 120; // 120 mins for full fade
      
      let dayState = 0.0;
      
      if (totalMinutes >= sunrise && totalMinutes < sunset) {
        // Daytime transition logic
        if (totalMinutes < sunrise + transitionDuration) {
          dayState = (totalMinutes - sunrise) / transitionDuration; // Fading in day
        } else if (totalMinutes > sunset - transitionDuration) {
          dayState = (sunset - totalMinutes) / transitionDuration; // Fading out day
        } else {
          dayState = 1.0; // Full day
        }
      }

      gl.uniform1f(uDayState, dayState);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[9999999] flex items-center justify-center select-none"
      style={{ backgroundColor: '#000000' }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-10 right-8 z-[9999999] w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 pointer-events-auto border border-white/5"
      >
        <X size={24} className="text-white/40" />
      </button>

      {/* The precise oval window geometry and internal bezel structure */}
      <div 
        style={{
          width: '420px',
          height: '660px',
          borderRadius: '210px',
          background: '#0a0a0a',
          // Specific directional shadow casting on the right bezel (as per image_0.png)
          boxShadow: `
            inset -45px 0 60px rgba(0, 0, 0, 1),      /* Deep right shadow */
            inset 15px 0 40px rgba(255, 255, 255, 0.03), /* Faint left rim light */
            inset 0 45px 60px rgba(0, 0, 0, 0.95),    /* Top occlusion */
            inset 0 -45px 60px rgba(0, 0, 0, 0.95),   /* Bottom occlusion */
            0 0 80px rgba(0, 0, 0, 1)                 /* Total darkness blend */
          `,
          padding: '50px',
          position: 'relative'
        }}
      >
        {/* The Glass and Procedural Environment */}
        <div 
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '160px',
            overflow: 'hidden',
            position: 'relative',
            background: '#020205', // Base dark for pre-load
            boxShadow: `
              inset 0 0 50px rgba(0, 0, 0, 1), /* Glass edge shadow */
              inset 8px 8px 20px rgba(255, 255, 255, 0.04) /* Glass macro reflection */
            `
          }}
        >
          <canvas 
            ref={canvasRef} 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'block',
              opacity: glReady ? 1 : 0,
              transition: 'opacity 1s ease-in'
            }} 
          />
          
          {/* Faint, cool cabin LED reflections on internal window glass (Night) */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 70% 30%, rgba(200, 220, 255, 0.02) 0%, transparent 60%)',
              mixBlendMode: 'screen'
            }}
          />
        </div>
      </div>
    </div>
  );
}
