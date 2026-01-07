
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Copy, 
  RefreshCw, 
  Smartphone, 
  Zap, 
  Lock, 
  ShieldCheck, 
  Cpu, 
  Database,
  Terminal,
  Activity
} from 'lucide-react';
import { getDeviceId } from '../services/authService';

interface CodeGeneratorPageProps {
  onClose: () => void;
}

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const WEIGHTS = [3, 7, 13, 17, 19, 23];

export const CodeGeneratorPage: React.FC<CodeGeneratorPageProps> = ({ onClose }) => {
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    getDeviceId().then(setTargetDeviceId);
  }, []);

  const calculateWeightedSum = (str: string): number => {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      const val = CHARS.indexOf(str[i]);
      if (val !== -1) {
        sum += val * WEIGHTS[i % WEIGHTS.length];
      } else {
        sum += str.charCodeAt(i) * WEIGHTS[i % WEIGHTS.length];
      }
    }
    return sum;
  };

  const generateValidCode = (deviceId: string) => {
    const upperDevice = deviceId.toUpperCase();
    const deviceSum = calculateWeightedSum(upperDevice);
    let codePart = '';
    let partialCodeSum = 0;
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * CHARS.length);
      codePart += CHARS[idx];
      partialCodeSum += idx * WEIGHTS[i];
    }
    const targetMod = 7;
    const currentMod = (partialCodeSum + deviceSum) % 19;
    const requiredMod = (targetMod - currentMod + 19) % 19;
    const solutions: number[] = [];
    for (let idx = 0; idx < CHARS.length; idx++) {
      if ((idx * WEIGHTS[5]) % 19 === requiredMod) {
        solutions.push(idx);
      }
    }
    if (solutions.length > 0) {
      const finalIdx = solutions[Math.floor(Math.random() * solutions.length)];
      return codePart + CHARS[finalIdx];
    }
    return null;
  };

  const handleGenerateBatch = () => {
    if (!targetDeviceId || targetDeviceId.length < 4) return;
    setIsGenerating(true);
    setTimeout(() => {
      const newCodes: string[] = [];
      while (newCodes.length < 3) {
        const code = generateValidCode(targetDeviceId);
        if (code && !newCodes.includes(code)) newCodes.push(code);
      }
      setGeneratedCodes(newCodes);
      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[11000] bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-slate-900 p-8 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-black uppercase tracking-tight text-lg">Key Management Console</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Authorized Personnel Only</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Device ID</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={targetDeviceId}
                    onChange={(e) => setTargetDeviceId(e.target.value.toUpperCase())}
                    className="w-full bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 text-sm font-black tracking-widest outline-none transition-all"
                    placeholder="DEVICE-ID"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleGenerateBatch}
                disabled={isGenerating || !targetDeviceId}
                className="w-full px-8 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
                Generate 30-Day Key
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Batch</label>
              {generatedCodes.length === 0 ? (
                <div className="h-full min-h-[160px] border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-300">
                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Idle System</span>
                </div>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  {generatedCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-white hover:shadow-lg">
                      <span className="text-sm monospaced font-black tracking-[0.2em] text-indigo-600">{code}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(code)}
                        className="p-2 text-slate-300 hover:text-slate-900 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <ShieldCheck />, label: "Secured" },
              { icon: <Cpu />, label: "Device-Lock" },
              { icon: <Database />, label: "Single-Use" }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-100">
                <div className="text-slate-400">{stat.icon}</div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
