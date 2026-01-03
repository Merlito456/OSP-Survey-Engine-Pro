
import React, { useRef, useState, useEffect } from 'react';
import { Camera, MapPin, X, Save, ChevronLeft, Info, Signal, CheckCircle2, AlertCircle, MessageSquare, Sparkles, Loader2, Trash2, Database, Eye, WifiOff } from 'lucide-react';
import { PoleSurvey, SurveyPhoto } from '../types';
import { processSurveyPhoto } from '../services/photoProcessor';
import { saveImageBlob, getImageBlob } from '../services/dbService';
import { GoogleGenAI } from "@google/genai";

interface PoleEditorProps {
  pole: PoleSurvey;
  siteName: string;
  companyName: string;
  onUpdate: (updates: Partial<PoleSurvey>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(',');
  const byteString = atob(parts[1]);
  const mimeString = parts[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

export const PoleEditor: React.FC<PoleEditorProps> = ({ pole, siteName, companyName, onUpdate, onDelete, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Preview state for high-res viewing (retrieved on demand)
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(null);
  const [viewingPhotoSrc, setViewingPhotoSrc] = useState<string | null>(null);

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

  const viewingPhoto = pole.photos.find(p => p.id === viewingPhotoId);

  useEffect(() => {
    if (viewingPhotoId) {
      getImageBlob(viewingPhotoId).then(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setViewingPhotoSrc(url);
          return () => URL.revokeObjectURL(url);
        }
      });
    } else {
      setViewingPhotoSrc(null);
    }
  }, [viewingPhotoId]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    let capLat: number | undefined;
    let capLng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }));
      capLat = pos.coords.latitude;
      capLng = pos.coords.longitude;
    } catch {}

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const { processed, thumbnail } = await processSurveyPhoto(base64, pole, siteName, companyName, capLat, capLng);
        const photoId = crypto.randomUUID();
        
        await saveImageBlob(photoId, base64ToBlob(processed));

        const newPhoto: SurveyPhoto = {
          id: photoId,
          thumbnail: thumbnail,
          timestamp: new Date().toISOString(),
          status: 'PENDING',
          capturedLat: capLat,
          capturedLng: capLng,
          isStoredInDB: true
        };
        onUpdate({ photos: [...(pole.photos || []), newPhoto] });
      } catch (err) {
        console.error('Processing failed', err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updatePhotoStatus = (photoId: string, status: 'PASSED' | 'RETAKE' | 'PENDING', remarks?: string) => {
    const updatedPhotos = pole.photos.map(p => 
      p.id === photoId ? { ...p, status, remarks: remarks ?? p.remarks } : p
    );
    onUpdate({ photos: updatedPhotos });
  };

  const runAiAnalysis = async (photoId: string) => {
    if (!isOnline) return alert("AI analysis requires an active internet connection.");
    if (!process.env.API_KEY) return alert("API Key Required.");
    setIsAiAnalyzing(true);
    try {
      const blob = await getImageBlob(photoId);
      if (!blob) throw new Error("Binary evidence not found in temporary store.");
      
      const reader = new FileReader();
      const base64Data = await new Promise<string>((res) => {
        reader.onloadend = () => res((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ inlineData: { data: base64Data, mimeType: 'image/jpeg' } }, { text: "Analyze this pole structurally. Max 15 words." }] }]
      });

      updatePhotoStatus(photoId, 'PENDING', response.text || "AI analysis completed.");
    } catch (err) {
      alert("AI Service Unavailable");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {viewingPhotoId && viewingPhoto && (
        <div className="fixed inset-0 z-[6000] bg-slate-950/98 backdrop-blur-2xl flex flex-col overflow-y-auto">
          <div className="w-full flex justify-between items-center p-6 shrink-0 pt-[env(safe-area-inset-top)]">
            <h3 className="text-white text-xs font-black uppercase tracking-widest">Evidence Review</h3>
            <button onClick={() => setViewingPhotoId(null)} className="p-3 text-white bg-white/10 rounded-full active:scale-90 transition-transform"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {viewingPhotoSrc ? (
              <img src={viewingPhotoSrc} className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl" alt="Full Evidence" />
            ) : (
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            )}
          </div>
          <div className="w-full max-w-2xl mx-auto bg-white rounded-t-[40px] p-8 space-y-6 shadow-2xl pb-[calc(2rem+env(safe-area-inset-bottom))]">
             <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-xl font-black text-slate-900 uppercase">QA Assessment</h3>
              <button 
                onClick={() => runAiAnalysis(viewingPhotoId)}
                disabled={isAiAnalyzing || !isOnline}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg transition-all
                  ${isOnline ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-100 text-slate-400 shadow-none grayscale'}
                `}
              >
                {isAiAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : (isOnline ? <Sparkles className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />)}
                {isAiAnalyzing ? 'ANALYZING...' : isOnline ? 'AI ASSESS' : 'OFFLINE'}
              </button>
            </div>
            {!isOnline && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                 <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                 <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">AI features are disabled while offline. Manual review still active.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => updatePhotoStatus(viewingPhotoId, 'PASSED')} className={`flex flex-col items-center gap-3 p-6 rounded-3xl transition-all border-2 ${viewingPhoto.status === 'PASSED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-[10px] font-black uppercase tracking-widest">Pass</span>
              </button>
              <button onClick={() => updatePhotoStatus(viewingPhotoId, 'RETAKE')} className={`flex flex-col items-center gap-3 p-6 rounded-3xl transition-all border-2 ${viewingPhoto.status === 'RETAKE' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                <AlertCircle className="w-8 h-8" />
                <span className="text-[10px] font-black uppercase tracking-widest">Retake</span>
              </button>
            </div>
            <textarea value={viewingPhoto.remarks || ''} onChange={(e) => updatePhotoStatus(viewingPhotoId, viewingPhoto.status || 'PENDING', e.target.value)} placeholder="Technical remarks..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl h-28 resize-none text-sm" />
            <button onClick={() => setViewingPhotoId(null)} className="w-full p-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest">Done</button>
          </div>
        </div>
      )}

      <div className="px-6 py-6 border-b app-border-light flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm"><ChevronLeft className="w-6 h-6 text-slate-700" /></button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Edit Pin</h2>
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{pole.id.substring(0,8)}</p>
          </div>
        </div>
        <button onClick={() => window.confirm(`DELETE ${pole.name}?`) && (onDelete(), onClose())} className="p-4 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 active:scale-90 transition-transform shadow-sm"><Trash2 className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10">
        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Asset Reference</label>
          <input type="text" value={pole.name} onChange={(e) => onUpdate({ name: e.target.value.toUpperCase() })} className="w-full p-6 bg-slate-100 border border-slate-200 rounded-[28px] font-black text-slate-800 text-xl uppercase shadow-inner" />
        </div>

        <div className="space-y-5">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Evidence Portfolio</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {pole.photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square rounded-[32px] overflow-hidden bg-slate-100 border-2 border-slate-200" onClick={() => setViewingPhotoId(photo.id)}>
                <img src={photo.thumbnail} className="w-full h-full object-cover blur-[0.5px]" alt="UI Thumb" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="text-white w-6 h-6" /></div>
                {photo.status && photo.status !== 'PENDING' && (
                  <div className={`absolute top-3 left-3 p-1.5 rounded-xl ${photo.status === 'PASSED' ? 'bg-emerald-500' : 'bg-rose-500'} text-white shadow-lg`}>
                    {photo.status === 'PASSED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  </div>
                )}
                {photo.isStoredInDB && <div className="absolute top-3 right-3 p-1 rounded-full bg-white/90 text-indigo-600 shadow-sm"><Database className="w-3 h-3" /></div>}
              </div>
            ))}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`aspect-square rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${isProcessing ? 'bg-slate-50 border-slate-200 cursor-wait' : 'border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 text-slate-400'}`}
            >
              {isProcessing ? <Loader2 className="w-8 h-8 animate-spin text-indigo-500" /> : <Camera className="w-8 h-8" />}
              <span className="text-[9px] font-black uppercase">Add Entry</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handlePhotoCapture} accept="image/*" capture="environment" className="hidden" />
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
           <Signal className="absolute top-0 right-0 p-6 opacity-10 w-24 h-24" />
           <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest"><MapPin className="w-4 h-4" /> Metadata</div>
              <div className="grid grid-cols-2 gap-4">
                 <div><p className="text-[8px] opacity-40 uppercase font-black">Coordinates</p><p className="text-xs monospaced font-bold">{pole.latitude.toFixed(6)}, {pole.longitude.toFixed(6)}</p></div>
                 <div><p className="text-[8px] opacity-40 uppercase font-black">Altitude</p><p className="text-xs font-bold">{pole.altitude ? `${pole.altitude.toFixed(2)}m` : 'Detecting...'}</p></div>
              </div>
           </div>
        </div>

        <div className="space-y-3 pb-16">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Field Notes</label>
          <textarea value={pole.notes} onChange={(e) => onUpdate({ notes: e.target.value })} className="w-full p-6 bg-slate-100 border border-slate-200 rounded-[32px] h-32 resize-none text-sm" placeholder="Engineering observations..." />
        </div>
      </div>

      <div className="p-6 border-t app-border-light bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl">
        <button onClick={onClose} className="w-full p-6 bg-slate-900 text-white rounded-[28px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform"><Save className="w-5 h-5" /> Save Changes</button>
      </div>
    </div>
  );
};
