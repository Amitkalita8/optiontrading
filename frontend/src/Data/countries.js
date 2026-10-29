// Countries for Settings › Profile: ISO 3166-1 alpha-2 + phone dial code.
// Names are produced per language by Intl.DisplayNames (see i18n).
export const COUNTRIES = [
  { iso: 'AE', dial: '+971' },
  { iso: 'AR', dial: '+54' },
  { iso: 'AT', dial: '+43' },
  { iso: 'AU', dial: '+61' },
  { iso: 'BD', dial: '+880' },
  { iso: 'BE', dial: '+32' },
  { iso: 'BR', dial: '+55' },
  { iso: 'BT', dial: '+975' },
  { iso: 'CA', dial: '+1' },
  { iso: 'CH', dial: '+41' },
  { iso: 'CL', dial: '+56' },
  { iso: 'CN', dial: '+86' },
  { iso: 'CO', dial: '+57' },
  { iso: 'CZ', dial: '+420' },
  { iso: 'DE', dial: '+49' },
  { iso: 'DK', dial: '+45' },
  { iso: 'EG', dial: '+20' },
  { iso: 'ES', dial: '+34' },
  { iso: 'FI', dial: '+358' },
  { iso: 'FR', dial: '+33' },
  { iso: 'GB', dial: '+44' },
  { iso: 'GR', dial: '+30' },
  { iso: 'HK', dial: '+852' },
  { iso: 'HU', dial: '+36' },
  { iso: 'ID', dial: '+62' },
  { iso: 'IE', dial: '+353' },
  { iso: 'IL', dial: '+972' },
  { iso: 'IN', dial: '+91' },
  { iso: 'IR', dial: '+98' },
  { iso: 'IT', dial: '+39' },
  { iso: 'JP', dial: '+81' },
  { iso: 'KE', dial: '+254' },
  { iso: 'KR', dial: '+82' },
  { iso: 'KW', dial: '+965' },
  { iso: 'LK', dial: '+94' },
  { iso: 'MX', dial: '+52' },
  { iso: 'MY', dial: '+60' },
  { iso: 'NG', dial: '+234' },
  { iso: 'NL', dial: '+31' },
  { iso: 'NO', dial: '+47' },
  { iso: 'NP', dial: '+977' },
  { iso: 'NZ', dial: '+64' },
  { iso: 'OM', dial: '+968' },
  { iso: 'PH', dial: '+63' },
  { iso: 'PK', dial: '+92' },
  { iso: 'PL', dial: '+48' },
  { iso: 'PT', dial: '+351' },
  { iso: 'QA', dial: '+974' },
  { iso: 'RO', dial: '+40' },
  { iso: 'RU', dial: '+7' },
  { iso: 'SA', dial: '+966' },
  { iso: 'SE', dial: '+46' },
  { iso: 'SG', dial: '+65' },
  { iso: 'TH', dial: '+66' },
  { iso: 'TR', dial: '+90' },
  { iso: 'TW', dial: '+886' },
  { iso: 'UA', dial: '+380' },
  { iso: 'US', dial: '+1' },
  { iso: 'VN', dial: '+84' },
  { iso: 'ZA', dial: '+27' },
];

export const dialFor = (iso) => COUNTRIES.find((c) => c.iso === iso)?.dial;

// Unique dial codes, numeric order.
export const DIAL_CODES = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

// Most of the world writes day-first; these default to month-first.
export const MONTH_FIRST = ['US', 'PH'];
// Year-first by convention.
export const YEAR_FIRST = ['CN', 'JP', 'KR', 'TW', 'HU', 'LT', 'SE'];
