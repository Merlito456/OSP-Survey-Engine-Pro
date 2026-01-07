
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
  WifiOff,
  MapPinned
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

const App: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const initialLoadDone = useRef(false);
  const skipNextUnsaved = useRef(false);
  const surveyRef = useRef<SiteSurvey | null>(null);

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
  const [locationError, setLocationError] = useState<string | null>(null);
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

  useEffect(() => {
    surveyRef.current = survey;
  }, [survey]);

  // Monitor connectivity
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
    const status = await getSubscriptionStatus();
    setIsSubscribed(status.active);
    setDaysRemaining(status.daysLeft);
    setCheckingAuth(false);
  }, []);

  const refreshStorageInfo = useCallback(async () => {
    const health = await getStorageHealth();
    setStorageHealth(health);
  }, []);

  useEffect(() => {
    refreshSubscriptionStatus();
    requestPersistentStorage().then(setIsPersistent);
    refreshStorageInfo();
    const storageInterval = setInterval(refreshStorageInfo, 10000);
    return () => clearInterval(storageInterval);
  }, [refreshSubscriptionStatus, refreshStorageInfo]);

  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const saved = await getState(STORAGE_KEY);
        if (saved && saved.id) {
          skipNextUnsaved.current = true;
          setSurvey(saved);
          setSaveStatus('saved');
        }
      } catch (e) {
        console.error("Storage Load Error:", e);
      } finally {
        initialLoadDone.current = true;
      }
    };
    loadFromDB();
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) {
      if (skipNextUnsaved.current) {
        skipNextUnsaved.current = false;
        return;
      }
      setSaveStatus('unsaved');
      const timeout = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await saveState(STORAGE_KEY, survey);
          setSaveStatus('saved');
          refreshStorageInfo();
        } catch (e) {
          console.error("Local Save Error:", e);
          setSaveStatus('unsaved');
        }
      }, 400); 
      return () => clearTimeout(timeout);
    }
  }, [survey, refreshStorageInfo]);

  useEffect(() => {
    const handleUnload = () => {
      if (saveStatus !== 'saved' && surveyRef.current) {
        saveState(STORAGE_KEY, surveyRef.current);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [saveStatus]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation unsupported');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationError(null);
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude || undefined
        });
      },
      (err) => {
        console.error("GPS Error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('GPS BLOCKED');
        } else {
          setLocationError('GPS SIGNAL LOST');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
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

  const handleProjectExport = async () => {
    if (!isSubscribed) {
      setShowActivation(true);
      return;
    }
    if (survey.poles.length === 0) return alert('No data to export.');
    
    setIsCompiling(true);
    try {
      await exportProjectToDirectory(survey);
      setCompileSuccess(true);
      setTimeout(() => {
        alert('Sync Successful!\nProject package written to local storage.');
      }, 500);
    } catch (err: any) { 
      console.error("Export Error:", err);
      if (err.name === 'AbortError') return;
      alert('Sync Failed: ' + (err.message || 'Check storage permissions.')); 
    } finally { 
      setTimeout(() => { setIsCompiling(false); setCompileSuccess(false); }, 3000); 
    }
  };

  if (checkingAuth) return (
    <div className="h-full bg-slate-900 flex flex-col items-center justify-center gap-6 text-center px-8">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      <span className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.4em]">Initializing Core...</span>
    </div>
  );

  const selectedPole = survey.poles.find(p => p.id === selectedPoleId);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-slate-900 font-sans">
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

      {showActivation && (
        <ActivationOverlay 
          onActivated={() => { refreshSubscriptionStatus(); setShowActivation(false); }} 
          onOpenGenerator={() => setShowGenerator(true)} 
          onClose={() => setShowActivation(false)}
        />
      )}

      {showGenerator && <CodeGeneratorPage onClose={() => setShowGenerator(false)} />}
      
      {showAbout && (
        <div className="fixed inset-0 z-[9500] bg-white overflow-y-auto pt-[env(safe-area-inset-top)]">
           <AboutPage onClose={() => setShowAbout(false)} />
        </div>
      )}

      <div className="bg-slate-900 text-white px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] z-[6000] border-b app-border-dark shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-indigo-400"><Activity className="w-3.5 h-3.5" /><span>OSP PRO</span></div>
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
          <div className={`flex items-center gap-1.5 ${locationError ? 'text-rose-500 animate-pulse' : (userLocation ? 'text-blue-400' : 'text-slate-500')}`}>
            {locationError ? <AlertCircle className="w-3.5 h-3.5" /> : <Signal className="w-3.5 h-3.5" />}
            <span>{locationError || (userLocation ? 'GPS OK' : 'GPS ...')}</span>
          </div>
        </div>
      </div>

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

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`absolute inset-y-0 left-0 z-[4500] w-full md:w-96 bg-white border-r app-border-light flex flex-col transition-all duration-300 ${viewMode === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0 shadow-2xl md:shadow-none'}`}>
          <div className="p-6 flex flex-col border-b app-border-light bg-slate-50/50">
            <h2 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Field Inventory</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{survey.poles.length} Poles Logged</p>
          </div>
          
          <div className="flex-1 scroll-container overflow-y-auto p-4 space-y-4">
            {survey.poles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-8 opacity-40 px-10">
                <MapPinned className="w-20 h-20" />
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

        {selectedPoleId && selectedPole && (
          <div className="fixed inset-0 z-[5500] bg-slate-900/70 backdrop-blur-md flex items-end justify-center md:items-center">
            <div className="w-full h-[96dvh] md:h-auto md:max-h-[88dvh] md:w-[540px] bg-white bottom-sheet md:rounded-[48px] shadow-2xl overflow-hidden animate-slide-up">
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

      <nav className="md:hidden bg-white border-t app-border-light flex items-center justify-around px-6 z-[4900] pb-[env(safe-area-inset-bottom)] h-[calc(5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgba(0,0,0,0.03)] shrink-0">
        <button onClick={() => setViewMode('map')} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${viewMode === 'map' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}><MapIcon className="w-7 h-7" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Map</span></button>
        <button onClick={() => setViewMode('list')} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${viewMode === 'list' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}><List className="w-7 h-7" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Inventory</span></button>
        <button onClick={() => setShowAbout(true)} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${showAbout ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}><BookOpen className="w-7 h-7" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Manual</span></button>
      </nav>
    </div>
  );
};

export default App;
