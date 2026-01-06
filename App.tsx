import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Map as MapIcon, 
@@ -38,12 +37,27 @@ import { saveState, getState, clearState, requestPersistentStorage, getStorageHe

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
@@ -70,107 +84,261 @@ const App: React.FC = () => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Store current survey in ref for cleanup
  useEffect(() => {
    surveyRef.current = survey;
  }, [survey]);

  // Monitor connectivity
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
    const status = await getSubscriptionStatus();
    setIsSubscribed(status.active);
    setDaysRemaining(status.daysLeft);
    setCheckingAuth(false);
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
    const health = await getStorageHealth();
    setStorageHealth(health);
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
    refreshSubscriptionStatus();
    requestPersistentStorage().then(setIsPersistent);
    refreshStorageInfo();
    const storageInterval = setInterval(refreshStorageInfo, 10000);
    return () => clearInterval(storageInterval);
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
        if (saved && saved.id) {
        if (!controller.signal.aborted && isMounted && saved && saved.id) {
          skipNextUnsaved.current = true;
          setSurvey(saved);
          setSaveStatus('saved');
        }
      } catch (e) {
        console.error("Storage Load Error:", e);
        if (!controller.signal.aborted && isMounted && e.name !== 'AbortError') {
          console.error("Storage Load Error:", e);
        }
      } finally {
        initialLoadDone.current = true;
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
          refreshStorageInfo();
        } catch (e) {
          console.error("Local Save Error:", e);
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
      }, 400); 
      return () => clearTimeout(timeout);
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
    const handleUnload = () => {
    const handleUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus !== 'saved' && surveyRef.current) {
        saveState(STORAGE_KEY, surveyRef.current);
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
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude || undefined
        });
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    
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
@@ -219,29 +387,72 @@ const App: React.FC = () => {
    }
  }, [selectedPoleId]);

  const handleProjectExport = async () => {
  const handleProjectExport = useCallback(async () => {
    if (!isSubscribed) {
      setShowActivation(true);
      return;
    }
    if (survey.poles.length === 0) return alert('No data to export.');
    
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
      await exportProjectToDirectory(survey);
      setCompileSuccess(true);
      setTimeout(() => {
        alert('Sync Successful!\nProject package written to local storage.');
      }, 500);
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
      if (err.name === 'AbortError') return;
      alert('Sync Failed: ' + (err.message || 'Check storage permissions.')); 
      
    } finally { 
      setTimeout(() => { setIsCompiling(false); setCompileSuccess(false); }, 3000); 
      // Cleanup
      abortControllers.current.delete(controllerId);
      clearTimeout(successTimeout);
      clearTimeout(cleanupTimeout);
    }
  };
    
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
@@ -253,6 +464,7 @@ const App: React.FC = () => {

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-sans">
      {/* Compiling/Resetting Overlay */}
      {(isCompiling || isResetting) && (
        <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="w-24 h-24 mb-10">
@@ -269,25 +481,35 @@ const App: React.FC = () => {
        </div>
      )}

      {/* Activation Overlay */}
      {showActivation && (
        <ActivationOverlay 
          onActivated={() => { refreshSubscriptionStatus(); setShowActivation(false); }} 
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
          <div className="flex items-center gap-1.5 text-indigo-400"><Activity className="w-3.5 h-3.5" /><span>OSP PRO</span></div>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Activity className="w-3.5 h-3.5" />
            <span>OSP PRO</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
            {isOnline ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
@@ -311,10 +533,14 @@ const App: React.FC = () => {
            {isSubscribed ? <ShieldCheck className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{isSubscribed ? `${daysRemaining}D` : 'FREE'}</span>
          </div>
          <div className={`flex items-center gap-1.5 ${userLocation ? 'text-blue-400' : 'text-red-500 animate-pulse'}`}><Signal className="w-3.5 h-3.5" /><span>GPS {userLocation ? 'OK' : '...'}</span></div>
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
@@ -352,7 +578,9 @@ const App: React.FC = () => {
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`absolute inset-y-0 left-0 z-[4500] w-full md:w-96 bg-white border-r app-border-light flex flex-col transition-all duration-300 ${viewMode === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0 shadow-2xl md:shadow-none'}`}>
          <div className="p-6 flex flex-col border-b app-border-light bg-slate-50/50">
            <h2 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Field Inventory</h2>
@@ -383,6 +611,7 @@ const App: React.FC = () => {
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="flex-1 relative bg-slate-100 overflow-hidden">
          {!isResetting && (
            <MapOverlay 
@@ -398,6 +627,7 @@ const App: React.FC = () => {
          )}
        </main>

        {/* Pole Editor Modal */}
        {selectedPoleId && selectedPole && (
          <div className="fixed inset-0 z-[5500] bg-slate-900/70 backdrop-blur-md flex items-end justify-center md:items-center">
            <div className="w-full h-[96vh] md:h-auto md:max-h-[88vh] md:w-[540px] bg-white bottom-sheet md:rounded-[48px] shadow-2xl overflow-hidden animate-slide-up">
@@ -414,10 +644,20 @@ const App: React.FC = () => {
        )}
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t app-border-light flex items-center justify-around px-6 z-[4900] pb-[env(safe-area-inset-bottom)] h-[calc(5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgba(0,0,0,0.03)] shrink-0">
        <button onClick={() => setViewMode('map')} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${viewMode === 'map' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}><MapIcon className="w-7 h-7" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Map</span></button>
        <button onClick={() => setViewMode('list')} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${viewMode === 'list' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}><List className="w-7 h-7" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Inventory</span></button>
        <button onClick={() => setShowAbout(true)} className={`flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all ${showAbout ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400'}`}><BookOpen className="w-7 h-7" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Manual</span></button>
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
