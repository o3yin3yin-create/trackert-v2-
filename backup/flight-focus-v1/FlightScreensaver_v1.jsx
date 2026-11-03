          )}

          {/* --- AMBIENT FLIGHT FOCUS SCREENSAVER --- */}
          {isScreensaverOpen && selectedFlight && createPortal(
            <div style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              display: 'flex', flexDirection: 'column',
              background: '#05070e',
              color: '#ffffff',
              overflow: 'hidden',
              userSelect: 'none'
            }}>
              {/* Fullscreen scrolling vector map */}
              {(() => {
                const originCoords = (selectedFlight.originCoords?.lat && selectedFlight.originCoords?.lng) ? selectedFlight.originCoords : getAirportCoords(selectedFlight.origin);
                const destCoords = (selectedFlight.destCoords?.lat && selectedFlight.destCoords?.lng) ? selectedFlight.destCoords : getAirportCoords(selectedFlight.destination);
                const p0 = projectCoords(originCoords.lat, originCoords.lng);
                const p2 = projectCoords(destCoords.lat, destCoords.lng);
                
                const p1 = {
                  x: (p0.x + p2.x) / 2 + (p2.y - p0.y) * 0.12,
                  y: (p0.y + p2.y) / 2 - (p2.x - p0.x) * 0.12
                };
                
                const progress = selectedFlight.initialSeconds ? Math.max(0, Math.min(1, (selectedFlight.initialSeconds - flightTimer) / selectedFlight.initialSeconds)) : 0;
                const { x: planeX, y: planeY, angle } = getQuadraticBezierPoint(p0, p1, p2, progress);
                const { altitude, speed } = getTelemetry(progress);
                
                let viewBox = "0 0 1000 1000";
                if (isCameraLocked) {
                  const viewSize = 180; // beautiful cinematic zoom in screensaver
                  const boxX = planeX - viewSize / 2;
                  const boxY = planeY - viewSize / 2;
                  viewBox = `${boxX} ${boxY} ${viewSize} ${viewSize}`;
                } else {
                  const minX = Math.min(p0.x, p2.x) - 120;
                  const maxX = Math.max(p0.x, p2.x) + 120;
                  const minY = Math.min(p0.y, p2.y) - 120;
                  const maxY = Math.max(p0.y, p2.y) + 120;
                  const viewW = Math.max(100, maxX - minX);
                  const viewH = Math.max(100, maxY - minY);
                  viewBox = `${minX} ${minY} ${viewW} ${viewH}`;
                }
                
                const progressRemaining = 1 - progress;
                const totalDistSim = (p0.x - p2.x) ** 2 + (p0.y - p2.y) ** 2;
                const distanceSim = Math.round(Math.max(0, Math.sqrt(totalDistSim) * 10 * progressRemaining));
                
                return (
                  <>
                    <div className="absolute inset-0 w-full h-full z-0">
                      <MapComponent 
                        originCoords={originCoords} 
                        destCoords={destCoords} 
                        progress={progress} 
                        liveTelemetry={liveTelemetry}
                        isCameraLocked={isCameraLocked} 
                        themeColor={themeColor} 
                        padding={[50, 50]} 
                      />
                    </div>
                    
                    {/* Cinematic Top Ambient HUD bar */}
                    <div className="absolute top-0 left-0 w-full p-8 bg-gradient-to-b from-[#03060c] via-[#03060c]/80 to-transparent flex flex-col items-center justify-center gap-3 z-10 select-none">
                      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-xl shadow-lg">
                        <span className="text-xs font-black tracking-widest text-white font-mono">{selectedFlight.origin}</span>
                        <PlaneTakeoff size={14} className="text-white/40 animate-pulse rotate-45" />
                        <span className="text-xs font-black tracking-widest text-white font-mono">{selectedFlight.destination}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-1" />
                      </div>
                      
                      {/* HUGE tabular figures digital clock */}
                      <div className="py-4">
                        <MinimalTimer 
                          timeSeconds={flightTimer} 
                          totalSeconds={selectedFlight?.initialSeconds || 0} 
                          themeColor={themeColor} 
                          size="lg" 
                        />
                      </div>
                      
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest font-black flex items-center gap-1.5 mt-1">
                        <span>{selectedFlight.airline} • {selectedFlight.callsign}</span>
                        <span>•</span>
                        <span>{selectedFlight.model}</span>
                      </div>
                    </div>
                    
                    {/* Screensaver Unified Settings Popup & Controls */}
                    <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30 flex items-center gap-3">
                      {/* SlidersHorizontal Options Trigger Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHudMenuOpen(!isHudMenuOpen);
                        }}
                        className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border shadow-2xl backdrop-blur-xl active:scale-95 transition-all select-none duration-300 ${isHudMenuOpen ? 'bg-white text-black border-white' : 'bg-black/60 text-white border-white/15 hover:bg-black/80'}`}
                        title={'Screensaver Options'}
                      >
                        <SlidersHorizontal size={18} className={isHudMenuOpen ? 'text-black' : 'text-white'} />
                      </button>

                      {/* HUD Popup List */}
                      {isHudMenuOpen && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-14 w-64 bg-black/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-3 shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-200"
                        >
                          {/* 1. Camera Lock Option */}
                          <button
                            onClick={() => setIsCameraLocked(!isCameraLocked)}
                            className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors text-left text-xs font-bold text-white/90"
                          >
                            <div className="flex items-center gap-3">
                              <Navigation size={16} className={`rotate-45 ${isCameraLocked ? 'text-white' : 'text-white/40'}`} />
                              <span>{'Camera Lock'}</span>
                            </div>
                            <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md ${isCameraLocked ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                              {isCameraLocked ? 'ON' : 'OFF'}
                            </span>
                          </button>

                          {/* 2. Audio Toggle & Slider Option */}
                          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-xs font-bold text-white/90">
                              <button 
                                onClick={toggleCabinHum}
                                className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                              >
                                {isCabinHumPlaying ? <Volume2 size={16} className="text-white" /> : <VolumeX size={16} className="text-white/40" />}
                                <span>{'Cabin Audio'}</span>
                              </button>
                              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md ${isCabinHumPlaying ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                                {isCabinHumPlaying ? `${Math.round(audioVolume * 100)}%` : 'OFF'}
                              </span>
                            </div>
                            {isCabinHumPlaying && (
                              <input 
                                type="range" min="0" max="1" step="0.01" 
                                value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} 
                                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white mt-1"
                              />
                            )}
                          </div>

                          {/* 3. Window Seat Screensaver */}
                          <button
                            onClick={() => { setIsHudMenuOpen(false); setIsWindowSeatOpen(true); }}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition-colors text-left text-xs font-bold text-white/90"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect x="5" y="3" width="14" height="18" rx="5" /><line x1="5" y1="15" x2="19" y2="15" opacity="0.4" /></svg>