
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Trash2, BoxSelect, X } from 'lucide-react';
import { PoleSurvey, LocationState } from '../types';

const pointIcon = L.divIcon({
  className: 'custom-point-pin',
  html: `<div class="w-6 h-6 bg-emerald-500 border-2 border-white rounded-full shadow-xl flex items-center justify-center">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const multiSelectedIcon = L.divIcon({
  className: 'custom-selected-pin',
  html: `<div class="w-8 h-8 bg-amber-500 border-[3px] border-white rounded-full shadow-2xl flex items-center justify-center ring-4 ring-amber-500/30 animate-pulse">
          <div class="w-2.5 h-2.5 bg-white rounded-full"></div>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const activePinIcon = L.divIcon({
  className: 'custom-active-pin',
  html: `<div class="flex flex-col items-center">
          <div class="w-14 h-14 bg-indigo-600 border-[3px] border-white rounded-full shadow-2xl flex items-center justify-center ring-8 ring-indigo-600/20">
            <div class="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <div class="w-1.5 h-4 bg-indigo-600 -mt-1 shadow-lg rounded-full"></div>
        </div>`,
  iconSize: [56, 68],
  iconAnchor: [28, 68],
  popupAnchor: [0, -68]
});

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-blue-500 rounded-full animate-ping opacity-20"></div>
          <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-2xl"></div>
        </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

interface MapOverlayProps {
  poles: PoleSurvey[];
  onMapClick: (lat: number, lng: number) => void;
  onPoleUpdate: (id: string, updates: Partial<PoleSurvey>) => void;
  onMultiplePoleUpdate: (updates: { id: string, updates: Partial<PoleSurvey> }[]) => void;
  onPolesDelete: (ids: string[]) => void;
  selectedPoleId?: string;
  userLocation: LocationState | null;
  isActive: boolean;
}

const MapEvents = ({ onClick, selectionMode, disabled }: { onClick: (lat: number, lng: number) => void, selectionMode: boolean, disabled: boolean }) => {
  useMapEvents({
    click(e) {
      if (selectionMode || disabled) return;
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.leaflet-control') || 
          target.closest('.leaflet-marker-icon') ||
          target.closest('.leaflet-popup-content-wrapper')) {
        return;
      }
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapController = ({ 
  selectedPole, 
  forceCenter, 
  isSelectionMode 
}: { 
  selectedPole?: PoleSurvey, 
  forceCenter: LocationState | null, 
  isSelectionMode: boolean 
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedPole && selectedPole.latitude && selectedPole.longitude) {
      map.flyTo([selectedPole.latitude, selectedPole.longitude], 19, { duration: 1.5 });
    }
  }, [selectedPole, map]);

  useEffect(() => {
    if (forceCenter && forceCenter.lat && forceCenter.lng) {
      map.flyTo([forceCenter.lat, forceCenter.lng], 18, { duration: 1.2 });
    }
  }, [forceCenter, map]);

  useEffect(() => {
    if (isSelectionMode) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
    }
  }, [isSelectionMode, map]);

  return null;
};

interface PoleMarkerProps {
  pole: PoleSurvey;
  isSelected: boolean;
  isMulti: boolean;
  onPoleUpdate: (id: string, updates: Partial<PoleSurvey>) => void;
  onPolesDelete: (ids: string[]) => void;
  multiSelectedIds: string[];
  setIsDragging: (dragging: boolean) => void;
  handleBinCheck: (latlng: L.LatLng) => boolean;
  handleGroupDrag: (anchorId: string, deltaLat: number, deltaLng: number, finished: boolean) => void;
}

const PoleMarker: React.FC<PoleMarkerProps> = ({ 
  pole, 
  isSelected, 
  isMulti, 
  onPoleUpdate, 
  onPolesDelete, 
  multiSelectedIds, 
  setIsDragging, 
  handleBinCheck, 
  handleGroupDrag 
}) => {
  const poleStartPos = useRef<L.LatLng | null>(null);

  return (
    <Marker 
      position={[pole.latitude, pole.longitude]}
      icon={isSelected ? activePinIcon : (isMulti ? multiSelectedIcon : pointIcon)}
      draggable={true}
      zIndexOffset={isSelected ? 5000 : (isMulti ? 2000 : 1000)}
      eventHandlers={{
        dragstart: (e) => {
          setIsDragging(true);
          poleStartPos.current = e.target.getLatLng();
        },
        drag: (e) => {
          const marker = e.target as L.Marker;
          const currentPos = marker.getLatLng();
          handleBinCheck(currentPos);
          if (isMulti && poleStartPos.current) {
            const deltaLat = currentPos.lat - poleStartPos.current.lat;
            const deltaLng = currentPos.lng - poleStartPos.current.lng;
            handleGroupDrag(pole.id, deltaLat, deltaLng, false);
          }
        },
        dragend: (e) => {
          const marker = e.target as L.Marker;
          const latlng = marker.getLatLng();
          if (handleBinCheck(latlng)) {
            isMulti ? onPolesDelete(multiSelectedIds) : onPolesDelete([pole.id]);
          } else if (isMulti && poleStartPos.current) {
            handleGroupDrag(pole.id, latlng.lat - poleStartPos.current.lat, latlng.lng - poleStartPos.current.lng, true);
          } else {
            onPoleUpdate(pole.id, { latitude: latlng.lat, longitude: latlng.lng });
          }
          setIsDragging(false);
          poleStartPos.current = null;
        },
      }}
    >
      <Tooltip 
        permanent 
        direction="top" 
        offset={isSelected ? [0, -64] : [0, -14]} 
        className="custom-pole-label"
      >
        {pole.name}
      </Tooltip>
    </Marker>
  );
};

export const MapOverlay: React.FC<MapOverlayProps> = ({ 
  poles, 
  onMapClick, 
  onPoleUpdate,
  onMultiplePoleUpdate,
  onPolesDelete,
  selectedPoleId, 
  userLocation,
  isActive 
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [forceCenter, setForceCenter] = useState<LocationState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverBin, setIsOverBin] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const binRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      setIsSelectionMode(false);
      setMultiSelectedIds([]);
    }
  }, [isActive]);

  useEffect(() => {
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 100);
    }
  }, [mapInstance, isActive]);

  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number, y: number } | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { lat: number, lng: number }>>({});
  
  const selectedPole = useMemo(() => poles.find(p => p.id === selectedPoleId), [poles, selectedPoleId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isSelectionMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCurrentPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startPoint || !currentPoint || !mapInstance) {
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }

    const latlng1 = mapInstance.containerPointToLatLng(L.point(startPoint.x, startPoint.y));
    const latlng2 = mapInstance.containerPointToLatLng(L.point(currentPoint.x, currentPoint.y));
    const bounds = L.latLngBounds(latlng1, latlng2);

    const selected = poles
      .filter(p => bounds.contains([p.latitude, p.longitude]))
      .map(p => p.id);
    
    setMultiSelectedIds(selected);
    setStartPoint(null);
    setCurrentPoint(null);
    setIsSelectionMode(false);
  };

  const handleGroupDrag = useCallback((anchorId: string, deltaLat: number, deltaLng: number, finished: boolean) => {
    if (multiSelectedIds.length === 0) return;

    if (finished) {
      const updates = multiSelectedIds.map(id => {
        const p = poles.find(pole => pole.id === id);
        if (!p) return null;
        return {
          id,
          updates: {
            latitude: p.latitude + deltaLat,
            longitude: p.longitude + deltaLng
          }
        };
      }).filter(u => u !== null) as { id: string, updates: Partial<PoleSurvey> }[];

      onMultiplePoleUpdate(updates);
      setDragOffsets({});
    } else {
      const newOffsets: Record<string, { lat: number, lng: number }> = {};
      multiSelectedIds.forEach(id => {
        if (id !== anchorId) {
          newOffsets[id] = { lat: deltaLat, lng: deltaLng };
        }
      });
      setDragOffsets(newOffsets);
    }
  }, [multiSelectedIds, poles, onMultiplePoleUpdate]);

  const handleBinCheck = useCallback((latlng: L.LatLng) => {
    if (!mapInstance || !binRef.current) return false;
    const rect = binRef.current.getBoundingClientRect();
    const point = mapInstance.latLngToContainerPoint(latlng);
    const mapRect = mapInstance.getContainer().getBoundingClientRect();
    const vx = point.x + mapRect.left;
    const vy = point.y + mapRect.top;
    const over = vx >= rect.left && vx <= rect.right && vy >= rect.top && vy <= rect.bottom;
    setIsOverBin(over);
    return over;
  }, [mapInstance]);

  const displayedPoles = useMemo(() => {
    return poles.map(p => {
      const offset = dragOffsets[p.id];
      if (offset) {
        return { ...p, latitude: p.latitude + offset.lat, longitude: p.longitude + offset.lng };
      }
      return p;
    });
  }, [poles, dragOffsets]);

  const rectStyles = useMemo(() => {
    if (!startPoint || !currentPoint) return null;
    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(startPoint.x - currentPoint.x);
    const height = Math.abs(startPoint.y - currentPoint.y);
    return { left, top, width, height };
  }, [startPoint, currentPoint]);

  return (
    <div className={`w-full h-full relative overflow-hidden ${!isActive ? 'pointer-events-none grayscale-[0.5] opacity-50' : ''}`}>
      <MapContainer 
        center={[14.5995, 120.9842]} 
        zoom={12} 
        zoomControl={false}
        ref={setMapInstance}
        className="h-full w-full"
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          maxZoom={20}
          attribution='&copy; OpenStreetMap contributors'
        />
        <ZoomControl position="bottomright" />
        
        <MapEvents onClick={onMapClick} selectionMode={isSelectionMode} disabled={!isActive} />
        <MapController selectedPole={selectedPole} forceCenter={forceCenter} isSelectionMode={isSelectionMode} />
        
        {userLocation && isActive && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={userLocationIcon} 
            zIndexOffset={500} // Lowered to not bleed through modals
          />
        )}

        {displayedPoles.map((pole) => (
          <PoleMarker 
            key={pole.id}
            pole={pole}
            isSelected={selectedPoleId === pole.id}
            isMulti={multiSelectedIds.includes(pole.id)}
            onPoleUpdate={onPoleUpdate}
            onPolesDelete={onPolesDelete}
            multiSelectedIds={multiSelectedIds}
            setIsDragging={setIsDragging}
            handleBinCheck={handleBinCheck}
            handleGroupDrag={handleGroupDrag}
          />
        ))}
      </MapContainer>

      {/* Internal Map Overlays - Only active when Map View is main */}
      {isActive && (
        <>
          {isSelectionMode && (
            <div 
              className="absolute inset-0 z-[1500] cursor-crosshair touch-none bg-indigo-500/5"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {rectStyles && (
                <div 
                  className="absolute border-2 border-indigo-600 bg-indigo-600/10 border-dashed"
                  style={{
                    left: rectStyles.left,
                    top: rectStyles.top,
                    width: rectStyles.width,
                    height: rectStyles.height
                  }}
                />
              )}
            </div>
          )}

          <div className="absolute top-8 right-6 z-[1600] flex flex-col gap-4">
            <button 
              onClick={() => {
                const next = !isSelectionMode;
                setIsSelectionMode(next);
                if (next) setMultiSelectedIds([]);
              }}
              className={`w-14 h-14 rounded-2xl shadow-xl border transition-all flex items-center justify-center btn-active
                ${isSelectionMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-100 text-slate-600'}
              `}
            >
              {isSelectionMode ? <X className="w-7 h-7" /> : <BoxSelect className="w-7 h-7" />}
            </button>

            <button 
              onClick={() => { setForceCenter(userLocation); setTimeout(() => setForceCenter(null), 100); }}
              className="w-14 h-14 bg-white text-slate-600 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center btn-active"
            >
              <Crosshair className={`w-7 h-7 ${userLocation ? 'text-indigo-600' : 'text-slate-300'}`} />
            </button>
          </div>

          {multiSelectedIds.length > 1 && !isSelectionMode && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1600] animate-slide-up w-full px-10 max-w-md">
               <div className="bg-slate-900 p-4 rounded-[32px] border border-white/10 shadow-2xl flex items-center justify-between">
                 <div className="flex flex-col ml-2">
                   <span className="text-[11px] font-black text-white uppercase tracking-widest">{multiSelectedIds.length} Poles</span>
                   <span className="text-[8px] font-bold text-slate-400 uppercase">Batch Selection</span>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => setMultiSelectedIds([])} className="px-4 py-2 bg-white/5 text-white/50 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5">Cancel</button>
                   <button 
                     onClick={() => { onPolesDelete(multiSelectedIds); setMultiSelectedIds([]); }}
                     className="flex items-center gap-2 px-5 py-3 bg-rose-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg btn-active"
                   >
                     <Trash2 className="w-3 h-3" />
                     Wipe
                   </button>
                 </div>
               </div>
            </div>
          )}

          <div 
            ref={binRef}
            className={`absolute bottom-24 left-1/2 -translate-x-1/2 z-[1700] transition-all duration-300 pointer-events-none w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center
              ${isDragging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}
              ${isOverBin ? 'bg-red-600 border-red-400 scale-125 shadow-2xl' : 'bg-slate-900/90 border-white/20 scale-100'}
            `}
          >
            <Trash2 className={`w-10 h-10 ${isOverBin ? 'text-white' : 'text-red-400'}`} />
            <span className={`text-[8px] font-black uppercase mt-1 ${isOverBin ? 'text-white' : 'text-slate-400'}`}>Drop to Delete</span>
          </div>
        </>
      )}
    </div>
  );
};
