interface HUDProps {
  uiState: {
    zoom: number;
    x: number;
    y: number;
    mode: string;
    refOrbitLen: number;
    maxIter: number;
  };
  autoZoom: boolean;
  setAutoZoom: (val: boolean) => void;
}

export function HUD({ uiState, autoZoom, setAutoZoom }: HUDProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(
      JSON.stringify({ x: uiState.x, y: uiState.y, z: uiState.zoom })
    );
  };

  const depthDigits = Math.max(0, Math.floor(Math.log10(uiState.zoom)));

  return (
    <div className="absolute top-4 left-4 bg-tech-black/70 p-4 border border-tech-cyan/30 backdrop-blur-sm rounded-sm select-none pointer-events-none">
      <h1 className="text-xl font-bold mb-2 tracking-widest">Fractal Explorer</h1>

      <div className="text-xs opacity-80 space-y-1 font-mono">
        <p>ZOOM   : {uiState.zoom.toExponential(2)}x</p>
        <p>COORD_X: {uiState.x.toFixed(Math.min(depthDigits + 2, 15))}</p>
        <p>COORD_Y: {uiState.y.toFixed(Math.min(depthDigits + 2, 15))}</p>
        <p>
          MODE   :{' '}
          <span className={uiState.mode === 'perturbation' ? 'text-green-400' : 'text-tech-cyan'}>
            {uiState.mode === 'perturbation' ? '∞ PERTURBATION' : 'CLASSIC DS'}
          </span>
        </p>
        {uiState.mode === 'perturbation' && (
          <p>REF_ORB: {uiState.refOrbitLen} iters</p>
        )}
        <p>MAX_IT : {Math.floor(uiState.maxIter)}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => setAutoZoom(!autoZoom)}
          className={`px-3 py-1 text-xs border transition-colors ${
            autoZoom
              ? 'bg-tech-cyan text-tech-black border-tech-cyan'
              : 'border-tech-cyan hover:bg-tech-cyan/20'
          }`}
        >
          [{autoZoom ? 'Stop ' : 'Start '}Auto Scroll]
        </button>

        <button
          onClick={handleCopy}
          className="px-3 py-1 text-xs border border-tech-cyan hover:bg-tech-cyan/20 transition-colors"
        >
          [Copy Coordinates]
        </button>
      </div>
    </div>
  );
}
