import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Map as MapIcon, 
  MapPin,
  List,
  Signal,
  Activity,
  RefreshCw,
  CheckCircle2,
  Briefcase,
  BookOpen,
  Clock,
  Loader2,
  CheckCircle,
  RotateCcw,
  X,
  Save,
  FolderSync,
  AlertCircle,
  Package,
  ShieldCheck,
  Unlock,
  Database,
  HardDrive,
  Wifi,
  WifiOff
} from 'lucide-react';
import { SiteSurvey, PoleSurvey, LocationState } from './types';
import { MapOverlay } from './components/MapOverlay';
import { PoleEditor } from './components/PoleEditor';
import { AboutPage } from './components/AboutPage';
import { CodeGeneratorPage } from './components/CodeGeneratorPage';
import { ActivationOverlay } from './components/ActivationOverlay';
import { exportProjectToDirectory } from './services/kmzService';
import { getSubscriptionStatus } from './services/authService';
import { saveState, getState, clearState, requestPersistentStorage, getStorageHealth, StorageEstimate } from './services/dbService';

const STORAGE_KEY = 'osp_survey_pro_v4_state';

// WebView detection helper
const isAndroidWebView = (): boolean => {
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /wv|Version\/\d+\.\d+/i.test(ua);
};

const App: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const initialLoadDone = useRef(false);
  const skipNextUnsaved = useRef(false);
  const surveyRef = useRef<SiteSurvey | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Cleanup all abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllers.current.forEach(controller => controller.abort());
      abortControllers.current.clear();
    };
  }, []);

  const createNewProject = (): SiteSurvey => ({
    id: crypto.randomUUID(),
    siteName: 'ACTIVE OSP PROJECT',
    companyName: 'FIELD OPERATIONS',
    groupName: 'SURVEY GROUP 1',
    poles: []
  });

  const [survey, setSurvey] = useState<SiteSurvey>(createNewProject());
  const [selectedPoleId, setSelectedPoleId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileSuccess, setCompileSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showAbout, setShowAbout] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [isPersistent, setIsPersistent] = useState(false);
  const [storageHealth, setStorageHealth] = useState<StorageEstimate | null>(null);
  
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Store current survey in ref for cleanup
  useEffect(() => {
    surveyRef.current = survey;
  }, [survey]);

  // Monitor connectivity with cleanup
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshSubscriptionStatus = useCallback(async () => {
    const controllerId = 'subscription';
    const controller = new AbortController();
    abortControllers.current.set(controllerId, controller);
    
    try {
      const status = await getSubscriptionStatus();
      if (!controller.signal.aborted) {
        setIsSubscribed(status.active);
        setDaysRemaining(status.daysLeft);
        setCheckingAuth(false);
      }
    } catch (error) {
      if (!controller.signal.aborted && error.name !== 'AbortError') {
        console.error('Subscription check error:', error);
      }
    } finally {
      abortControllers.current.delete(controllerId);
    }
  }, []);

  const refreshStorageInfo = useCallback(async () => {
    const controllerId = 'storage';
    const controller = new AbortController();
    abortControllers.current.set(controllerId, controller);
    
    try {
      const health = await getStorageHealth();
      if (!controller.signal.aborted) {
        setStorageHealth(health);
      }
    } catch (error) {
      if (!controller.signal.aborted && error.name !== 'AbortError') {
        console.error('Storage health check error:', error);
      }
    } finally {
      abortControllers.current.delete(controllerId);
    }
  }, []);

  // Initialization with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let storageInterval: NodeJS.Timeout;
    let subscriptionCheckTimeout: NodeJS.Timeout;
    
    const init = async () => {
      if (!isMounted) return;
      
      try {
        // Sequential loading to prevent race conditions
        await refreshSubscriptionStatus();
        const persistent = await requestPersistentStorage();
        if (isMounted) setIsPersistent(persistent);
        await refreshStorageInfo();
        
        // WebView: less frequent polling
        storageInterval = setInterval(() => {
          if (isMounted) refreshStorageInfo();
        }, isAndroidWebView() ? 60000 : 30000); // 60s for WebView, 30s for browser
        
        // Check subscription less frequently
        subscriptionCheckTimeout = setTimeout(() => {
          if (isMounted) refreshSubscriptionStatus();
        }, 5 * 60 * 1000);
        
      } catch (error) {
        if (isMounted && error.name !== 'AbortError') {
          console.error('Initialization error:', error);
        }
      }
    };
    
    init();
    
    return () => {
      isMounted = false;
      clearInterval(storageInterval);
      clearTimeout(subscriptionCheckTimeout);
    };
  }, [refreshSubscriptionStatus, refreshStorageInfo]);

  // Load initial data with cleanup
  useEffect(() => {
    let isMounted = true;
    const controllerId = 'initialLoad';
    const controller = new AbortController();
    abortControllers.current.set(controllerId, controller);
    
    const loadFromDB = async () => {
      try {
        const saved = await getState(STORAGE_KEY);
        if (!controller.signal.aborted && isMounted && saved && saved.id) {
          skipNextUnsaved.current = true;
          setSurvey(saved);
          setSaveStatus('saved');
        }
      } catch (e) {
        if (!controller.signal.aborted && isMounted && e.name !== 'AbortError') {
          console.error("Storage Load Error:", e);
        }
      } finally {
        if (isMounted) {
          initialLoadDone.current = true;
        }
      }
    };
    
    loadFromDB();
    
    return () => {
      isMounted = false;
      controller.abort();
      abortControllers.current.delete(controllerId);
    };
  }, []);

  // Auto-save with proper debounce and cleanup
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (skipNextUnsaved.current) {
      skipNextUnsaved.current = false;
      return;
    }
    
    let isMounted = true;
    let saveTimeout: NodeJS.Timeout;
    const controllerId = 'autoSave';
    const controller = new AbortController();
    abortControllers.current.set(controllerId, controller);
    
    const performSave = async () => {
      if (!isMounted || controller.signal.aborted) return;
      
      setSaveStatus('saving');
      
      try {
        // Add timeout for WebView
        const savePromise = saveState(STORAGE_KEY, survey);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Save timeout')), 8000);
        });
        
        await Promise.race([savePromise, timeoutPromise]);
        
        if (!controller.signal.aborted && isMounted) {
          setSaveStatus('saved');
          // Delay storage refresh to batch operations
          setTimeout(() => {
            if (isMounted && !controller.signal.aborted) {
              refreshStorageInfo();
            }
          }, 2000);
        }
      } catch (error: any) {
        if (!controller.signal.aborted && isMounted && error.name !== 'AbortError') {
          console.error("Local Save Error:", error);
          setSaveStatus('unsaved');
        }
      }
    };
    
    // Debounce save - longer for WebView
    saveTimeout = setTimeout(performSave, isAndroidWebView() ? 2000 : 1000);
    
    return () => {
      isMounted = false;
      clearTimeout(saveTimeout);
      controller.abort();
      abortControllers.current.delete(controllerId);
    };
  }, [survey, refreshStorageInfo]);

  // Beforeunload handler
  useEffect(() => {
    const handleUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus !== 'saved' && surveyRef.current) {
        // Don't block, just attempt save
        saveState(STORAGE_KEY, surveyRef.current).catch(() => {
          // Silent fail on unload
        });
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [saveStatus]);

  // Geolocation with WebView optimizations
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    let isMounted = true;
    const controllerId = 'geolocation';
    const controller = new AbortController();
    abortControllers.current.set(controllerId, controller);
    
    let watchId: number | null = null;
    
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isMounted && !controller.signal.aborted) {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude || undefined
            });
          }
        },
        (err) => {
          if (isMounted && !controller.signal.aborted && err.code !== err.TIMEOUT) {
            console.error("GPS Error:", err);
          }
        },
        { 
          enableHighAccuracy: isAndroidWebView() ? false : true, // Critical for WebView!
          maximumAge: isAndroidWebView() ? 60000 : 30000, // 60s cache for WebView
          timeout: isAndroidWebView() ? 15000 : 10000 // 15s timeout for WebView
        }
      );
    } catch (error) {
      if (isMounted && !controller.signal.aborted) {
        console.error('Geolocation setup error:', error);
      }
    }
    
    return () => {
      isMounted = false;
      controller.abort();
      abortControllers.current.delete(controllerId);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const addPole = useCallback((lat: number, lng: number, altitude?: number) => {
    if (isNaN(lat) || !isFinite(lat)) return;
    const newId = crypto.randomUUID();
    setSurvey(prev => ({
      ...prev,
      poles: [...prev.poles, {
        id: newId,
        name: `POLE-${(prev.poles.length + 1).toString().padStart(3, '0')}`,
        latitude: lat,
        longitude: lng,
        altitude: altitude,
        timestamp: new Date().toISOString(),
        photos: [],
        notes: ''
      }]
    }));
    setSelectedPoleId(newId);
  }, []);

  const updatePole = (id: string, updates: Partial<PoleSurvey>) => {
    setSurvey(prev => ({
      ...prev,
      poles: prev.poles.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const updateMultiplePoles = (poleUpdates: { id: string, updates: Partial<PoleSurvey> }[]) => {
    setSurvey(prev => {
      const newPoles = [...prev.poles];
      poleUpdates.forEach(({ id, updates }) => {
        const idx = newPoles.findIndex(p => p.id === id);
        if (idx !== -1) {
          newPoles[idx] = { ...newPoles[idx], ...updates };
        }
      });
      return { ...prev, poles: newPoles };
    });
  };

  const deletePoles = useCallback((ids: string[]) => {
    setSurvey(prev => ({ ...prev, poles: prev.poles.filter(p => !ids.includes(p.id)) }));
    if (selectedPoleId && ids.includes(selectedPoleId)) {
      setSelectedPoleId(null);
    }
  }, [selectedPoleId]);

  const handleProjectExport = useCallback(async () => {
    if (!isSubscribed) {
      setShowActivation(true);
      return;
    }
    
    if (survey.poles.length === 0) {
      alert('No data to export.');
      return;
    }
    
    const controllerId = 'export';
    const controller = new AbortController();
    abortControllers.current.set(controllerId, controller);
    
    setIsCompiling(true);
    let successTimeout: NodeJS.Timeout;
    let cleanupTimeout: NodeJS.Timeout;
    
    try {
      // Pass abort signal to the export service
      await exportProjectToDirectory(survey, controller.signal);
      
      if (!controller.signal.aborted) {
        setCompileSuccess(true);
        
        // Show success message
        successTimeout = setTimeout(() => {
          if (!controller.signal.aborted) {
            alert('Sync Successful!\nProject package written to local storage.');
          }
        }, 500);
        
        // Auto cleanup after 3 seconds
        cleanupTimeout = setTimeout(() => {
          if (!controller.signal.aborted) {
            setIsCompiling(false);
            setCompileSuccess(false);
          }
        }, 3000);
      }
      
    } catch (err: any) { 
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      
      console.error("Export Error:", err);
      alert('Sync Failed: ' + (err.message || 'Check storage permissions.')); 
      
    } finally { 
      // Cleanup
      abortControllers.current.delete(controllerId);
      clearTimeout(successTimeout);
      clearTimeout(cleanupTimeout);
    }
    
    // Ensure cleanup on unmount
    return () => {
      controller.abort();
      clearTimeout(successTimeout);
      clearTimeout(cleanupTimeout);
      setIsCompiling(false);
      setCompileSuccess(false);
    };
  }, [isSubscribed, survey]);

  // Loading screen
  if (checkingAuth) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 text-center px-8">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      <span className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.4em]">Initializing Core...</span>
    </div>
  );

  const selectedPole = survey.poles.find(p => p.id === selectedPoleId);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-sans">
      {/* Compiling/Resetting Overlay */}
      {(isCompiling || isResetting) && (
        <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="w-24 h-24 mb-10">
            <div className={`w-full h-full rounded-[36px] flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-colors duration-500 ${compileSuccess ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              {compileSuccess ? <CheckCircle className="w-12 h-12 text-white" /> : <Package className="w-12 h-12 text-white animate-bounce" />}
            </div>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-3">
            {isResetting ? 'PURGING DISK' : compileSuccess ? 'SYNC COMPLETE' : 'COMPILING ARCHIVE'}
          </h2>
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em]">
            {isResetting ? 'Clearing cache...' : compileSuccess ? 'Binary data written' : 'Building project package...'}
          </p>
        </div>
      )}

      {/* Activation Overlay */}
      {showActivation && (
        <ActivationOverlay 
          onActivated={() => { 
            refreshSubscriptionStatus(); 
            setShowActivation(false); 
          }} 
          onOpenGenerator={() => setShowGenerator(true)} 
          onClose={() => setShowActivation(false)}
        />
      )}

      {/* Code Generator */}
      {showGenerator && <CodeGeneratorPage onClose={() => setShowGenerator(false)} />}
      
      {/* About Page */}
      {showAbout && (
        <div className="fixed inset-0 z-[9500] bg-white overflow-y-auto pt-[env(safe-area-inset-top)]">
           <AboutPage onClose={() => setShowAbout(false)} />
        </div>
      )}

      {/* Top Status Bar */}
      <div className="bg-slate-900 text-white px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] z-[6000] border-b app-border-dark shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Activity className="w-3.5 h-3.5" />
            <span>OSP PRO</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
            {isOnline ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Wifi className="w-3 h-3" />
                <span>LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-500">
                <WifiOff className="w-3 h-3" />
                <span>OFFLINE</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`hidden lg:flex items-center gap-1.5 ${storageHealth && storageHealth.percent > 90 ? 'text-rose-500' : 'text-slate-500'}`}>
            <HardDrive className="w-3 h-3" />
            <span>{storageHealth ? `${(storageHealth.usage / (1024 * 1024 * 1024)).toFixed(1)}GB` : '--'}</span>
          </div>
          <div className={`flex items-center gap-1.5 ${isSubscribed ? 'text-emerald-400' : 'text-amber-500'}`}>
            {isSubscribed ? <ShieldCheck className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{isSubscribed ? `${daysRemaining}D` : 'FREE'}</span>
          </div>
          <div className={`flex items-center gap-1.5 ${userLocation ? 'text-blue-400' : 'text-red-500 animate-pulse'}`}>
            <Signal className="w-3.5 h-3.5" />
            <span>GPS {userLocation ? 'OK' : '...'}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="h-16 bg-white border-b app-border-light px-4 flex items-center justify-between shrink-0 z-[5000] shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
             <MapPin className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <input 
              value={survey.siteName} 
              onChange={(e) => setSurvey({...survey, siteName: e.target.value.toUpperCase()})} 
              className="text-xs font-black text-slate-800 bg-transparent border-none focus:ring-0 p-0 truncate uppercase leading-tight" 
              placeholder="PROJECT NAME" 
            />
            <div className="flex items-center gap-1.5 mt-0.5">
              <input 
                value={survey.companyName || ''} 
                onChange={(e) => setSurvey({...survey, companyName: e.target.value.toUpperCase()})} 
                className="text-[9px] font-black text-indigo-500 bg-transparent border-none focus:ring-0 p-0 truncate uppercase tracking-wider" 
                placeholder="OPERATIONS UNIT" 
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleProjectExport} 
            disabled={isCompiling} 
            className={`px-4 py-2.5 rounded-xl text-[9px] font-black tracking-widest flex items-center gap-2 btn-active shadow-md disabled:opacity-50 transition-colors
              ${isSubscribed ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}
            `}
          >
            {isSubscribed ? <FolderSync className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5 text-white" />}
            <span className="hidden sm:inline">{isSubscribed ? 'SYNC' : 'UNLOCK'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`absolute inset-y-0 left-0 z-[4500] w-full md:w-96 bg-white border-r app-border-light flex flex-col transition-all duration-300 ${viewMode === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0 shadow-2xl md:shadow-none'}`}>
          <div className="p-6 flex flex-col border-b app-border-light bg-slate-50/50">
            <h2 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Field Inventory</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{survey.poles.length} Poles Logged</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {survey.poles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-8 opacity-40 px-10">
                <MapPin className="w-20 h-20" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-center leading-loose">Tap satellite map to add survey points</p>
              </div>
            ) : survey.poles.map((p) => (
              <button 
                key={p.id} 
                onClick={() => { setSelectedPoleId(p.id); setViewMode('map'); }} 
                className={`w-full p-5 rounded-[32px] text-left flex items-center gap-5 border transition-all btn-active ${selectedPoleId === p.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-white border-slate-100 shadow-sm'}`}
              >
                <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border-2 border-slate-200">
                  {p.photos?.[0] ? <img src={p.photos[0].thumbnail} className="w-full h-full object-cover" /> : <MapPin className="w-7 h-7 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base truncate uppercase tracking-tighter text-slate-800">{p.name}</p>
                  <p className="text-[10px] text-slate-400 monospaced font-bold mt-1.5">{p.latitude.toFixed(7)}, {p.longitude.toFixed(7)}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="flex-1 relative bg-slate-100 overflow-hidden">
          {!isResetting && (
            <MapOverlay 
              poles={survey.poles} 
              onMapClick={addPole} 
              onPoleUpdate={updatePole} 
              onMultiplePoleUpdate={updateMultiplePoles}
              onPolesDelete={deletePoles} 
              selectedPoleId={selectedPoleId || undefined} 
              userLocation={userLocation} 
              isActive={viewMode === 'map' && !selectedPoleId}
            />
          )}
        </main>

        {/* Pole Editor Modal */}
        {selectedPoleId && selectedPole && (
          <div className="fixed inset-0 z-[5500] bg-slate-900/70 backdrop-blur-md flex items-end justify-center md:items-center">
            <div className="w-full h-[96vh] md:h-auto md:max-h-[88vh] md:w-[540px] bg-white bottom-sheet md:rounded-[48px] shadow-2xl overflow-hidden animate-slide-up">
              <PoleEditor 
                pole={selectedPole} 
                siteName={survey.siteName} 
                companyName={survey.companyName || 'FIELD OPERATIONS'} 
                onUpdate={(updates) => updatePole(selectedPoleId, updates)} 
                onDelete={() => deletePoles([selectedPoleId])} 
                onClose={() => setSelectedPoleId(null)} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t app-border-light flex items-center justify-around px-6 z-[4900] pb-[env(safe-area-inset-bottom)] h-[calc(5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgba(0,0,0,0.03)] shrink-0">
        <button onClick={() => setViewMode('map')} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${viewMode === 'map' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}>
          <MapIcon className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Map</span>
        </button>
        <button onClick={() => setViewMode('list')} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${viewMode === 'list' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}>
          <List className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Inventory</span>
        </button>
        <button onClick={() => setShowAbout(true)} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${showAbout ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}>
          <BookOpen className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Manual</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
