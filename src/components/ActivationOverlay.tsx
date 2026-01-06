
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Zap, Key, CheckCircle2, AlertCircle, Info, Settings, Lock, 
  ArrowRight, X, Smartphone, ChevronDown, MessageSquare, Phone,
  Clock, Map, Camera, FileArchive, Target, ZapOff, CheckCircle, Flame,
  ShieldCheck, Layers, ChevronLeft
} from 'lucide-react';
import { activateSubscription, getDeviceId, ActivationResult } from '../services/authService';
import { AboutPage } from './AboutPage';

interface ActivationOverlayProps {
  onActivated: () => void;
  onOpenGenerator: () => void;
  onClose?: () => void;
}

export const ActivationOverlay: React.FC<ActivationOverlayProps> = ({ onActivated, onOpenGenerator, onClose }) => {
  const [code, setCode] = useState('');
  const [errorStatus, setErrorStatus] = useState<ActivationResult | null>(null);
  const [success, setSuccess] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  const handleActivate = async () => {
    const result = await activateSubscription(code);
    if (result === 'SUCCESS') {
      setSuccess(true);
      setErrorStatus(null);
      setTimeout(() => onActivated(), 1500);
    } else {
      setErrorStatus(result);
      setSuccess(false);
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '07141994') {
      setAdminError(false);
      setShowAdminGate(false);
      setAdminPassword('');
      onOpenGenerator();
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9000] bg-slate-900/80 backdrop-blur-xl overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="min-h-full flex flex-col items-center p-4 sm:p-8 space-y-16 pb-32">
        
        <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden relative animate-slide-up mt-8 shrink-0">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {showAdminGate && (
            <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-8 animate-fade-in">
              <button onClick={() => setShowAdminGate(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <Lock className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Administrative Gate</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-center text-balance">Authorization Required</p>
              
              <form onSubmit={handleAdminAuth} className="w-full space-y-4">
                <input 
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                  placeholder="ENTER ACCESS KEY"
                  className={`w-full bg-white/5 border-2 rounded-2xl p-4 text-center text-white font-black tracking-[0.3em] outline-none transition-all
                    ${adminError ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-indigo-500'}
                  `}
                />
                <button type="submit" className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all">
                  Authenticate <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          <div className="bg-slate-900 p-10 text-center relative border-b app-border-dark">
            <div className="w-20 h-20 bg-indigo-600 rounded-[30px] mx-auto flex items-center justify-center mb-6 shadow-2xl border border-white/10">
              {success ? <CheckCircle2 className="w-10 h-10 text-white" /> : <ShieldAlert className="w-10 h-10 text-white" />}
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Sync Activation</h2>
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Required for Professional KMZ and Photo Compilation Export</p>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Activation Code</label>
                <Key className="w-4 h-4 text-slate-300" />
              </div>
              <input 
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setErrorStatus(null);
                }}
                className={`w-full p-7 bg-slate-50 border-2 rounded-3xl text-center text-4xl font-black uppercase tracking-[0.3em] outline-none transition-all
                  ${errorStatus ? 'border-red-500 bg-red-50 text-red-900 animate-shake' : 'border-transparent focus:border-indigo-500 focus:bg-white text-slate-900'}
                  ${success ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : ''}
                `}
                placeholder="XXXXXX"
              />
              
              <div className="bg-indigo-50/50 p-5 rounded-2xl flex items-center justify-between border border-indigo-100">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Device ID:</span>
                </div>
                <span className="text-xs font-black monospaced tracking-widest text-indigo-900">{deviceId}</span>
              </div>
            </div>

            <button 
              onClick={handleActivate}
              disabled={code.length !== 6 || success}
              className={`w-full p-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all btn-active flex items-center justify-center gap-3
                ${success ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-black active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-slate-200'}
              `}
            >
              {success ? 'Verified' : 'Unlock Project Sync'}
              {!success && <Zap className="w-4 h-4 text-amber-400" />}
            </button>

            {!success && (
              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex flex-col items-center text-center gap-3">
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed uppercase tracking-tighter">
                  Contact developer for your device license key.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <a href="tel:09669343065" className="py-4 bg-white text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-indigo-100 shadow-sm">
                    <Phone className="w-3 h-3" />
                    Call Support
                  </a>
                  {onClose && (
                    <button onClick={onClose} className="py-4 bg-white text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-slate-200">
                      <ChevronLeft className="w-3 h-3" />
                      Keep Working
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-6 border-t app-border-light flex items-center justify-between px-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secured Enterprise App</span>
            </div>
            <button onClick={() => setShowAdminGate(true)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group">
              <Settings className="w-3 h-3 group-hover:rotate-45 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-widest">Admin</span>
            </button>
          </div>
        </div>

        <div className="w-full max-w-5xl px-4">
           {/* Detailed comparison or info section remains as is for visual trust */}
        </div>
      </div>
    </div>
  );
};
