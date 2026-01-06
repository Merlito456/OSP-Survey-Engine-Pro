
import { getConfig, saveConfig } from './dbService';

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SUBSCRIPTION_DAYS = 30;
const STORAGE_KEY_EXPIRY = 'osp_survey_pro_expiry';
const STORAGE_KEY_DEVICE_ID = 'osp_survey_pro_device_id';
const STORAGE_KEY_USED_CODES = 'osp_survey_pro_consumed_keys';

/**
 * Returns a permanent Device ID. 
 * Uses bidirectional sync between IndexedDB and LocalStorage.
 */
export const getDeviceId = async (): Promise<string> => {
  // 1. Try IndexedDB (Gold standard for persistence)
  let id = await getConfig(STORAGE_KEY_DEVICE_ID);
  
  // 2. Try LocalStorage (Secondary backup)
  if (!id) {
    id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
  }
  
  // 3. Generate and commit if totally new
  if (!id) {
    id = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // 4. Always ensure both stores are in sync with the value
  await saveConfig(STORAGE_KEY_DEVICE_ID, id);
  localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
  
  return id;
};

const getUsedCodes = async (): Promise<string[]> => {
  let codes = await getConfig(STORAGE_KEY_USED_CODES);
  if (!Array.isArray(codes)) {
    const legacy = localStorage.getItem(STORAGE_KEY_USED_CODES);
    try {
      codes = legacy ? JSON.parse(legacy) : [];
    } catch {
      codes = [];
    }
  }
  return codes;
};

const markCodeAsUsed = async (code: string) => {
  const codes = await getUsedCodes();
  if (!codes.includes(code)) {
    codes.push(code);
    await saveConfig(STORAGE_KEY_USED_CODES, codes);
    localStorage.setItem(STORAGE_KEY_USED_CODES, JSON.stringify(codes));
  }
};

const calculateWeightedSum = (str: string, weights: number[]): number => {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const val = CHARS.indexOf(str[i]);
    if (val !== -1) {
      sum += val * (weights[i % weights.length]);
    } else {
      sum += str.charCodeAt(i) * (weights[i % weights.length]);
    }
  }
  return sum;
};

export const validateActivationCode = (code: string, deviceId: string): boolean => {
  if (!code || code.length !== 6) return false;
  const upperCode = code.toUpperCase();
  const upperDevice = deviceId.toUpperCase();
  const weights = [3, 7, 13, 17, 19, 23];
  const codeSum = calculateWeightedSum(upperCode, weights);
  const deviceSum = calculateWeightedSum(upperDevice, weights);
  return (codeSum + deviceSum) % 19 === 7;
};

/**
 * Retrieves license status with cross-store healing.
 */
export const getSubscriptionStatus = async () => {
  // 1. Check primary persistent store
  let expiryStr = await getConfig(STORAGE_KEY_EXPIRY);
  
  // 2. Fallback to secondary store
  if (!expiryStr) {
    expiryStr = localStorage.getItem(STORAGE_KEY_EXPIRY);
    // Heal primary store if found in secondary
    if (expiryStr) {
      await saveConfig(STORAGE_KEY_EXPIRY, expiryStr);
    }
  } else {
    // Sync back to secondary store for redundancy
    localStorage.setItem(STORAGE_KEY_EXPIRY, expiryStr);
  }
  
  if (!expiryStr) return { active: false, daysLeft: 0 };
  
  const expiry = parseInt(expiryStr, 10);
  const now = Date.now();
  
  if (isNaN(expiry) || now > expiry) {
    return { active: false, daysLeft: 0 };
  }
  
  const diffMs = expiry - now;
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  
  return { active: true, daysLeft };
};

export type ActivationResult = 'SUCCESS' | 'INVALID' | 'ALREADY_USED';

export const activateSubscription = async (code: string): Promise<ActivationResult> => {
  const deviceId = await getDeviceId();
  const upperCode = code.toUpperCase();
  const usedCodes = await getUsedCodes();

  if (usedCodes.includes(upperCode)) {
    return 'ALREADY_USED';
  }

  if (validateActivationCode(upperCode, deviceId)) {
    // Use fixed relative time from NOW to ensure 30 days of access
    const expiryDate = Date.now() + (SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
    const expiryStr = expiryDate.toString();
    
    // Committing to both stores for redundancy
    await saveConfig(STORAGE_KEY_EXPIRY, expiryStr);
    localStorage.setItem(STORAGE_KEY_EXPIRY, expiryStr);
    
    await markCodeAsUsed(upperCode);
    return 'SUCCESS';
  }
  
  return 'INVALID';
};
