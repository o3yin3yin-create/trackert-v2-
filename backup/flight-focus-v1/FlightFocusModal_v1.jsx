        {/* ---------------- FLIGHT FOCUS PAGE (FULL SCREEN) ---------------- */}
        {isFlightFocusOpen && createPortal(
          <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black animate-in fade-in duration-200">
            <div className="min-h-screen w-full max-w-4xl mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { 
                        setIsFlightFocusOpen(false); 
                        if (!isFlightTimerRunning) {
                          setSelectedFlight(null);
                          setFlightDurationFilter(null);
                        }
                      }} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={''} />
                    </button>
                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      <PlaneTakeoff size={24} className="text-cyan-400" /> {t('flightFocus')}
                    </h2>
                  </div>
                  <button 
                    onClick={() => { 
                      setIsFlightFocusOpen(false); 
                      if (!isFlightTimerRunning) {
                        setSelectedFlight(null);
                        setFlightDurationFilter(null);
                      }
                    }} 
                    className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all"
                  >
                    {isFlightTimerRunning ? <ChevronDown size={20} /> : <X size={18} />}
                  </button>
                </div>

              {!selectedFlight && flightDurationFilter === null ? (
                <div className="flex flex-col gap-6 py-6 px-2 animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-sm text-center text-white/60 font-bold tracking-widest uppercase mb-2">
                    {'Ready for a focus flight?'}
                  </p>
                  
                  <div className="flex flex-col items-center gap-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!searchQuery.trim()) return;
                        setIsSearching(true);
                        try {
                          const res = await apiFetch(`/api/flight/search?q=${encodeURIComponent(searchQuery)}`);
                          const data = await res.json();
                          if (data.flight) {
                            setSelectedFlight({ ...data.flight, initialSeconds: data.flight.totalSeconds || data.flight.remainingSeconds });
                            setFlightTimer(data.flight.remainingSeconds);
                            setIsSeatSelectionOpen(true);
                          } else {
                            alert(data.error || 'Flight not found');
                          }
                        } catch (err) {
                          alert('Internet connection required for live flight tracking & radar');
                        }
                        setIsSearching(false);
                      }}
                      className="w-full flex gap-2"
                    >
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={'Flight Number (e.g. EK1)'}
                        className="flex-1 min-w-0 bg-black/40 text-white rounded-2xl px-4 py-4 text-sm font-bold border border-white/10 outline-none focus:border-white/40 uppercase tracking-widest"
                      />
                      <button 
                        type="submit"
                        disabled={isSearching}
                        className="bg-white text-black hover:bg-white/90 px-6 rounded-2xl font-black tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                      >
                        {isSearching ? <Loader2 size={20} className="animate-spin" /> : <PlaneTakeoff size={20} />}
                      </button>
                    </form>

                    <div className="w-full h-[1px] bg-white/10 my-2" />

                    <button
                      onClick={() => {
                        setFlightDurationFilter(0);
                        fetchFlights(0);
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 text-white text-sm font-bold tracking-widest transition-all active:scale-95 shadow-sm border border-white/10 hover:bg-white/10"
                    >
                      <Globe size={18} />
                      {'Browse Live Flights'}
                    </button>
                  </div>
                </div>
              ) : flightLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-white/30" size={32} />
                  <span className="text-xs font-bold tracking-widest text-white/30 uppercase animate-pulse">{t('findingFlights')}</span>
                </div>
              ) : selectedFlight ? (
                <div className="flex flex-col items-center w-full">
                  
                  {/* Route & Airline for portrait small screens only */}
                  <div className="w-full md:hidden landscape:hidden flex flex-col items-center mb-6 px-1">
                    <div className="flex items-center justify-between w-full mb-2 text-center">
                      <span className="text-2xl font-black text-white">{selectedFlight.origin}</span>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-3" />
                      <PlaneTakeoff size={18} color={themeColor} className="animate-pulse rotate-45" />
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-3" />
                      <span className="text-2xl font-black text-white">{selectedFlight.destination}</span>
                    </div>
                    
                    <span className="text-xs font-bold text-white/60 text-center">
                      {selectedFlight.airline} <span className="text-white/20 px-1">|</span> {selectedFlight.callsign}
                    </span>
                    <span className="text-[10px] text-white/30 uppercase font-mono tracking-widest mt-0.5">{selectedFlight.model}</span>
                  </div>

                  {/* TWO COLUMN GRID FOR LANDSCAPE / LAPTOP */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-12 landscape:grid-cols-12 gap-6 items-stretch">
                    
                    {/* LEFT COLUMN: Aviation details & curved path radar */}
                    <div className="col-span-1 md:col-span-6 landscape:col-span-6 flex flex-col justify-between bg-black/20 border border-white/5 p-4 sm:p-5 rounded-3xl shadow-inner">
                      
                      {/* Desktop Route Info (Visible on large screens and landscape mode) */}
                      <div className="hidden md:flex landscape:flex flex-col w-full mb-4">
                        <div className="flex items-center justify-between w-full mb-1 text-center">
                          <span className="text-3xl font-black tracking-tight text-white">{selectedFlight.origin}</span>
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />
                          <PlaneTakeoff size={20} color={themeColor} className="rotate-45" />
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />
                          <span className="text-3xl font-black tracking-tight text-white">{selectedFlight.destination}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 px-1">
                          <span>{t('departure')}</span>
                          <span>{t('arrival')}</span>
                        </div>
                        
                        <div className="text-left bg-black/20 p-3 rounded-xl border border-white/5">
                          <span className="text-xs font-bold text-white/80 block">
                            {selectedFlight.airline} • {selectedFlight.callsign}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono tracking-tight uppercase block mt-0.5">
                            {selectedFlight.model}
                          </span>
                        </div>
                      </div>

                      {/* Curved Aviation Radar or Live Map */}
                      {isMapView ? (
                        (() => {
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
                          
                          let viewBox = "0 0 1000 1000";
                          if (isCameraLocked) {
                            const viewSize = 220;
                            const boxX = planeX - viewSize / 2;
                            const boxY = planeY - viewSize / 2;
                            viewBox = `${boxX} ${boxY} ${viewSize} ${viewSize}`;
                          } else {
                            const minX = Math.min(p0.x, p2.x) - 80;
                            const maxX = Math.max(p0.x, p2.x) + 80;
                            const minY = Math.min(p0.y, p2.y) - 80;
                            const maxY = Math.max(p0.y, p2.y) + 80;
                            const viewW = Math.max(100, maxX - minX);
                            const viewH = Math.max(100, maxY - minY);
                            viewBox = `${minX} ${minY} ${viewW} ${viewH}`;
                          }
                          
                          const timeRemainingSecs = flightTimer;
                          const timeRemainingMin = Math.round(timeRemainingSecs / 60);
                          const timeRemainingStr = timeRemainingMin >= 60 
                            ? `${Math.floor(timeRemainingMin / 60)}h ${timeRemainingMin % 60}m` 
                            : `${timeRemainingMin} min`;
                          
                          const progressRemaining = 1 - progress;
                          const totalDistSim = (p0.x - p2.x) ** 2 + (p0.y - p2.y) ** 2;
                          const distanceSim = Math.round(Math.max(0, Math.sqrt(totalDistSim) * 10 * progressRemaining));
                          
                          return (
                            <div className="w-full relative h-[200px] bg-[#060812] rounded-2xl overflow-hidden border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] select-none mb-4">
                              <MapComponent 
                                originCoords={originCoords} 
                                destCoords={destCoords} 
                                progress={progress} 
                                liveTelemetry={liveTelemetry}
                                isCameraLocked={isCameraLocked} 
                                themeColor="#FFFFFF" 
                                padding={[20, 20]} 
                              />
                              
                              {/* HUD Controls */}
                              <div className="absolute top-3 left-3 flex flex-col gap-2 z-[1000]">
                                <button 
                                  onClick={() => {
                                    if (!isFlightTimerRunning) {
                                      setShowFlightModeAdvice(true);
                                    } else {
                                      setIsFlightTimerRunning(false);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={isFlightTimerRunning ? 'Pause' : 'Play'}
                                >
                                  {isFlightTimerRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} className="ml-0.5" fill="currentColor" />}
                                </button>
                                <button 
                                  onClick={toggleCabinHum}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCabinHumPlaying ? 'bg-white text-black border-white' : 'bg-black/75 text-white border-white/10'}`}
                                  title={'Cabin Noise'}
                                >
                                  {isCabinHumPlaying ? (
                                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                                      <Volume2 size={12} />
                                    </motion.div>
                                  ) : <VolumeX size={12} />}
                                </button>
                                {isCabinHumPlaying && (
                                  <input 
                                    type="range" min="0" max="1" step="0.01" 
                                    value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} 
                                    className="w-16 h-1 bg-black/30 rounded-lg appearance-none cursor-pointer accent-white"
                                  />
                                )}
                              </div>
                              
                              <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
                                <button 
                                  onClick={() => setIsMapView(false)}
                                  className="w-8 h-8 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={'Radar View'}
                                >
                                  <Compass size={12} className="animate-[spin_20s_linear_infinite]" />
                                </button>
                                <button 
                                  onClick={() => setIsCameraLocked(!isCameraLocked)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCameraLocked ? 'bg-white text-black border-white' : 'bg-black/75 text-white border-white/10'}`}
                                  title={'Camera Lock'}
                                >
                                  <Navigation size={12} className={isCameraLocked ? 'fill-current rotate-45' : 'rotate-45'} />
                                </button>
                                <button 
                                  onClick={() => setIsCameraLocked(false)}
                                  className="w-8 h-8 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={'Full Route'}
                                >
                                  <Map size={12} />
                                </button>
                                <button 
                                  onClick={() => { haptic('light'); setIsWindowSeatOpen(true); }} 
                                  className="w-8 h-8 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={'Window Seat'}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="5" /><line x1="5" y1="15" x2="19" y2="15" opacity="0.4" /></svg>
                                </button>
                                <button 
                                  onClick={() => {
                                    haptic('medium');
                                    setIsScreensaverOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={'Screensaver Mode'}
                                >
                                  <Maximize size={12} />
                                </button>
                              </div>
                              
                              {/* HUD Bottom Overlay */}
                              <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end pointer-events-none select-none text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] z-[1000]">
                                <div className="flex flex-col text-left">
                                  <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{'TIME REMAINING'}</span>
                                  <span className="text-xs font-black tracking-tight leading-none">{timeRemainingStr}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{'DISTANCE REMAINING'}</span>
                                  <span className="text-xs font-black tracking-tight leading-none">{distanceSim} km</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="w-full relative py-2 mb-4 bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-center">
                          <div className="absolute top-2.5 right-2.5 z-10 flex gap-2">
                            <button
                              onClick={() => { haptic('light'); setIsWindowSeatOpen(true); }}
                              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 active:scale-95 select-none"
                              title={'Window Seat'}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="5" /><line x1="5" y1="15" x2="19" y2="15" opacity="0.4" /></svg>
                              <span className="hidden sm:inline">{'Window'}</span>
                            </button>
                            <button
                              onClick={() => setIsMapView(true)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 active:scale-95 select-none"
                              title={'Live Map'}
                            >
                              <Map size={11} className="text-white" />
                              <span>{'Live Map'}</span>
                            </button>
                          </div>
                          
                          {/* Bezier Radar Map */}
                          {(() => {
                            const progress = selectedFlight.initialSeconds ? Math.max(0, Math.min(1, (selectedFlight.initialSeconds - flightTimer) / selectedFlight.initialSeconds)) : 0;
                            
                            // Bezier calculator
                            const p0 = { x: 30, y: 65 };
                            const p1 = { x: 150, y: 15 };
                            const p2 = { x: 270, y: 65 };
                            
                            const x = (1 - progress) * (1 - progress) * p0.x + 2 * (1 - progress) * progress * p1.x + progress * progress * p2.x;
                            const y = (1 - progress) * (1 - progress) * p0.y + 2 * (1 - progress) * progress * p1.y + progress * progress * p2.y;
                            
                            const dx = 2 * (1 - progress) * (p1.x - p0.x) + 2 * progress * (p2.x - p1.x);
                            const dy = 2 * (1 - progress) * (p1.y - p0.y) + 2 * progress * (p2.y - p1.y);
                            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                            
                            return (
                              <div className="w-full">
                                <svg viewBox="0 0 300 90" className="w-full h-auto overflow-visible select-none">
                                  <defs>
                                    <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor={themeColor} stopOpacity="0.1" />
                                      <stop offset="100%" stopColor={themeColor} stopOpacity="0.9" />
                                    </linearGradient>
                                  </defs>
                                  
                                  <defs>
                                    <linearGradient id="trailGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={themeColor} stopOpacity="1" />
                                      <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                  
                                  {/* Dashed trajectory */}
                                  <path 
                                    d="M 30 65 Q 150 15 270 65" 
                                    fill="none" 
                                    className="stroke-white/10" 
                                    strokeWidth="1.5" 
                                    strokeDasharray="4 4" 
                                  />
                                  
                                  {/* Covered trail */}
                                  <path 
                                    d="M 30 65 Q 150 15 270 65" 
                                    fill="none" 
                                    stroke="url(#route-grad)" 
                                    strokeWidth="2.5" 
                                    strokeDasharray="250" 
                                    strokeDashoffset={250 * (1 - progress)}
                                    className="transition-all duration-1000 ease-linear"
                                  />
                                  
                                  {/* Origin Node */}
                                  <g transform="translate(30, 65)">
                                    <circle r="5" style={{ fill: `${themeColor}33` }} />
                                    <circle r="2.5" style={{ fill: themeColor }} className="animate-pulse" />
                                    <circle r="7" style={{ stroke: themeColor, opacity: 0.4 }} className="fill-none stroke-1 animate-ping" />
                                  </g>
                                  
                                  {/* Destination Node */}
                                  <g transform="translate(270, 65)">
                                    <circle r="5" className="fill-white/10" />
                                    <circle r="2.5" className="fill-white/40" />
                                  </g>
                                  
                                  {/* Flying Jet */}
                                  <g transform={`translate(${x}, ${y}) rotate(${angle + 90})`} className="transition-all duration-1000 ease-linear">
                                    <path 
                                      d="M 0,-8 L 1.6,-6.4 L 1.6,-2.4 L 8,1.6 L 8,3.2 L 1.6,1.6 L 1.6,6.4 L 4,8 L 4,8.8 L 0,8 L -4,8.8 L -4,8 L -1.6,6.4 L -1.6,1.6 L -8,3.2 L -8,1.6 L -1.6,-2.4 L -1.6,-6.4 Z" 
                                      fill={themeColor} 
                                      stroke={themeColor} 
                                      strokeWidth="0.3" 
                                    />
                                      {/* Motion Blur Trail */}
                                      <ellipse 
                                        cx="0" 
                                        cy="8" 
                                        rx="2" 
                                        ry="15" 
                                        fill={`url(#trailGradient)`} 
                                        opacity="0.6"
                                        style={{ filter: 'blur(2px)' }}
                                      />
                                    </g>
                                </svg>
                                
                                <div className="flex justify-between items-center mt-1 px-1 text-[9px] font-mono text-white/30 uppercase tracking-widest font-black">
                                  <span>{selectedFlight.origin}</span>
                                  <span className="font-bold" style={{ color: themeColor }}>{Math.round(progress * 100)}% {'completed'}</span>
                                  <span>{selectedFlight.destination}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Aviation simulated telemetry details */}
                      {(() => {
                        const progress = selectedFlight.initialSeconds ? Math.max(0, Math.min(1, (selectedFlight.initialSeconds - flightTimer) / selectedFlight.initialSeconds)) : 0;
                        const { altitude, speed } = getTelemetry(progress);
                        
                        return (
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/40 border-t border-white/5 pt-3">
                            <div className="flex flex-col">
                              <span>{'ALTITUDE:'}</span>
                              <span className="font-black text-white/80">{altitude.toLocaleString()} FT</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span>{'SPEED:'}</span>
                              <span className="font-black text-white/80">{speed} KTS</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* RIGHT COLUMN: Futuristic glowing digital chronograph & control actions */}
                    <div className="col-span-1 md:col-span-6 landscape:col-span-6 flex flex-col justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-black/20 border border-white/5 shadow-inner">
                      
                      {/* Top status header for timer column */}
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40 px-1 select-none">
                        <span>{'FLIGHT STATUS:'}</span>
                        {isFlightTimerRunning ? (
                          <span className="text-white flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            {'FOCUS ACTIVE'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-bold animate-pulse" style={{ color: themeColor }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                            {'EN ROUTE'}
                          </span>
                        )}
                      </div>

                      {/* Futuristic Digital Cockpit Chronograph */}
                      <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl w-full relative mb-4">
                         <span className="text-[9px] uppercase tracking-widest font-black mb-4 flex items-center gap-1.5 select-none" style={{ color: `${themeColor}cc` }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                            {t('remainingTime')}
                         </span>
                         
                         <MinimalTimer 
                           timeSeconds={flightTimer} 
                           totalSeconds={selectedFlight?.initialSeconds || 0} 
                           themeColor={themeColor} 
                           size="md" 
                         />
                         
                         <div className="flex justify-between w-full mt-6 text-[9px] font-mono text-white/30 uppercase tracking-widest px-1">
                            <span>SYS: ACTIVE</span>
                            <span>ETA: {new Date(selectedFlight.estimatedArrival * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                      </div>

                      {/* Action buttons */}
                      {flightTimer > 0 ? (
                        <div className="flex justify-center w-full mt-2">
                          {!isFlightTimerRunning ? (
                            <button 
                              onClick={() => setShowFlightModeAdvice(true)}
                              className="px-6 py-3 rounded-2xl font-bold tracking-widest transition-colors active:scale-95 shadow-xl w-full" style={{ backgroundColor: themeColor, color: '#000', border: `1px solid ${themeColor}`, boxShadow: `0 8px 24px ${themeColor}33` }}
                            >
                              {t('startFocus')}
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setIsFlightTimerRunning(false);
                                setSelectedFlight(null);
                                // Go back to flight list, not exit completely
                              }}
                              className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl font-bold tracking-widest hover:bg-red-500/20 transition-colors active:scale-95 shadow-xl w-full"
                            >
                              {t('giveUp')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-white font-bold tracking-widest uppercase text-sm text-center animate-pulse mt-4 w-full">{t('landed')}</span>
                      )}

                    </div>

                  </div>

                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{t('flightFocus')}</span>
                    <button 
                      onClick={() => {
                        setFlightDurationFilter(null);
                        setFlightOptions([]);
                      }}
                      className="text-xs font-bold text-white/50 hover:text-white transition-colors"
                    >
                      {'New Search'}
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-2 w-full">
                    {flightOptions.map((f, i) => (
                      <div key={i} onClick={() => { 
                        const liveRemaining = f.estimatedArrival - Math.floor(Date.now() / 1000);
                        setSelectedFlight({...f, initialSeconds: f.totalSeconds || liveRemaining}); 
                        setFlightTimer(Math.max(0, liveRemaining)); 
                        setIsSeatSelectionOpen(true);
                      }} className="bg-black/30 border border-white/5 p-4 rounded-2xl cursor-pointer hover:bg-black/50 transition-colors active:scale-95 shrink-0">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm flex items-center gap-2 text-white">
                            {f.airline}
                            <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50">{f.callsign}</span>
                          </span>
                          <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2 py-1 rounded-md">
                            {Math.floor(Math.floor(f.remainingSeconds / 60) / 60) > 0 ? `${Math.floor(Math.floor(f.remainingSeconds / 60) / 60)}h ` : ''}{Math.floor(f.remainingSeconds / 60) % 60}m
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-white/50 text-sm font-semibold">
                          <span>{f.origin}</span>
                          <PlaneTakeoff size={14} className="text-white/30" />
                          <span>{f.destination}</span>
                        </div>
                      </div>
                    ))}
                    {flightOptions.length === 0 && (
                        <div className="text-center py-10 flex flex-col items-center gap-3">
                          <span className="text-sm font-bold text-red-400/80">{'No flights found'}</span>
                          <button 
                            onClick={() => {
                              fetchFlights(0);
                            }}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"
                          >
                            {'Try Again'}
                          </button>
                        </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>, document.body
        )}
