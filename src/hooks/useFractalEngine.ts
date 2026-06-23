import { useEffect, useRef } from 'react';
import { vertexShaderSource, fragmentShaderSource } from '../shaders';

interface FractalState {
  zoom: number;
  x: number;
  y: number;
  maxIter: number;
}

const splitDouble = (val: number) => {
  const high = Math.fround(val);
  const low = val - high;
  return [high, low];
};

export function useFractalEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  autoZoom: boolean,
  onUiUpdate: (state: FractalState) => void
) {
  const engine = useRef({
    x: -0.7900332,
    y: 0.1372227,
    targetX: -0.7900332,
    targetY: 0.1372227,
    zoom: 189000,
    targetZoom: 189000,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    if (!program || !vertShader || !fragShader) return;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const offsetXLoc = gl.getUniformLocation(program, 'u_offset_x');
    const offsetYLoc = gl.getUniformLocation(program, 'u_offset_y');
    const pixelStepLoc = gl.getUniformLocation(program, 'u_pixel_step');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const maxIterLoc = gl.getUniformLocation(program, 'u_max_iter');

    let animationFrameId: number;
    let startTime = performance.now();
    let lastUiUpdate = 0;

    const render = (time: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        engine.current.width = w;
        engine.current.height = h;
        gl.viewport(0, 0, w, h);
      }

      if (autoZoom) {
        engine.current.targetZoom *= 1.005;
      }

      if (Number.isNaN(engine.current.targetZoom) || engine.current.targetZoom <= 0) {
        engine.current.targetZoom = 0.8;
      }

      engine.current.zoom += (engine.current.targetZoom - engine.current.zoom) * 0.1;
      engine.current.x += (engine.current.targetX - engine.current.x) * 0.1;
      engine.current.y += (engine.current.targetY - engine.current.y) * 0.1;

      const safeZoom = Math.max(0.1, engine.current.zoom);
      let dynamicMaxIter = Math.floor(400.0 + Math.max(0, Math.log10(safeZoom)) * 150.0);
      
      if (Number.isNaN(dynamicMaxIter) || dynamicMaxIter < 100) {
          dynamicMaxIter = 400;
      }

      if (time - lastUiUpdate > 100) {
        onUiUpdate({
          zoom: engine.current.zoom,
          x: engine.current.x,
          y: engine.current.y,
          maxIter: dynamicMaxIter
        });
        lastUiUpdate = time;
      }

      const [oxHi, oxLo] = splitDouble(engine.current.x);
      const [oyHi, oyLo] = splitDouble(engine.current.y);
      
      const pixelStep = 1.0 / (safeZoom * h);
      const [stepHi, stepLo] = splitDouble(pixelStep);

      gl.uniform2f(resLoc, w, h);
      gl.uniform2f(offsetXLoc, oxHi, oxLo);
      gl.uniform2f(offsetYLoc, oyHi, oyLo);
      gl.uniform2f(pixelStepLoc, stepHi, stepLo);
      gl.uniform1f(timeLoc, (time - startTime) / 1000.0);
      gl.uniform1f(maxIterLoc, dynamicMaxIter);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [autoZoom, canvasRef, onUiUpdate]);

  const handlers = {
    onWheel: (e: React.WheelEvent) => {
      const s = engine.current;
      const uvX = (e.clientX - s.width / 2) / s.height;
      const uvY = -(e.clientY - s.height / 2) / s.height;

      const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
      const newTargetZoom = Math.max(0.1, s.targetZoom * zoomFactor);

      s.targetX = s.targetX + uvX * (1 / s.targetZoom - 1 / newTargetZoom);
      s.targetY = s.targetY + uvY * (1 / s.targetZoom - 1 / newTargetZoom);
      s.targetZoom = newTargetZoom;
    },
    onPointerDown: (e: React.PointerEvent) => {
      engine.current.isDragging = true;
      engine.current.lastMouseX = e.clientX;
      engine.current.lastMouseY = e.clientY;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = engine.current;
      if (!s.isDragging) return;

      const dx = e.clientX - s.lastMouseX;
      const dy = e.clientY - s.lastMouseY;
      
      const safeZoom = Math.max(0.1, s.zoom);
      const panSpeed = 1.0 / (safeZoom * s.height);

      s.targetX -= dx * panSpeed;
      s.targetY += dy * panSpeed;

      s.lastMouseX = e.clientX;
      s.lastMouseY = e.clientY;
    },
    onPointerUp: () => {
      engine.current.isDragging = false;
    }
  };

  return handlers;
}
