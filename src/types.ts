
export interface SurveyPhoto {
  id: string;
  thumbnail: string; // Small Base64 for rapid UI rendering/previews
  timestamp: string;
  status?: 'PENDING' | 'PASSED' | 'RETAKE';
  remarks?: string;
  capturedLat?: number;
  capturedLng?: number;
  isStoredInDB?: boolean; // Flag to verify high-res binary existence in asset store
}

export interface PoleSurvey {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
  photos: SurveyPhoto[];
  notes?: string;
}

export interface SiteSurvey {
  id: string;
  siteName: string;
  companyName?: string;
  groupName: string;
  poles: PoleSurvey[];
}

export interface LocationState {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
}
