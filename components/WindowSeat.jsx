'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Sun, Moon, Clock, Sliders } from 'lucide-react';

// Vertex shader (simple pass-through)
const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Volumetric raymarching fragment shader
const fragmentShaderSource = `
  precision highp float;
  varying vec2 v_texCoord;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_seatSide; // 0.0 = Left (5A), 1.0 = Right (5F)
  uniform float u_nightMode; // 0.0 = Day, 1.0 = Night, smooth in-between

  uniform vec3 u_skyColorTop;
  uniform vec3 u_skyColorBottom;
  uniform vec3 u_sunColor;
  uniform vec3 u_sunDir;
  uniform vec3 u_cloudBase;
  uniform vec3 u_cloudLight;

  // Stable 3D Hash without sine
  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.xyz, p.yzx + 19.19);
    return fract(p.x * p.y * p.z);
  }

  // 3D Noise function
  float noise(in vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
      mix(mix(hash(p + vec3(0.0, 0.0, 0.0)), hash(p + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash(p + vec3(0.0, 1.0, 0.0)), hash(p + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash(p + vec3(0.0, 0.0, 1.0)), hash(p + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash(p + vec3(0.0, 1.0, 1.0)), hash(p + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z
    );
  }

  // Fractional Brownian Motion (fBm) - 4 octaves for high detail / performance
  float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p = p * 2.02;
    f += 0.2500 * noise(p); p = p * 2.03;
    f += 0.1250 * noise(p); p = p * 2.01;
    f += 0.0625 * noise(p);
    return f;
  }

  void main() {
    // Correct aspect ratio
    vec2 p = -1.0 + 2.0 * gl_FragCoord.xy / u_resolution.xy;
    p.x *= u_resolution.x / u_resolution.y;

    // Camera setup - looking slightly down and backward
    float side = u_seatSide > 0.5 ? 1.0 : -1.0;
    
    // Slow camera translation forward
    vec3 ro = vec3(0.0, 1.5, -u_time * 0.05);
    // Target is slightly to the side (based on window) and backward
    vec3 ta = vec3(side * 1.6, 0.45, -u_time * 0.05 - 2.0);
    
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(0.0, 1.0, 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    vec3 rd = normalize(p.x * cu + p.y * cv + 2.2 * cw);

    // Sky Background
    float skyT = clamp(rd.y * 1.5 + 0.3, 0.0, 1.0);
    vec3 skyColor = mix(u_skyColorBottom, u_skyColorTop, skyT);

    // Add soft horizontal haze glow for photorealism
    float horizonHaze = exp(-max(0.0, rd.y) * 8.0);
    vec3 hazeColor = mix(vec3(0.95, 0.88, 0.82), vec3(0.12, 0.14, 0.22), u_nightMode);
    skyColor = mix(skyColor, hazeColor, horizonHaze * 0.35);

    // Sun/Moon glow
    float sunGlow = max(0.0, dot(rd, u_sunDir));
    vec3 finalSky = skyColor + u_sunColor * pow(sunGlow, 8.0) * 0.25 + u_sunColor * pow(sunGlow, 64.0) * 0.45;

    // Add starfield and soft Milky Way nebula band at night
    if (u_nightMode > 0.02 && rd.y > 0.0) {
      // Render soft galaxy nebula band using noise
      float nebula = noise(rd * 3.5 + vec3(5.0, 12.0, 2.0)) * 0.16 * u_nightMode;
      finalSky += vec3(0.12, 0.08, 0.22) * nebula * smoothstep(0.0, 0.1, rd.y);

      vec3 starCoord = rd * 260.0;
      vec3 starIpos = floor(starCoord);
      float starHash = hash(starIpos);
      if (starHash > 0.994) {
        float twinkle = sin(u_time * 2.5 + starHash * 120.0) * 0.5 + 0.5;
        vec3 starCol = vec3(1.0) * twinkle * u_nightMode;
        finalSky += starCol * smoothstep(0.0, 0.12, rd.y); // Horizon fade
      }
    }

    // Volumetric cloud marching setup
    vec4 sumCol = vec4(0.0);
    float t = 1.0;
    float maxT = 16.0;
    float dt = 0.22;

    for (int i = 0; i < 72; i++) {
      if (t > maxT || sumCol.a > 0.97) break;
      
      vec3 pos = ro + t * rd;
      
      // Altitude slab for cumulus clouds (from y = -1.2 to y = 0.8)
      float heightFactor = smoothstep(-1.4, -0.2, pos.y) * smoothstep(1.0, 0.2, pos.y);
      
      if (heightFactor > 0.0) {
        // Wind translation + morphing term (slightly faster clouds)
        vec3 wind = vec3(u_time * 0.22, 0.0, -u_time * 0.09);
        // Scale up coordinates (from 1.3 to 1.65) to make clouds smaller and less clumped
        vec3 samplePos = pos * 1.65 + wind;
        
        // Morph the noise based on time
        samplePos.y += sin(u_time * 0.04 + samplePos.x * 0.25) * 0.08;
        
        // Low frequency noise to modulate cloud presence (creates large clear sky regions)
        float presence = noise(samplePos * 0.22);
        float threshold = 0.58 + (1.0 - presence) * 0.45;
        float density = fbm(samplePos) * 1.7 - threshold;
        
        // Add realistic high-frequency micro-wisps at the cloud edges
        if (density > 0.0) {
          float microWisps = noise(samplePos * 5.0) * 0.16 * (1.0 - density);
          density += microWisps;
        }
        
        density = max(0.0, density) * heightFactor;
        
        if (density > 0.01) {
          // Self-shadowing towards sun/moon (Beer's Law)
          float shadowT = 0.12;
          vec3 shadowPos = pos + u_sunDir * shadowT;
          float shadowPresence = noise((shadowPos * 1.65 + wind) * 0.22);
          float shadowThreshold = 0.58 + (1.0 - shadowPresence) * 0.45;
          float shadowDensity = fbm(shadowPos * 1.65 + wind) * 1.7 - shadowThreshold;
          if (shadowDensity > 0.0) {
            shadowDensity += noise(shadowPos * 6.5 + wind) * 0.16 * (1.0 - shadowDensity);
          }
          shadowDensity = max(0.0, shadowDensity);
          
          float transmission = exp(-shadowDensity * 4.5);
          
          // Interpolate cloud base and lit tops
          vec3 cloudCol = mix(u_cloudBase, u_cloudLight, transmission);
          
          // Edge scattering (soft highlight around sun)
          float scatter = pow(max(0.0, dot(rd, u_sunDir)), 4.0) * 0.35;
          cloudCol += u_sunColor * scatter * transmission;
          
          // Warm scattering from twinkling city lights below
          if (u_nightMode > 0.01) {
            float bottomScatter = smoothstep(0.4, -1.2, pos.y) * u_nightMode;
            vec3 cityGlowCol = vec3(1.0, 0.48, 0.15) * 0.65;
            cloudCol = mix(cloudCol, cityGlowCol, bottomScatter * (1.0 - transmission));
          }
          
          // Alpha compositing
          float alpha = density * 0.4;
          vec4 val = vec4(cloudCol * alpha, alpha);
          
          // Front-to-back blend
          sumCol += val * (1.0 - sumCol.a);
        }
      }
      
      t += dt * (1.0 + t * 0.07);
    }

    // Blend clouds with sky background
    vec3 finalColor = mix(finalSky, sumCol.rgb, sumCol.a);

    // Twinling city lights on the ground far below (Night Mode only)
    if (u_nightMode > 0.02 && rd.y < 0.0) {
      float groundY = -1.6;
      float groundT = (groundY - ro.y) / rd.y;
      if (groundT > 0.0 && groundT < 24.0) {
        vec3 groundPos = ro + groundT * rd;
        
        // Ground grid coordinates
        vec2 cityUV = groundPos.xz * 1.25 + vec2(u_time * 0.04, 0.0);
        
        // Macro city shapes (active blocks and rivers)
        float river = smoothstep(0.06, 0.13, abs(noise(vec3(cityUV * 0.08, 15.0)) - 0.43));
        float blocks = noise(vec3(cityUV * 0.16, 0.0));
        float cityMask = smoothstep(0.42, 0.54, blocks) * river;
        
        if (cityMask > 0.01) {
          vec2 grid = fract(cityUV * 36.0);
          vec2 ipos = floor(cityUV * 36.0);
          
          float cellHash = hash(vec3(ipos, 7.0));
          if (cellHash > 0.70) {
            // Twinkling
            float twinkle = sin(u_time * (2.2 + cellHash * 2.5) + cellHash * 90.0) * 0.5 + 0.5;
            
            // Sodium vs Mercury lighting color mix
            vec3 lightCol = vec3(1.0, 0.56, 0.18); // Sodium Amber
            if (cellHash > 0.95) lightCol = vec3(0.9, 0.35, 0.15); // Neon/deep orange
            else if (cellHash > 0.91) lightCol = vec3(1.0, 0.82, 0.5); // Incandescent white
            else if (cellHash > 0.88) lightCol = vec3(0.45, 0.68, 1.0); // Mercury vapor blue
            
            // Highways (highly dense light strips)
            float highway = step(0.96, fract(ipos.x * 0.06 + ipos.y * 0.04));
            float intensity = cellHash * 2.0 * twinkle;
            if (highway > 0.5) {
              intensity *= 3.0;
              lightCol = vec3(1.0, 0.92, 0.75);
            }
            
            vec3 finalLights = lightCol * intensity * u_nightMode * cityMask;
            
            // Halo/Diffraction filter
            float dist = length(grid - 0.5);
            float halo = smoothstep(0.45, 0.0, dist);
            
            vec3 groundBase = vec3(0.008, 0.012, 0.018) * u_nightMode;
            vec3 groundColor = groundBase + finalLights * halo;
            
            // Fog based on distance
            float fog = exp(-groundT * 0.08);
            groundColor = mix(finalSky, groundColor, fog);
            
            // Blend ground visible through clouds
            float groundVisibility = (1.0 - sumCol.a);
            finalColor = mix(finalColor, groundColor, groundVisibility);
          }
        }
      }
    }

    // Cinematic vignette
    vec2 d = abs(v_texCoord - 0.5) * 2.0;
    finalColor *= 1.0 - dot(d, d) * 0.22;

    // Real analog camera grain completely removed to ensure buttery smooth crystal sky

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Helper to interpolate between numbers
const lerp = (a, b, t) => a + (b - a) * t;

// Helper to interpolate between 3-component float colors [r, g, b]
const lerpColor = (c1, c2, t) => [
  lerp(c1[0], c2[0], t),
  lerp(c1[1], c2[1], t),
  lerp(c1[2], c2[2], t),
];

export default function WindowSeat({ onClose, seat = '5A' }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const containerRef = useRef(null);

  // Time & Override controls
  const [localTime, setLocalTime] = useState(12); // float representation: 0 to 24
  const [isManualTime, setIsManualTime] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Keep a ref of localTime to avoid WebGL component teardown & pulsing once a second
  const localTimeRef = useRef(localTime);
  useEffect(() => {
    localTimeRef.current = localTime;
  }, [localTime]);

  // Aviation wing lights animation states
  const [strobeOpacity, setStrobeOpacity] = useState(0);
  const [navLightOpacity, setNavLightOpacity] = useState(0.4);

  // Auto-hide controls timer
  useEffect(() => {
    let hideTimeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!isManualTime) setShowControls(false);
      }, 3500);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetTimer);
      resetTimer();
    }
    return () => {
      if (container) container.removeEventListener('mousemove', resetTimer);
      clearTimeout(hideTimeout);
    };
  }, [isManualTime]);

  // Synchronize local time
  useEffect(() => {
    if (isManualTime) return;
    const tick = () => {
      const d = new Date();
      setLocalTime(d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600);
    };
    tick();
    const interval = setInterval(tick, 15000); // 15-second sync check to avoid performance-draining stutters
    return () => clearInterval(interval);
  }, [isManualTime]);

  // Aviation lights blink loop
  useEffect(() => {
    let strobeTimer = 0;
    const interval = setInterval(() => {
      strobeTimer = (strobeTimer + 100) % 1500;
      
      // Standard commercial aircraft dual-strobe flash
      if (strobeTimer === 600 || strobeTimer === 780) {
        setStrobeOpacity(1.0);
        setTimeout(() => setStrobeOpacity(0.0), 60);
      } else if (strobeTimer === 660 || strobeTimer === 840) {
        setStrobeOpacity(1.0);
        setTimeout(() => setStrobeOpacity(0.0), 60);
      }

      // Breathing effect on navigation lights
      setNavLightOpacity(0.45 + Math.sin(Date.now() / 250) * 0.15);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Parse seat choice to figure out side
  const seatString = String(seat || '5A').toUpperCase();
  const isRightWindow = seatString.includes('F') || seatString.includes('E') || seatString.includes('D');
  const showWing = false; // Airplane wing completely removed as requested

  // Dynamic values calculation based on localTime (0.0 to 24.0)
  // We establish 4 solar phases: Day, Sunset, Night, Sunrise
  const getSkyParameters = (hour) => {
    // Sunset window: 17.5 to 19.5, Peak: 18.5
    // Sunrise window: 5.0 to 7.0, Peak: 6.0
    // Night window: 19.5 to 5.0
    // Day window: 7.0 to 17.5

    let phase = 'day';
    let t = 0.0; // Interpolation factor inside phase

    if (hour >= 17.5 && hour < 19.5) {
      phase = 'sunset';
      t = (hour - 17.5) / 2.0;
    } else if (hour >= 19.5 || hour < 5.0) {
      phase = 'night';
      if (hour >= 19.5) t = (hour - 19.5) / 9.5; // till 24:00 (4.5 hours) + 5.0 hours = 9.5 total
      else t = (hour + 4.5) / 9.5;
    } else if (hour >= 5.0 && hour < 7.0) {
      phase = 'sunrise';
      t = (hour - 5.0) / 2.0;
    } else {
      phase = 'day';
      t = (hour - 7.0) / 10.5;
    }

    // Define palettes
    const DayPalette = {
      skyColorTop: [0.08, 0.32, 0.68], // Vibrant high blue
      skyColorBottom: [0.52, 0.74, 0.96], // Horizon light blue
      sunColor: [1.0, 1.0, 0.95],
      sunDir: [-0.6, 0.75, -0.4],
      cloudBase: [0.72, 0.77, 0.85],
      cloudLight: [1.0, 1.0, 1.0],
      bezelHighlight: 'rgba(255, 255, 255, 0.45)',
      cabinReflection: 0.06,
      nightMode: 0.0,
      
      // Wing colors
      wingBase: '#d2d6df',
      wingMids: '#ebf0f5',
      wingHigh: '#ffffff',
      engineShadow: '#858e9c',
      engineMids: '#bfc5cf',
      engineHigh: '#ffffff',
    };

    const SunsetPalette = {
      skyColorTop: [0.15, 0.11, 0.28], // Twilight deep violet
      skyColorBottom: [0.98, 0.45, 0.24], // Flaming orange/crimson horizon
      sunColor: [1.0, 0.65, 0.38],
      sunDir: [-1.0, 0.16, -0.2],
      cloudBase: [0.25, 0.21, 0.32], // Deep dusty violet
      cloudLight: [0.98, 0.62, 0.4], // Golden glowing cloud tops
      bezelHighlight: 'rgba(255, 120, 60, 0.5)',
      cabinReflection: 0.10,
      nightMode: 0.15, // Blending starting for ground/stars

      // Wing colors
      wingBase: '#3c2e42',
      wingMids: '#9e626e',
      wingHigh: '#ffa074',
      engineShadow: '#281c2b',
      engineMids: '#854c5b',
      engineHigh: '#ff9a69',
    };

    const NightPalette = {
      skyColorTop: [0.008, 0.008, 0.018], // Absolute space black
      skyColorBottom: [0.03, 0.04, 0.08], // Cool horizon navy-blue
      sunColor: [0.52, 0.63, 0.85], // Silvery moonlight
      sunDir: [-0.3, 0.88, -0.5],
      cloudBase: [0.035, 0.045, 0.07], // Dark cloud body
      cloudLight: [0.14, 0.18, 0.3], // Soft silvery lit tops
      bezelHighlight: 'rgba(100, 130, 255, 0.12)',
      cabinReflection: 0.16,
      nightMode: 1.0,

      // Wing colors
      wingBase: '#05070e',
      wingMids: '#0d1222',
      wingHigh: '#2a3858',
      engineShadow: '#020306',
      engineMids: '#0a0d1b',
      engineHigh: '#222f4c',
    };

    const SunrisePalette = {
      skyColorTop: [0.12, 0.16, 0.34], // Cool morning navy
      skyColorBottom: [0.98, 0.58, 0.38], // Bright salmon-orange sunrise
      sunColor: [1.0, 0.78, 0.55],
      sunDir: [-0.98, 0.18, -0.22],
      cloudBase: [0.22, 0.22, 0.34],
      cloudLight: [0.98, 0.72, 0.52],
      bezelHighlight: 'rgba(255, 140, 80, 0.45)',
      cabinReflection: 0.08,
      nightMode: 0.1,

      // Wing colors
      wingBase: '#362f40',
      wingMids: '#8c5d6e',
      wingHigh: '#ff9a7c',
      engineShadow: '#221b29',
      engineMids: '#754759',
      engineHigh: '#ff9272',
    };

    // Smooth sinusoidal interpolations
    if (phase === 'sunset') {
      const weight = 0.5 - 0.5 * Math.cos(t * Math.PI);
      return interpolatePalettes(DayPalette, SunsetPalette, weight);
    } else if (phase === 'night') {
      const weight = 0.5 - 0.5 * Math.cos(t * Math.PI);
      return interpolatePalettes(SunsetPalette, NightPalette, weight);
    } else if (phase === 'sunrise') {
      const weight = 0.5 - 0.5 * Math.cos(t * Math.PI);
      return interpolatePalettes(NightPalette, SunrisePalette, weight);
    } else {
      const weight = 0.5 - 0.5 * Math.cos(t * Math.PI);
      return interpolatePalettes(SunrisePalette, DayPalette, weight);
    }
  };

  const interpolatePalettes = (p1, p2, w) => {
    return {
      skyColorTop: lerpColor(p1.skyColorTop, p2.skyColorTop, w),
      skyColorBottom: lerpColor(p1.skyColorBottom, p2.skyColorBottom, w),
      sunColor: lerpColor(p1.sunColor, p2.sunColor, w),
      sunDir: lerpColor(p1.sunDir, p2.sunDir, w),
      cloudBase: lerpColor(p1.cloudBase, p2.cloudBase, w),
      cloudLight: lerpColor(p1.cloudLight, p2.cloudLight, w),
      bezelHighlight: w < 0.5 ? p1.bezelHighlight : p2.bezelHighlight,
      cabinReflection: lerp(p1.cabinReflection, p2.cabinReflection, w),
      nightMode: lerp(p1.nightMode, p2.nightMode, w),
      
      // Wing Colors
      wingBase: w < 0.5 ? p1.wingBase : p2.wingBase,
      wingMids: w < 0.5 ? p1.wingMids : p2.wingMids,
      wingHigh: w < 0.5 ? p1.wingHigh : p2.wingHigh,
      engineShadow: w < 0.5 ? p1.engineShadow : p2.engineShadow,
      engineMids: w < 0.5 ? p1.engineMids : p2.engineMids,
      engineHigh: w < 0.5 ? p1.engineHigh : p2.engineHigh,
    };
  };

  const params = getSkyParameters(localTime);
  const isNightActive = params.nightMode > 0.5;

  // WebGL context setup & render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn("WebGL not supported, falling back to basic rendering.");
      return;
    }

    // Compilation utility
    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error: ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("WebGL program link error: ", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry setup
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Extract uniforms
    const uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      seatSide: gl.getUniformLocation(program, "u_seatSide"),
      nightMode: gl.getUniformLocation(program, "u_nightMode"),
      skyColorTop: gl.getUniformLocation(program, "u_skyColorTop"),
      skyColorBottom: gl.getUniformLocation(program, "u_skyColorBottom"),
      sunColor: gl.getUniformLocation(program, "u_sunColor"),
      sunDir: gl.getUniformLocation(program, "u_sunDir"),
      cloudBase: gl.getUniformLocation(program, "u_cloudBase"),
      cloudLight: gl.getUniformLocation(program, "u_cloudLight"),
    };

    let startTime = Date.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      // Render at native sharp resolution (no downscaling needed for this size)
      canvas.width = rect.width;
      canvas.height = rect.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation frame render loop
    const render = () => {
      const timeMs = Date.now() - startTime;
      const timeSec = timeMs / 1000.0;

      // Sync active parameters using ref to avoid WebGL context tear-downs
      const currentParams = getSkyParameters(localTimeRef.current);

      // Bind uniforms
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, timeSec);
      gl.uniform1f(uniforms.seatSide, isRightWindow ? 1.0 : 0.0);
      gl.uniform1f(uniforms.nightMode, currentParams.nightMode);
      
      // Pass vector values
      gl.uniform3fv(uniforms.skyColorTop, new Float32Array(currentParams.skyColorTop));
      gl.uniform3fv(uniforms.skyColorBottom, new Float32Array(currentParams.skyColorBottom));
      gl.uniform3fv(uniforms.sunColor, new Float32Array(currentParams.sunColor));
      
      // Normalize sun direction on fly
      const sd = currentParams.sunDir;
      const len = Math.sqrt(sd[0]*sd[0] + sd[1]*sd[1] + sd[2]*sd[2]);
      gl.uniform3f(uniforms.sunDir, sd[0]/len, sd[1]/len, sd[2]/len);
      
      gl.uniform3fv(uniforms.cloudBase, new Float32Array(currentParams.cloudBase));
      gl.uniform3fv(uniforms.cloudLight, new Float32Array(currentParams.cloudLight));

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
    };
  }, [isRightWindow]);

  return (
    <div 
      ref={containerRef}
      style={{
        backgroundColor: '#000000', // Absolute OLED pure pitch black
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        margin: 0,
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Absolute Close button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-10 right-8 z-[10000000] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 pointer-events-auto border border-white/5"
        style={{ cursor: 'pointer' }}
      >
        <X size={24} className="text-white/80" />
      </button>

      {/* OUTER CABIN BEZEL - Multi-layer extrusion for 3D depth */}
      <div 
        style={{
          width: '350px',
          height: '550px',
          borderRadius: '145px',
          background: 'linear-gradient(135deg, #18191c 0%, #0d0e10 100%)',
          boxShadow: `
            inset 3px 3px 6px rgba(255, 255, 255, 0.08),
            inset -3px -3px 6px rgba(0, 0, 0, 0.8),
            0 15px 45px rgba(0, 0, 0, 0.95),
            0 0 80px rgba(0, 0, 0, 0.8)
          `,
          padding: '24px', // Depth spacer
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {/* INNER PLASTIC ACCENT BEZEL (Realistic stepped frame) */}
        <div 
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '120px',
            background: 'linear-gradient(145deg, #101113 0%, #08090a 100%)',
            boxShadow: `
              inset 16px 0 25px -5px ${params.bezelHighlight},
              inset -20px 0 30px rgba(0, 0, 0, 0.95),
              inset 0 20px 30px rgba(0, 0, 0, 0.95),
              inset 0 -20px 30px rgba(0, 0, 0, 0.95),
              0 3px 10px rgba(0,0,0,0.6)
            `,
            padding: '26px', // Thickness of secondary bezel
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          {/* RUBBER GLASS GASKET (Black sealer ring) */}
          <div 
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '96px',
              border: '2.5px solid #030303',
              boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(255,255,255,0.05)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {/* PROCEDURAL WEBGL SKY & VOLUMETRIC CLOUDS CANVAS */}
            <canvas 
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '94px',
                display: 'block',
                backgroundColor: '#0a0d16'
              }}
            />

            {/* REALISTIC HIGH-FIDELITY AIRPLANE WING LAYER */}
            {showWing && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 5,
                  opacity: 1
                }}
              >
                {!isRightWindow ? (
                  // LEFT WING (5A Seat)
                  <svg viewBox="0 0 300 500" className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'normal' }}>
                    <defs>
                      <linearGradient id="leftWingGrad" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor={params.wingBase} />
                        <stop offset="50%" stopColor={params.wingMids} />
                        <stop offset="100%" stopColor={params.wingHigh} />
                      </linearGradient>
                      <linearGradient id="leftEngineGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={params.engineHigh} />
                        <stop offset="55%" stopColor={params.engineMids} />
                        <stop offset="100%" stopColor={params.engineShadow} />
                      </linearGradient>
                      <radialGradient id="wingScanLight" cx="15%" cy="85%" r="75%">
                        <stop offset="0%" stopColor="rgba(255, 235, 195, 0.45)" />
                        <stop offset="45%" stopColor="rgba(255, 235, 195, 0.08)" />
                        <stop offset="100%" stopColor="rgba(255, 235, 195, 0)" />
                      </radialGradient>
                    </defs>

                    {/* Fuselage-mounted wing scan light at night */}
                    {isNightActive && (
                      <path d="M 0,440 L 170,160 L 300,340 L 0,490 Z" fill="url(#wingScanLight)" style={{ mixBlendMode: 'screen' }} />
                    )}

                    {/* Wing Main Structure */}
                    <path 
                      d="M 0,465 L 0,385 L 245,225 L 255,234 L 240,265 L 0,495 Z" 
                      fill="url(#leftWingGrad)" 
                      stroke="rgba(0,0,0,0.18)"
                      strokeWidth="1"
                    />

                    {/* Panel metal seams */}
                    <path d="M 50,352 L 52,434" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
                    <path d="M 100,320 L 104,394" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
                    <path d="M 150,288 L 153,354" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
                    <path d="M 198,256 L 200,309" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />

                    {/* Leading edge bright highlight */}
                    <path 
                      d="M 0,385 L 245,225" 
                      stroke="rgba(255,255,255,0.45)" 
                      strokeWidth="1.6" 
                    />

                    {/* Flap Track Canoe Fairings */}
                    <path d="M 75,346 L 85,389 L 82,394 L 73,344 Z" fill="#585e68" opacity="0.85" />
                    <path d="M 145,300 L 153,339 L 150,343 L 143,299 Z" fill="#585e68" opacity="0.85" />

                    {/* Upward curved Winglet */}
                    <path 
                      d="M 245,225 C 250,220 253,210 253,195 L 260,197 C 260,215 255,227 240,265" 
                      fill="url(#leftWingGrad)" 
                      stroke="rgba(0,0,0,0.2)"
                    />
                    <path d="M 253,195 L 260,197 L 259,203 L 252,201 Z" fill="#b92929" /> {/* Left wing Red marker cap */}

                    {/* Realist Turbine Engine Cowling */}
                    <path 
                      d="M 60,395 C 60,375 120,365 145,400 C 150,410 140,440 110,450 C 80,455 60,435 60,395 Z" 
                      fill="url(#leftEngineGrad)" 
                      stroke="rgba(0,0,0,0.22)"
                    />
                    {/* Metal Chrome Intake Rim */}
                    <path 
                      d="M 60,395 C 60,377 72,372 75,387 C 77,402 75,422 68,431 C 62,436 60,415 60,395 Z" 
                      fill="#7a828c" 
                      stroke="rgba(0,0,0,0.3)"
                    />
                    {/* Engine fan cavity */}
                    <path d="M 63,395 C 63,383 70,381 72,393 C 74,405 72,419 68,426 C 65,428 63,410 63,395 Z" fill="#111113" />
                    {/* Tail-cone exhaust */}
                    <path d="M 142,405 L 160,417 L 140,427 Z" fill="#2d2d30" />

                    {/* Red Navigation Light */}
                    <circle cx="253" cy="195" r="3" fill="#ff3b30" />
                    <circle cx="253" cy="195" r="8" fill="#ff3b30" opacity={navLightOpacity} />

                    {/* Flashing White Strobe */}
                    <circle cx="260" cy="199" r="3.5" fill="#ffffff" />
                    <circle cx="260" cy="199" r="10" fill="#ffffff" opacity={strobeOpacity} />
                  </svg>
                ) : (
                  // RIGHT WING (5F Seat)
                  <svg viewBox="0 0 300 500" className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'normal' }}>
                    <defs>
                      <linearGradient id="rightWingGrad" x1="1" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor={params.wingBase} />
                        <stop offset="50%" stopColor={params.wingMids} />
                        <stop offset="100%" stopColor={params.wingHigh} />
                      </linearGradient>
                      <linearGradient id="rightEngineGrad" x1="1" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={params.engineHigh} />
                        <stop offset="55%" stopColor={params.engineMids} />
                        <stop offset="100%" stopColor={params.engineShadow} />
                      </linearGradient>
                      <radialGradient id="wingScanLightRight" cx="85%" cy="85%" r="75%">
                        <stop offset="0%" stopColor="rgba(255, 235, 195, 0.45)" />
                        <stop offset="45%" stopColor="rgba(255, 235, 195, 0.08)" />
                        <stop offset="100%" stopColor="rgba(255, 235, 195, 0)" />
                      </radialGradient>
                    </defs>

                    {/* Fuselage-mounted wing scan light at night */}
                    {isNightActive && (
                      <path d="M 300,440 L 130,160 L 0,340 L 300,490 Z" fill="url(#wingScanLightRight)" style={{ mixBlendMode: 'screen' }} />
                    )}

                    {/* Wing Main Structure */}
                    <path 
                      d="M 300,465 L 300,385 L 55,225 L 45,234 L 60,265 L 300,495 Z" 
                      fill="url(#rightWingGrad)" 
                      stroke="rgba(0,0,0,0.18)"
                      strokeWidth="1"
                    />

                    {/* Panel metal seams */}
                    <path d="M 250,352 L 248,434" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
                    <path d="M 200,320 L 196,394" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
                    <path d="M 150,288 L 147,354" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
                    <path d="M 102,256 L 100,309" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />

                    {/* Leading edge bright highlight */}
                    <path 
                      d="M 300,385 L 55,225" 
                      stroke="rgba(255,255,255,0.45)" 
                      strokeWidth="1.6" 
                    />

                    {/* Flap Track Canoe Fairings */}
                    <path d="M 225,346 L 215,389 L 218,394 L 227,344 Z" fill="#585e68" opacity="0.85" />
                    <path d="M 155,300 L 147,339 L 150,343 L 157,299 Z" fill="#585e68" opacity="0.85" />

                    {/* Upward curved Winglet */}
                    <path 
                      d="M 55,225 C 50,220 47,210 47,195 L 40,197 C 40,215 45,227 60,265" 
                      fill="url(#rightWingGrad)" 
                      stroke="rgba(0,0,0,0.2)"
                    />
                    <path d="M 47,195 L 40,197 L 41,203 L 48,201 Z" fill="#34c759" /> {/* Right wing Green marker cap */}

                    {/* Realist Turbine Engine Cowling */}
                    <path 
                      d="M 240,395 C 240,375 180,365 155,400 C 150,410 160,440 190,450 C 220,455 240,435 240,395 Z" 
                      fill="url(#rightEngineGrad)" 
                      stroke="rgba(0,0,0,0.22)"
                    />
                    {/* Metal Chrome Intake Rim */}
                    <path 
                      d="M 240,395 C 240,377 228,372 225,387 C 223,402 225,422 232,431 C 238,436 240,415 240,395 Z" 
                      fill="#7a828c" 
                      stroke="rgba(0,0,0,0.3)"
                    />
                    {/* Engine fan cavity */}
                    <path d="M 237,395 C 237,383 230,381 228,393 C 226,405 228,419 232,426 C 235,428 237,410 237,395 Z" fill="#111113" />
                    {/* Tail-cone exhaust */}
                    <path d="M 158,405 L 140,417 L 160,427 Z" fill="#2d2d30" />

                    {/* Green Navigation Light */}
                    <circle cx="47" cy="195" r="3" fill="#34c759" />
                    <circle cx="47" cy="195" r="8" fill="#34c759" opacity={navLightOpacity} />

                    {/* Flashing White Strobe */}
                    <circle cx="40" cy="199" r="3.5" fill="#ffffff" />
                    <circle cx="40" cy="199" r="10" fill="#ffffff" opacity={strobeOpacity} />
                  </svg>
                )}
              </div>
            )}

            {/* DUST, MICRO-SCRATCHES & ACRYLIC GLASS GLARE LAYER */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '94px',
                pointerEvents: 'none',
                zIndex: 10,
                // Soft double reflection glare (simulating multiple acrylic panels)
                background: `
                  linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.01) 45%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.03) 100%),
                  radial-gradient(ellipse at 40% 10%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)
                `,
                // Soft cabin reflection on the dark inner glass pane
                boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.8)'
              }}
            >
              {/* Ultra-realistic micro scratches on acrylic glass (SVG overlays) */}
              <svg viewBox="0 0 200 400" className="absolute inset-0 w-full h-full opacity-15" style={{ stroke: '#ffffff', strokeWidth: '0.4', fill: 'none' }}>
                {/* Micro curved hairline scratch 1 */}
                <path d="M 30,120 A 150,150 0 0,0 75,70" />
                {/* Micro curved hairline scratch 2 */}
                <path d="M 120,310 A 90,90 0 0,1 155,270" strokeWidth="0.3" />
                {/* Hairline scratch 3 */}
                <path d="M 80,240 L 95,220" strokeWidth="0.25" />
              </svg>

              {/* Cabin interior subtle LED ambient reflection */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '94px',
                  boxShadow: `inset 5px 5px 30px rgba(0,0,0,0.95)`,
                  // Warm ambient glow matching time of day
                  background: `radial-gradient(circle at 10% 90%, rgba(255, 100, 50, ${params.cabinReflection * 0.4}) 0%, rgba(0,0,0,0) 50%)`,
                  opacity: 0.8
                }}
              />
            </div>

            {/* PRESSURIZATION BREATHER HOLE (BLEED HOLE) - Signature Airplane Window Detail */}
            <div 
              style={{
                position: 'absolute',
                bottom: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '6.5px',
                height: '6.5px',
                borderRadius: '50%',
                backgroundColor: '#040404',
                border: '1.2px solid rgba(255, 255, 255, 0.12)',
                boxShadow: `
                  inset 1px 1px 2px rgba(0,0,0,0.95),
                  0 0.8px 1px rgba(255,255,255,0.15)
                `,
                zIndex: 20,
                pointerEvents: 'none'
              }}
            />

          </div>
        </div>
      </div>

      {/* FLOATING CONTROLS PANEL - Auto-hides on mouse inactivity */}
      <div 
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000002,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          opacity: showControls ? 1 : 0,
          transform: `translateX(-50%) translateY(${showControls ? 0 : '15px'})`,
          transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        <div 
          className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-black/60 dark:bg-[#1c1c1e]/85 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
          {/* Real-time synchronization toggle */}
          <button
            onClick={() => setIsManualTime(!isManualTime)}
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
              !isManualTime 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
            title={!isManualTime ? "Syncing with Local Clock" : "Using Manual Time"}
          >
            <Clock size={18} />
          </button>

          {/* Separation */}
          <div className="w-[1px] h-6 bg-white/10" />

          {/* Time slider */}
          <div className="flex items-center gap-3">
            {isManualTime ? (
              <>
                {localTime < 5 || localTime >= 19.5 ? (
                  <Moon size={16} className="text-indigo-400" />
                ) : (
                  <Sun size={16} className="text-amber-400 animate-spin-slow" />
                )}
                
                <input
                  type="range"
                  min="0"
                  max="23.99"
                  step="0.05"
                  value={localTime}
                  onChange={(e) => setLocalTime(parseFloat(e.target.value))}
                  style={{
                    width: '140px',
                    height: '4px',
                    borderRadius: '2px',
                    appearance: 'none',
                    background: 'rgba(255,255,255,0.2)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  className="accent-blue-500"
                />

                <span className="text-xs font-mono text-white/80 w-11 text-right">
                  {String(Math.floor(localTime)).padStart(2, '0')}
                  :
                  {String(Math.floor((localTime % 1) * 60)).padStart(2, '0')}
                </span>
              </>
            ) : (
              <span className="text-xs font-medium tracking-wide text-white/70 flex items-center gap-1.5 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Seat marker badge */}
        <span className="text-[10px] uppercase font-bold tracking-widest text-white/35 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-sm">
          Seat {seatString} • Window View
        </span>
      </div>

      {/* CSS Spin-slow definition */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}} />
    </div>
  );
}
