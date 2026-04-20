import {
  BUILDING_CONFIGS,
  BUILDING_KEYS,
  BUILDINGS,
  EVENT_PRESET,
  EVENT_PRESETS,
  ROOMINGKOS_EVENT_PRESET,
  SPIRE_EVENT_PRESET,
  getEventPreset,
} from './config/eventConfig';

const env = import.meta.env;

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim() || 'AIzaSyCzOfUMmq4QtR7JAvEHkwAZSSbwDez8JN4',
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || 'rk-events-bracket-2708088.firebaseapp.com',
  databaseURL:
    env.VITE_FIREBASE_DATABASE_URL?.trim() ||
    'https://rk-events-bracket-2708088-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() || 'rk-events-bracket-2708088',
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || 'rk-events-bracket-2708088.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '924533299346',
  appId:
    env.VITE_FIREBASE_APP_ID?.trim() || '1:924533299346:web:b181b022666c200a90ae4b',
} as const;

export const EVENT_STATE_STORAGE_PREFIX = 'rk_event_state_v2_';
export const MAX_PLAYERS = 16;
export const ADMIN_SESSION_ENDPOINT = '/api/admin/session';
export const EVENT_REGISTRATION_ENDPOINT = '/api/events/register';
export const EVENT_TITLE = EVENT_PRESET.title;
export const EVENT_SHARE_TEXT = EVENT_PRESET.shareText;

export const ROOT_PATH = '/';
export const ADMIN_PATH = '/admin';

export const NODE_WIDTH = 124;
export const NODE_HEIGHT = 42;
export const THIRD_PLACE_PANEL_WIDTH = 396;
export const THIRD_PLACE_PANEL_GAP = 32;
export const PROFILE_CARD_MARGIN = 16;
export const PROFILE_CARD_GAP = 18;
export const SLOT_GAP = 16;
export const X_PADDING = 60;
export const TOP_PADDING = 76;
export const ROW_GAP = 132;
export const BOTTOM_PADDING = 48;

export const FIREBASE_MAX_RETRIES = 3;
export const FIREBASE_RETRY_BASE_DELAY_MS = 3000;

export {
  BUILDING_CONFIGS,
  BUILDING_KEYS,
  BUILDINGS,
  EVENT_PRESET,
  EVENT_PRESETS,
  ROOMINGKOS_EVENT_PRESET,
  SPIRE_EVENT_PRESET,
  getEventPreset,
};
