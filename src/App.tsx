import React, { useRef, useState, useCallback } from 'react';
import { useFractalEngine } from './hooks/useFractalEngine';
import { HUD } from './components/HUD';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [uiState, setUiState] = useState({ zoom: 0.8, x: -0.5, y: 0.0 });
  const [autoZoom, setAutoZoom] = useState(false);

  const handleUiUpdate = useCallback((state: { zoom: number; x: number; y: number }) => {
    setUiState(state);
  }, []);

  const handlers = useFractalEngine(canvasRef, autoZoom, handleUiUpdate);

  return (
    <div className="relative w-screen h-screen font-mono text-tech-cyan overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
        onWheel={handlers.onWheel}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerUp}
      />
      
      <HUD 
        uiState={uiState} 
        autoZoom={autoZoom} 
        setAutoZoom={setAutoZoom} 
      />
    </div>
  );
}

