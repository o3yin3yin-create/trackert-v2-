'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Sun, Moon, Clock, Sliders, Volume2, VolumeX } from 'lucide-react';

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
    p += dot(p.xyz, p.yzx + vec3(19.19));
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

    // Camera setup - looking completely horizontal to put the horizon exactly in the middle (50% sky, 50% clouds)
    float side = u_seatSide > 0.5 ? 1.0 : -1.0;
    
    // Camera translation forward
    vec3 ro = vec3(0.0, 1.5, -u_time * 0.05);
    // Target is exactly horizontal (y=1.5 matches ro.y)
    vec3 ta = vec3(side * 1.5, 1.5, -u_time * 0.05 - 2.0);
    
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(0.0, 1.0, 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    vec3 rd = normalize(p.x * cu + p.y * cv + 2.2 * cw);

    // === PERFECT SKY GRADIENT (renders EVERYWHERE) ===
    // This creates a clear, prominent gradient starting exactly at the horizon
    float skyT = clamp(rd.y * 2.5, 0.0, 1.0);
    vec3 skyColor = mix(u_skyColorBottom, u_skyColorTop, skyT);

    // Warm horizon glow matching the sunset photo (fade it out entirely in night mode to prevent orange line)
    float horizonGlow = exp(-abs(rd.y) * 8.0);
    vec3 glowColor = mix(u_skyColorBottom * 1.1, vec3(0.0), u_nightMode);
    skyColor = mix(skyColor, glowColor, horizonGlow * 0.6);

    // Sun/Moon glow
    float sunGlow = max(0.0, dot(rd, u_sunDir));
    vec3 finalSky = skyColor + u_sunColor * pow(sunGlow, 8.0) * 0.2 + u_sunColor * pow(sunGlow, 64.0) * 0.4;

    // Add starfield at night
    if (u_nightMode > 0.02 && rd.y > 0.0) {
      float nebula = noise(rd * 3.5 + vec3(5.0, 12.0, 2.0)) * 0.16 * u_nightMode;
      finalSky += vec3(0.12, 0.08, 0.22) * nebula * smoothstep(0.0, 0.1, rd.y);

      // Stars: smaller, denser, with size/brightness/color variation
      vec3 starCoord = rd * 600.0;
      vec3 starIpos = floor(starCoord);
      float starHash = hash(starIpos);
      if (starHash > 0.985) { 
        float brightness = (starHash - 0.985) * 66.0; // 0.0 to 1.0 variation
        // Color variation based on hash (some bluish, some yellowish)
        vec3 colorTint = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.9, 0.8), hash(starIpos + 1.0));
        vec3 starCol = colorTint * brightness * u_nightMode; 
        finalSky += starCol * smoothstep(0.0, 0.12, rd.y);
      }
    }

    // === CONTINUOUS CLOUD SEA (bottom half) ===
    // Clean horizon fade to make clouds blend smoothly into the sky
    float horizonFade = smoothstep(0.0, -0.005, rd.y);

    vec4 sumCol = vec4(0.0);
    float t = 1.0;
    float maxT = 45.0; // Pushed horizon further
    float dt = 0.25;

    if (horizonFade > 0.001) {
      for (int i = 0; i < 90; i++) { // Increased loop count for further horizon
        if (t > maxT || sumCol.a > 0.98) break;
        
        vec3 pos = ro + t * rd;
        
        // Solid layer of clouds below y=0.8, puffy tops up to y=1.5 (RAISED)
        float heightFactor = smoothstep(1.5, 0.0, pos.y);
        
        if (heightFactor > 0.0) {
          // Wind is slower as requested
          vec3 wind = vec3(u_time * 0.06, 0.0, -u_time * 0.02);
          vec3 samplePos = pos * 1.5 + wind;
          vec3 largeSamplePos = pos * 0.5 + wind * 0.5;
          
          // Base density makes it a solid unbroken sea of clouds at the bottom
          // (RAISED to y=1.2 to -0.2)
          float baseDensity = smoothstep(1.2, -0.2, pos.y) * 1.5;
          
          // Large scale variation for bigger differences in cloud sizes/heights
          float largeVariation = noise(largeSamplePos) * 1.2;
          
          // Puffy details
          float detail = fbm(samplePos) * 1.8;
          
          // Combine: density > 0 means cloud exists
          float density = baseDensity + largeVariation + detail - 2.4; // Adjusted threshold
          
          density = max(0.0, density) * heightFactor;
          
          if (density > 0.01) {
            // Self-shadowing (volumetric depth)
            float shadowT = 0.15;
            vec3 shadowPos = samplePos + u_sunDir * shadowT;
            vec3 shadowLargePos = largeSamplePos + u_sunDir * shadowT * 0.5;
            
            float shadowBase = smoothstep(1.2, -0.2, pos.y + u_sunDir.y * shadowT) * 1.5;
            float shadowLarge = noise(shadowLargePos) * 1.2;
            float shadowDensity = shadowBase + shadowLarge + fbm(shadowPos) * 1.8 - 2.4;
            shadowDensity = max(0.0, shadowDensity);
            
            float transmission = exp(-shadowDensity * 3.5);
            
            // Remove dark shadows from distant clouds to prevent the dark line at the horizon
            transmission = mix(transmission, 1.0, smoothstep(15.0, maxT, t));
            
            // Color: mix shadow color (cloudBase) with lit color (cloudLight)
            vec3 cloudCol = mix(u_cloudBase, u_cloudLight, transmission * 0.8 + 0.2);
            
            // Soft highlight facing sun
            float scatter = pow(max(0.0, dot(rd, u_sunDir)), 4.0) * 0.3;
            cloudCol += u_sunColor * scatter * transmission;
            
            // Alpha builds up nicely
            float alpha = smoothstep(0.0, 0.2, density) * 0.85;
            
            // Enforce a perfectly straight horizon line (flattens bumps at rd.y = 0)
            alpha *= smoothstep(0.002, -0.015, rd.y);
            
            // Fade out distant clouds softly
            alpha *= smoothstep(maxT, maxT - 15.0, t);
            
            vec4 val = vec4(cloudCol * alpha, alpha);
            
            sumCol += val * (1.0 - sumCol.a);
          }
        }
        
        t += dt * (1.0 + t * 0.06);
      }
    }

    // Blend the beautiful clouds perfectly over the sky
    vec3 finalColor = mix(finalSky, sumCol.rgb, sumCol.a);

    // Removed the "Night city lights" glow entirely to eliminate the orange line completely

    // Cinematic vignette
    vec2 d = abs(v_texCoord - 0.5) * 2.0;
    finalColor *= 1.0 - dot(d, d) * 0.15;

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
        setShowControls(false); // Always auto-hide after 3.5s of inactivity
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
  }, []);

  // Cabin Audio Synthesizer (Web Audio API)
  const [isAudioOn, setIsAudioOn] = useState(false);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    if (isAudioOn) {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        // Generate Brown Noise for deep airplane cabin rumble
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          let white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // Compensate gain
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        // Lowpass filter to muffle it like a cabin
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Deep rumble

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.001; // Start muted for fade-in
        gainNodeRef.current = gainNode;

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        noiseSource.start();
      }
      
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      
      // Fade in smoothly
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0.5, audioCtxRef.current.currentTime, 0.5);
      }
    } else {
      // Fade out smoothly
      if (audioCtxRef.current && gainNodeRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0.001, audioCtxRef.current.currentTime, 0.5);
        setTimeout(() => {
           if (!isAudioOn && audioCtxRef.current && audioCtxRef.current.state !== 'suspended') {
             audioCtxRef.current.suspend();
           }
        }, 1000);
      }
    }
  }, [isAudioOn]);

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
      skyColorTop: [0.18, 0.42, 0.75], // Deep clear blue
      skyColorBottom: [0.65, 0.82, 0.98], // Soft hazy horizon blue
      sunColor: [1.0, 1.0, 0.98],
      sunDir: [-0.6, 0.75, -0.4],
      cloudBase: [0.65, 0.72, 0.85], // Cool grey-blue for cloud shadows
      cloudLight: [0.98, 0.99, 1.0], // Brilliant pure white for cloud tops
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
      skyColorTop: [0.45, 0.52, 0.68], // Soft blue/purple top matching photo
      skyColorBottom: [0.95, 0.78, 0.68], // Pale peach/orange horizon matching photo
      sunColor: [1.0, 0.85, 0.75],
      sunDir: [-1.0, 0.16, -0.2],
      cloudBase: [0.45, 0.42, 0.52], // Cool dark purple/grey in the valleys (shadows)
      cloudLight: [0.95, 0.88, 0.92], // Soft pinkish-white on the peaks (lit)
      bezelHighlight: 'rgba(255, 200, 180, 0.5)',
      cabinReflection: 0.10,
      nightMode: 0.0, // Delay night mode slightly for perfect sunset
      
      // Wing colors
      wingBase: '#4a3d4f',
      wingMids: '#b8828b',
      wingHigh: '#ffbca1',
      engineShadow: '#36283d',
      engineMids: '#9e6777',
      engineHigh: '#ffb594',
    };

    const NightPalette = {
      skyColorTop: [0.008, 0.008, 0.018], // Absolute space black
      skyColorBottom: [0.03, 0.04, 0.08], // Cool horizon navy-blue
      sunColor: [0.52, 0.63, 0.85], // Silvery moonlight
      sunDir: [-0.3, 0.88, -0.5],
      cloudBase: [0.05, 0.06, 0.09], // Slightly lighter base
      cloudLight: [0.28, 0.35, 0.52], // Much brighter silvery cloud tops
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
      cloudBase: [0.42, 0.42, 0.52], // Lighter cloud base
      cloudLight: [1.25, 1.0, 0.85], // Brighter cloud tops
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
      {/* Absolute Close button with auto-hide */}
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-10 right-8 z-[10000000] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 pointer-events-auto border border-white/5"
        style={{ 
          cursor: 'pointer',
          opacity: showControls ? 1 : 0,
          transform: `translateY(${showControls ? 0 : '-15px'})`,
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
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
            id="window-bezel"
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

          {/* Cabin Audio Toggle */}
          <button
            onClick={() => setIsAudioOn(!isAudioOn)}
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
              isAudioOn 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
            title={isAudioOn ? "Mute Cabin Audio" : "Play Cabin Audio"}
          >
            {isAudioOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
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
