import en from './en';
import hi from './hi';
import es from './es';
import de from './de';
import fr from './fr';
import ru from './ru';

// Supported interface languages (codes match the backend's list).
export const LANGUAGES = {
  en: { strings: en },
  hi: { strings: hi },
  es: { strings: es },
  de: { strings: de },
  fr: { strings: fr },
  ru: { strings: ru },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES);

// Values saved by earlier versions of the Profile page.
const LEGACY_LANGUAGES = { English: 'en', Hindi: 'hi', Spanish: 'es', German: 'de', French: 'fr' };
const LEGACY_TIME_ZONES = {
  'India Standard Time (+5:30)': 'Asia/Kolkata',
  'Eastern Time (ET, -4:00)': 'America/New_York',
  'Pacific Time (PT, -7:00)': 'America/Los_Angeles',
  'UTC (+0:00)': 'UTC',
  'Singapore Time (+8:00)': 'Asia/Singapore',
  'Gulf Standard Time (+4:00)': 'Asia/Dubai',
};

export const normalizeLanguage = (value) => {
  const code = LEGACY_LANGUAGES[value] ?? value;
  return LANGUAGES[code] ? code : 'en';
};

const isValidZone = (zone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const normalizeTimeZone = (value) => {
  const zone = LEGACY_TIME_ZONES[value] ?? value;
  return zone && isValidZone(zone) ? modernZone(zone) : modernZone(browserTimeZone());
};

const fill = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k]))) : text;

// Looks a key up in the language, then English, then returns the key itself
// (so a missing string is visible rather than blank).
export function translate(language, key, vars) {
  const strings = LANGUAGES[normalizeLanguage(language)].strings;
  return fill(strings[key] ?? en[key] ?? key, vars);
}

const localeFor = (code) => (code === 'en' ? 'en-US' : code);

// Formatters bound to a language, time zone (IANA) and date format.
export function makeFormatters({ language, timeZone, dateFormat }) {
  const code = normalizeLanguage(language);
  const locale = localeFor(code);
  const tz = normalizeTimeZone(timeZone);

  const dayParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  const zoneName = new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: 'short' });

  const partsOf = (d) => Object.fromEntries(dayParts.formatToParts(new Date(d)).map((p) => [p.type, p.value]));

  // In the chosen pattern: DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD.
  const formatDate = (d) => {
    const p = partsOf(d);
    return (dateFormat || 'DD/MM/YYYY').replace('DD', p.day).replace('MM', p.month).replace('YYYY', p.year);
  };
  const formatTime = (d) => time.format(new Date(d));
  const formatZone = (d) => zoneName.formatToParts(new Date(d)).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const formatDateTime = (d, { zone = false } = {}) =>
    `${formatDate(d)}, ${formatTime(d)}${zone ? ` ${formatZone(d)}` : ''}`;
  // Calendar day in the chosen zone, for grouping (e.g. Today / Yesterday).
  const dayKey = (d) => {
    const p = partsOf(d);
    return Date.UTC(+p.year, +p.month - 1, +p.day);
  };
  const formatNumber = (n, options) => new Intl.NumberFormat(locale, options).format(n);

  return { locale, code, timeZoneId: tz, formatDate, formatTime, formatDateTime, formatZone, dayKey, formatNumber };
}

// ---------- Option lists for the Profile dropdowns (names in the UI language) ----------

// Some languages return names lower-case ("русский"); list items start upper-case.
const capitalize = (text, locale) => (text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text);

const displayNames = (code, type) => {
  try {
    return new Intl.DisplayNames([localeFor(code), 'en'], { type });
  } catch {
    return null;
  }
};

// [{ value: 'IN', label: 'India', search }] sorted by label.
export function countryOptions(code, countries) {
  const names = displayNames(code, 'region');
  return countries
    .map((c) => {
      const label = names?.of(c.iso) ?? c.iso;
      return { value: c.iso, label, search: `${label} ${c.iso} ${c.dial}`.toLowerCase(), dial: c.dial };
    })
    .sort((a, b) => a.label.localeCompare(b.label, localeFor(code)));
}

// Language names in the UI language, with the native name as a hint.
export function languageOptions(code) {
  const names = displayNames(code, 'language');
  return LANGUAGE_CODES.map((c) => {
    const label = capitalize(names?.of(c) ?? c, localeFor(code));
    const native = capitalize(displayNames(c, 'language')?.of(c) ?? c, localeFor(c));
    return { value: c, label, hint: native !== label ? native : '', search: `${label} ${native} ${c}`.toLowerCase() };
  });
}

// "+5:30" style offset of a zone right now.
function utcOffset(zone, at = new Date()) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(part || '');
  if (!m) return { text: '+0:00', minutes: 0 };
  const hours = Number(m[1]);
  const mins = Number(m[2] || 0);
  return { text: `${hours >= 0 ? '+' : '-'}${Math.abs(hours)}:${String(mins).padStart(2, '0')}`, minutes: hours * 60 + Math.sign(hours || 1) * mins };
}

// Browsers still list some zones under old IANA spellings; use current ones
// (the backend accepts both).
const MODERN_ZONE_NAMES = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Godthab': 'America/Nuuk',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Pacific/Truk': 'Pacific/Chuuk',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Enderbury': 'Pacific/Kanton',
};
const modernZone = (zone) => (MODERN_ZONE_NAMES[zone] && isValidZone(MODERN_ZONE_NAMES[zone]) ? MODERN_ZONE_NAMES[zone] : zone);

let zoneCache = null;
const allZones = () => {
  if (!zoneCache) {
    const list = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : Object.values(LEGACY_TIME_ZONES);
    zoneCache = [...new Set([...list.map(modernZone), 'UTC'])];
  }
  return zoneCache;
};

// Every IANA zone as "India Standard Time (UTC+5:30)", sorted by offset.
// `ensure` adds a saved zone the browser doesn't list (e.g. an alias).
export function timeZoneOptions(code, ensure) {
  const locale = localeFor(code);
  const keep = ensure && modernZone(ensure);
  const zones = keep && !allZones().includes(keep) ? [...allZones(), keep] : allZones();
  return zones
    .map((zone) => {
      let name = zone;
      try {
        name =
          new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'long' })
            .formatToParts(new Date())
            .find((p) => p.type === 'timeZoneName')?.value ?? zone;
      } catch {
        // Unknown to this browser: keep the IANA id.
      }
      const offset = utcOffset(zone);
      const city = zone.split('/').pop().replace(/_/g, ' ');
      return {
        value: zone,
        label: `${capitalize(name, locale)} (UTC${offset.text})`,
        hint: city,
        offset: offset.minutes,
        search: `${name} ${zone} ${city} utc${offset.text} ${offset.text}`.toLowerCase(),
      };
    })
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label));
}
