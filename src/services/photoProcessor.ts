
import { PoleSurvey } from '../types';

/**
 * Calculates distance between two points in meters (Haversine)
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Resizes an image while maintaining aspect ratio
 */
const resizeImage = (img: HTMLImageElement, maxDimension: number): { width: number, height: number } => {
  let width = img.width;
  let height = img.height;
  if (width > height) {
    if (width > maxDimension) {
      height *= maxDimension / width;
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width *= maxDimension / height;
      height = maxDimension;
    }
  }
  return { width, height };
};

/**
 * Reverse geocoding for professional location strings
 */
const getAddressDetails = async (lat: number, lng: number) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
    const data = await response.json();
    const addr = data.address || {};
    return {
      barangay: addr.suburb || addr.neighbourhood || addr.village || addr.quarter || 'N/A',
      city: addr.city || addr.town || addr.municipality || 'FIELD SITE',
      province: addr.state || addr.province || addr.county || 'LOCAL AREA',
      region: addr.region || addr['ISO3166-2-lvl4'] || 'OSP REGION'
    };
  } catch (e) {
    return { 
      barangay: 'FIELD CAPTURE', 
      city: 'GPS DATA', 
      province: 'SURVEY UNIT', 
      region: 'OSP SECTOR' 
    };
  }
};

/**
 * Static Map Tile fetcher and precise pin calculator
 */
const fetchMapWithPin = async (
  lat: number, 
  lng: number, 
  zoom: number = 18
): Promise<{ img: HTMLImageElement, pinX: number, pinY: number } | null> => {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  
  const offsetX = (x - tileX) * 256;
  const offsetY = (y - tileY) * 256;

  const url = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ img, pinX: offsetX, pinY: offsetY });
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Formats date to professional string
 */
const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

/**
 * Adds a structured Field Box with Map and Metadata and generates a UI thumbnail
 */
export const processSurveyPhoto = async (
  base64Image: string,
  survey: PoleSurvey,
  siteName: string,
  companyName: string = 'FIELD OPERATIONS',
  capturedLat?: number,
  capturedLng?: number
): Promise<{ processed: string, thumbnail: string }> => {
  const location = await getAddressDetails(survey.latitude, survey.longitude);
  
  let verificationRemark = "COORDINATE MATCH";
  let verificationColor = "white";
  
  if (capturedLat && capturedLng) {
    const distance = calculateDistance(survey.latitude, survey.longitude, capturedLat, capturedLng);
    if (distance <= 2000) {
      const distStr = distance < 1000 ? `${distance.toFixed(1)}m` : `${(distance / 1000).toFixed(2)}km`;
      verificationRemark = `VERIFIED: ${distStr} FROM PIN`;
      verificationColor = "#10b981";
    } else {
      verificationRemark = `OUT OF RANGE: ${(distance / 1000).toFixed(1)}km OFFSET`;
      verificationColor = "#ef4444";
    }
  }

  return new Promise(async (resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));

        // High Res Version
        const { width, height } = resizeImage(img, 2048); 
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const padding = canvas.width * 0.03;
        const fontSize = Math.max(22, Math.floor(canvas.width / 52));
        const boxWidth = canvas.width * 0.94;
        const boxHeight = canvas.width * 0.52; 
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = canvas.height - boxHeight - padding;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; 
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 24);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        const innerPadding = boxHeight * 0.08;
        const mapSize = boxHeight - (innerPadding * 2.5);
        const mapX = boxX + innerPadding;
        const mapY = boxY + innerPadding;

        const mapData = await fetchMapWithPin(survey.latitude, survey.longitude);
        if (mapData) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(mapX, mapY, mapSize, mapSize, 16);
          ctx.clip();
          ctx.drawImage(mapData.img, mapX, mapY, mapSize, mapSize);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 3;
          ctx.strokeRect(mapX, mapY, mapSize, mapSize);

          const scale = mapSize / 256;
          const px = mapX + (mapData.pinX * scale);
          const py = mapY + (mapData.pinY * scale);
          
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(px, py, fontSize * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
        }

        const textStartX = mapX + mapSize + (innerPadding * 2.2);
        ctx.save();
        ctx.textBaseline = 'top';

        const details = [
          { label: 'TIMESTAMP', value: formatDate(survey.timestamp) },
          { label: 'COMPANY', value: companyName.toUpperCase() },
          { label: 'PROJECT', value: siteName.toUpperCase() },
          { label: 'POLE REF', value: survey.name.toUpperCase() },
          { label: 'LAT/LONG', value: `${survey.latitude.toFixed(8)}, ${survey.longitude.toFixed(8)}` },
          { label: 'GPS VERIFY', value: verificationRemark, color: verificationColor },
          { label: 'BARANGAY', value: location.barangay.toUpperCase() },
          { label: 'CITY/TOWN', value: location.city.toUpperCase() },
          { label: 'PROVINCE', value: location.province.toUpperCase() },
          { label: 'REGION', value: location.region.toUpperCase() }
        ];

        const lineSpacing = (boxHeight - (innerPadding * 2)) / details.length;
        let currentY = boxY + innerPadding;
        ctx.font = `900 ${fontSize * 0.5}px 'JetBrains Mono', monospace`;
        const labelColWidth = ctx.measureText('CITY/TOWN').width + (fontSize * 1.5);

        details.forEach((item) => {
          ctx.font = `900 ${fontSize * 0.45}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(item.label, textStartX, currentY + (fontSize * 0.2));
          ctx.font = `800 ${fontSize * 0.72}px sans-serif`;
          ctx.fillStyle = item.color || 'white';
          ctx.fillText(item.value, textStartX + labelColWidth, currentY);
          currentY += lineSpacing;
        });
        ctx.restore();

        const processed = canvas.toDataURL('image/jpeg', 0.9);

        // Thumbnail Generation (Very small for memory efficiency)
        const thumbCanvas = document.createElement('canvas');
        const thumbCtx = thumbCanvas.getContext('2d');
        const { width: tw, height: th } = resizeImage(img, 120);
        thumbCanvas.width = tw;
        thumbCanvas.height = th;
        thumbCtx?.drawImage(img, 0, 0, tw, th);
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);

        resolve({ processed, thumbnail });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Image load failure'));
    img.src = base64Image;
  });
};
