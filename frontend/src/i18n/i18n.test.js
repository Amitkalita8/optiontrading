import { COUNTRIES } from '../Data/countries';
import {
  countryOptions,
  LANGUAGES,
  languageOptions,
  makeFormatters,
  normalizeLanguage,
  normalizeTimeZone,
  timeZoneOptions,
  translate,
} from '.';

const en = LANGUAGES.en.strings;
const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join();

describe.each(['hi', 'es', 'de', 'fr', 'ru'])('%s strings', (code) => {
  const strings = LANGUAGES[code].strings;

  test('cover every English key', () => {
    expect(Object.keys(en).filter((k) => !(k in strings))).toEqual([]);
  });

  test('have no keys English lacks', () => {
    expect(Object.keys(strings).filter((k) => !(k in en))).toEqual([]);
  });

  test('keep the same {placeholders}', () => {
    expect(Object.keys(strings).filter((k) => placeholders(strings[k]) !== placeholders(en[k]))).toEqual([]);
  });
});

test('translate fills placeholders and falls back to English, then the key', () => {
  expect(translate('hi', 'notif.unreadCount', { n: 3 })).toBe('3 अपठित');
  expect(translate('ru', 'common.cancel')).toBe('Отмена');
  expect(translate('de', 'no.such.key')).toBe('no.such.key');
  expect(translate('xx', 'common.cancel')).toBe('Cancel');
});

test('legacy profile values map to codes and IANA zones', () => {
  expect(normalizeLanguage('Hindi')).toBe('hi');
  expect(normalizeLanguage('ru')).toBe('ru');
  expect(normalizeTimeZone('India Standard Time (+5:30)')).toBe('Asia/Kolkata');
  expect(normalizeTimeZone('Asia/Kathmandu')).toBe('Asia/Kathmandu');
});

test('formatters follow the date format and time zone', () => {
  const at = '2026-10-23T20:30:00Z'; // 24 Oct 02:00 in India, 23 Oct 16:30 in New York
  const india = makeFormatters({ language: 'en', timeZone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY' });
  const ny = makeFormatters({ language: 'en', timeZone: 'America/New_York', dateFormat: 'YYYY-MM-DD' });

  expect(india.formatDate(at)).toBe('24/10/2026');
  expect(ny.formatDate(at)).toBe('2026-10-23');
  expect(india.dayKey(at) - ny.dayKey(at)).toBe(24 * 60 * 60 * 1000);
  expect(makeFormatters({ language: 'en', timeZone: 'UTC', dateFormat: 'MM/DD/YYYY' }).formatDate(at)).toBe('10/23/2026');
});

test('option lists for the Profile dropdowns', () => {
  const countries = countryOptions('en', COUNTRIES);
  expect(countries.find((c) => c.value === 'IN').label).toBe('India');
  expect(countries.find((c) => c.value === 'UA').search).toContain('ukraine');

  expect(languageOptions('en').map((l) => l.value)).toEqual(['en', 'hi', 'es', 'de', 'fr', 'ru']);

  const zones = timeZoneOptions('en', 'Asia/Kolkata');
  const kolkata = zones.find((z) => z.value === 'Asia/Kolkata' || z.value === 'Asia/Calcutta');
  expect(kolkata.label).toMatch(/UTC\+5:30/);
  expect(zones.some((z) => /UTC\+5:45/.test(z.label))).toBe(true); // Nepal
  // Sorted west to east.
  expect(zones[0].offset).toBeLessThanOrEqual(zones[zones.length - 1].offset);
});
