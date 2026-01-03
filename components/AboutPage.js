
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  UserCheck, 
  Phone, 
  MapPin,
  CheckCircle,
  Target,
  FastForward,
  Camera,
  HardDrive,
  Monitor,
  Trello,
  BoxSelect,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  Smartphone,
  Unlock,
  FolderOpen,
  Cpu,
  Fingerprint,
  WifiOff,
  ClipboardCheck
} from 'lucide-react';
import { getDeviceId, getSubscriptionStatus } from '../services/authService';
import { getStorageHealth, StorageEstimate } from '../services/dbService';

interface AboutPageProps {
  onClose?: () => void;
  hideHeader?: boolean;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onClose, hideHeader = false }) => {
  const [deviceId, setDeviceId] = useState('...');
  const [subStatus, setSubStatus] = useState<{active: boolean, daysLeft: number} | null>(null);
  const [storage, setStorage] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
    getSubscriptionStatus().then(setSubStatus);
    getStorageHealth().then(setStorage);
  }, []);

  const usedGB = storage ? (storage.usage / (1024 * 1024 * 1024)).toFixed(2) : '0.00';
  const quotaGB = storage ? (storage.quota / (1024 * 1024 * 1024)).toFixed(0) : '0';

  return (
    <div className={`w-full bg-white ${!hideHeader ? 'rounded-[40px] shadow-2xl' : ''} flex flex-col md:flex-row relative overflow-hidden`}>
      {!hideHeader && onClose && (
        <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-20">
          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all btn-active border border-transparent hover:border-slate-100 group shadow-sm bg-white md:bg-transparent"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      )}

      <div className="w-full md:w-80 lg:w-[380px] bg-slate-900 text-white p-8 sm:p-10 lg:p-14 flex flex-col relative shrink-0 border-b md:border-b-0 md:border-r border-white/5">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-indigo-500 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-emerald-500 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-black leading-none tracking-tighter uppercase mb-3">
            OSP Survey<br/>Engine <span className="text-indigo-500">Pro</span>
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 mb-10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">V5.0.0 Enterprise Build</span>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 group-hover:bg-indigo-600/20 transition-all duration-300">
                <UserCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-[8px] text-white/30 font-black uppercase tracking-widest mb-0.5">Senior Architect</p>
                <p className="text-xs font-black uppercase tracking-tight text-white/90">Engr. John Carlo Rabanes, ECE</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 group-hover:bg-emerald-600/20 transition-all duration-300">
                <Phone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[8px] text-white/30 font-black uppercase tracking-widest mb-0.5">Field Support</p>
                <p className="text-xs font-black monospaced text-white/90">09669343065</p>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-[8px] text-white/30 font-black uppercase tracking-widest mb-0.5">Identity</p>
                    <p className="text-xs font-black monospaced text-indigo-200 tracking-wider">{deviceId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
             </div>

             <div className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-slate-500" />
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Storage (5GB Target)</span>
                  </div>
                  <span className="text-[9px] font-bold text-indigo-400 uppercase">{usedGB}GB / {quotaGB}GB</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(100, storage?.percent || 0)}%` }}></div>
                </div>
             </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
             <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Core Intelligence Active</span>
             </div>
             <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Enterprise Sync Locked</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white p-8 sm:p-12 lg:p-16 relative overflow-y-auto">
        <div className="max-w-3xl space-y-16 lg:space-y-20 pb-12">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
              <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Field Operations v5</h2>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight mb-6 tracking-tight">
              Enterprise Storage. High Frequency Field Surveys.
            </p>
            <p className="text-slate-600 leading-relaxed text-base font-medium">
              V5.0 is built to handle massive datasets. Optimized for 5GB+ local storage, the app can reliably host over 500+ processed field photos without performance degradation, using raw binary management directly within the device's secure vault.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-10">
              <Zap className="w-5 h-5 text-amber-500" />
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Why OSP Pro?</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center"><Camera className="w-6 h-6 text-indigo-600" /></div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Optimized OSP Capture</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Unlike generic GIS apps, our engine automatically stamps every photo with precise map tiles, GPS coordinates, and project metadata directly into the image binary for instant documentation.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center"><HardDrive className="w-6 h-6 text-emerald-600" /></div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">5GB+ Binary Vault</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Standard GIS tools often crash when handling large batches of photos. OSP Pro uses a specialized IndexedDB vault to store 500+ high-res evidence photos without slowing down the UI.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center"><ClipboardCheck className="w-6 h-6 text-amber-600" /></div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Integrated QA Workflow</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Assign 'Pass' or 'Retake' status to photos while still on-site. Eliminate revisit costs by ensuring all engineering evidence meets standards before you leave the field.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center"><WifiOff className="w-6 h-6 text-slate-600" /></div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Zero-Data Independence</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Operate in remote dead zones with zero latency. Navigate offline maps and manage your inventory without a cloud connection—data syncs only when you choose.</p>
              </div>
            </div>
          </section>

          <footer className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between gap-6">
             <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Core Architecture</p>
                <p className="text-xs text-slate-400 font-medium">React 19 / Leaflet v1.9 / Binary IDB Engine</p>
             </div>
             <div className="text-left md:text-right space-y-2">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">System Health</p>
                <p className="text-xs text-slate-400 font-medium">{storage ? (storage.percent).toFixed(1) : 0}% Disk Utilization</p>
             </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
