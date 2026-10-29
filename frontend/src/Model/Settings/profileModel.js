import { getJSON, putJSON } from '../../Utils/api';
import { browserTimeZone, normalizeLanguage, normalizeTimeZone } from '../../i18n';
import { COUNTRIES, dialFor, MONTH_FIRST, YEAR_FIRST } from '../../Data/countries';

// Settings › Profile. The backend (GET/PUT /api/profile, keyed by the
// signed-in email) is the source of truth; a copy is cached in this browser
// so the language and date format apply instantly on the next visit.

const CACHE_KEY = 'kushmanda.profileSettings';

export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

const COUNTRY_NAMES = {
  India: 'IN',
  'United States': 'US',
  'United Kingdom': 'GB',
  Singapore: 'SG',
  'United Arab Emirates': 'AE',
};

const dateFormatFor = (iso) => (MONTH_FIRST.includes(iso) ? 'MM/DD/YYYY' : YEAR_FIRST.includes(iso) ? 'YYYY-MM-DD' : 'DD/MM/YYYY');

// Region and language from the browser, e.g. "en-IN" -> IN / en.
function browserDefaults() {
  const tag = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
  const [lang, region] = tag.split('-');
  const iso = COUNTRIES.some((c) => c.iso === region?.toUpperCase()) ? region.toUpperCase() : 'IN';
  return { iso, language: normalizeLanguage(lang) };
}

// A profile for someone who hasn't saved one yet.
export function defaultProfile(user) {
  const fullName = user?.name?.trim() || '';
  const { iso, language } = browserDefaults();
  return {
    fullName,
    displayName: fullName.split(/\s+/)[0] || '',
    email: user?.email || '',
    countryCode: dialFor(iso) || '+91',
    phone: '',
    country: iso,
    language,
    timeZone: browserTimeZone(),
    dateFormat: dateFormatFor(iso),
    // Only uploaded photos are stored; a Google picture is shown, not saved.
    photo: '',
  };
}

// Brings values saved by older versions (country names, "English",
// "India Standard Time (+5:30)") up to codes and IANA zones.
export function normalizeProfile(p, user) {
  const base = defaultProfile(user);
  const merged = { ...base, ...p };
  const country = COUNTRY_NAMES[merged.country] ?? String(merged.country || '').toUpperCase();
  return {
    ...merged,
    fullName: merged.fullName || base.fullName,
    displayName: merged.displayName || base.displayName,
    email: base.email || merged.email || '',
    country: COUNTRIES.some((c) => c.iso === country) ? country : base.country,
    language: normalizeLanguage(merged.language),
    timeZone: normalizeTimeZone(merged.timeZone),
    dateFormat: DATE_FORMATS.includes(merged.dateFormat) ? merged.dateFormat : base.dateFormat,
    phone: String(merged.phone || '').replace(/\D/g, ''),
    photo: isUploadedPhoto(merged.photo) ? merged.photo : '',
  };
}

const isUploadedPhoto = (photo) => typeof photo === 'string' && photo.startsWith('data:image/');

const cacheKey = (user) => `${CACHE_KEY}:${(user?.email || 'guest').toLowerCase()}`;

// Last known profile for instant start-up (never throws).
export function loadCachedProfile(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(user)));
    return normalizeProfile(saved || {}, user);
  } catch {
    return defaultProfile(user);
  }
}

function cacheProfile(user, profile) {
  try {
    localStorage.setItem(cacheKey(user), JSON.stringify(profile));
  } catch {
    // Storage full or blocked: the backend still has it.
  }
}

// Loads from the backend. With no saved profile yet, starts from the cache
// (e.g. preferences from an earlier version) or sensible defaults.
export async function fetchProfile(user) {
  const { profile } = await getJSON('/api/profile');
  const result = profile ? normalizeProfile(profile, user) : loadCachedProfile(user);
  cacheProfile(user, result);
  return result;
}

// Saves to the backend. Throws ApiError with `fields` on validation errors.
export async function saveProfile(user, draft) {
  const body = { ...draft };
  delete body.email; // identity comes from the session, not the form
  const { profile } = await putJSON('/api/profile', body);
  const saved = normalizeProfile(profile, user);
  cacheProfile(user, saved);
  return saved;
}

export const initialsOf = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

// 9876543103 -> 9******103
export const maskPhone = (digits) =>
  digits.length > 4 ? `${digits[0]}${'*'.repeat(digits.length - 4)}${digits.slice(-3)}` : digits;

// Field -> translation key for errors (client checks and backend `fields`).
export const FIELD_ERROR_KEYS = {
  fullName: 'profile.errName',
  displayName: 'profile.errDisplayName',
  countryCode: 'profile.errCountryCode',
  phone: 'profile.errPhone',
  country: 'profile.errCountry',
  language: 'profile.errLanguage',
  timeZone: 'profile.errTimeZone',
  dateFormat: 'profile.errDateFormat',
  photo: 'profile.errPhoto',
};

// Quick checks before sending (the backend validates again).
export function validateProfile(p) {
  const errors = {};
  if (!p.fullName.trim()) errors.fullName = FIELD_ERROR_KEYS.fullName;
  if (p.displayName.trim().length > 40) errors.displayName = FIELD_ERROR_KEYS.displayName;
  if (p.phone && !/^\d{6,14}$/.test(p.phone)) errors.phone = FIELD_ERROR_KEYS.phone;
  return errors;
}

// Shrinks an uploaded image to a square JPEG data URL.
// Rejects with a translation key as the message.
export function resizePhoto(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('profile.errImage'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas
        .getContext('2d')
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('profile.errImageRead'));
    };
    img.src = url;
  });
}
