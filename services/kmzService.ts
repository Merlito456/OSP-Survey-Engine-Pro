
import JSZip from 'jszip';
import { SiteSurvey, PoleSurvey } from '../types';
import { getImageBlob } from './dbService';

const sanitize = (name: string) => name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Unknown';

/**
 * Compiles the entire project into a single, structured JSZip object.
 * This includes the KMZ report and organized subfolders for every pole.
 */
export const compileProjectArchive = async (site: SiteSurvey): Promise<JSZip> => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rootDirName = `${sanitize(site.siteName)}_${timestamp}`;
  const rootDir = zip.folder(rootDirName);
  
  // 1. Generate the Master KMZ and add to root
  const kmzBlob = await generateKMZ(site);
  rootDir?.file(`${sanitize(site.siteName)}_REPORT.kmz`, kmzBlob);

  // 2. Add Project Metadata
  const projectMeta = `PROJECT: ${site.siteName}\nUNIT: ${site.companyName}\nDATE: ${new Date().toLocaleString()}\nPOLE COUNT: ${site.poles.length}`;
  rootDir?.file('PROJECT_SUMMARY.txt', projectMeta);

  // 3. Build Pole Hierarchy
  const polesDir = rootDir?.folder('POLES');
  for (const pole of site.poles) {
    const poleDir = polesDir?.folder(sanitize(pole.name));
    
    // Pole specific metadata
    const poleMeta = `POLE ID: ${pole.name}\nLAT: ${pole.latitude}\nLNG: ${pole.longitude}\nNOTES: ${pole.notes || 'None'}`;
    poleDir?.file('metadata.txt', poleMeta);

    // High-res photos
    for (let i = 0; i < pole.photos.length; i++) {
      const ph = pole.photos[i];
      const blob = await getImageBlob(ph.id);
      if (blob) {
        poleDir?.file(`PHOTO_${i + 1}.jpg`, blob);
      }
    }
  }

  return zip;
};

/**
 * Generates a master KMZ (KML + Images) for GIS software compatibility.
 */
export const generateKMZ = async (site: SiteSurvey): Promise<Blob> => {
  const zip = new JSZip();
  const imgFolder = zip.folder('images');
  let kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${site.siteName}</name>`;

  for (const pole of site.poles) {
    const poleSafe = sanitize(pole.name);
    const photosHtml = pole.photos.map((_, i) => `<img src="images/${poleSafe}_IMG_${i + 1}.jpg" width="400"/><br/>`).join('');
    kml += `<Placemark><name>${pole.name}</name><description><![CDATA[${photosHtml}<p>${pole.notes || ''}</p>]]></description><Point><coordinates>${pole.longitude},${pole.latitude},${pole.altitude || 0}</coordinates></Point></Placemark>`;
    
    for (let i = 0; i < pole.photos.length; i++) {
      const blob = await getImageBlob(pole.photos[i].id);
      if (blob) imgFolder?.file(`${poleSafe}_IMG_${i + 1}.jpg`, blob);
    }
  }
  kml += `</Document></kml>`;
  zip.file('doc.kml', kml);
  return await zip.generateAsync({ type: 'blob' });
};

/**
 * Universal "Ask First" Export Strategy
 * 
 * ANDROID USERS: 
 * The app will open the system 'Share' menu. 
 * To save to your Documents folder, select "Save to Files" or your preferred File Manager 
 * from the list of apps.
 */
export const exportProjectToDirectory = async (site: SiteSurvey): Promise<void> => {
  const zip = await compileProjectArchive(site);
  // Using ArrayBuffer is critical for Android performance and avoiding memory crashes
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const arrayBuffer = await zipBlob.arrayBuffer();
  const fileName = `${sanitize(site.siteName)}_OSP_EXPORT.zip`;

  // 1. Try Desktop "Save As" (File System Access API) - Best for Chrome/Edge Desktop
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Project Archive',
          accept: { 'application/zip': ['.zip'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled
      console.warn("showSaveFilePicker failed or cancelled, trying share...", err);
    }
  }

  // 2. Mobile Strategy: Use Share API to "Ask" where to save
  // On Android, sharing a File triggers the "Save to Files" option in the share sheet.
  const file = new File([arrayBuffer], fileName, { type: 'application/zip' });
  
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `OSP Export: ${site.siteName}`,
        text: 'Select "Save to Files" to choose your Documents folder.'
      });
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return; 
      console.error("Navigator share failed", err);
    }
  }

  // 3. Last Resort Fallback: Standard Browser Download
  // (Note: This usually goes to 'Downloads' automatically unless user changed Chrome settings)
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
