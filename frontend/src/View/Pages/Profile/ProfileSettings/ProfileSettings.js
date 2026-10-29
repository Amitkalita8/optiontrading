import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../Components/UserAuthentication/AuthContext/AuthContext';
import { useLocale } from '../../../../Controller/LocaleContext';
import useAsyncData from '../../../../Controller/useAsyncData';
import { COUNTRIES, DIAL_CODES, dialFor } from '../../../../Data/countries';
import { countryOptions, languageOptions, timeZoneOptions, translate as translateNow } from '../../../../i18n';
import {
  DATE_FORMATS,
  FIELD_ERROR_KEYS,
  fetchProfile,
  initialsOf,
  maskPhone,
  resizePhoto,
  saveProfile,
  validateProfile,
} from '../../../../Model/Settings/profileModel';
import SearchSelect from '../../../Components/Common/SearchSelect/SearchSelect';
import Skeleton from '../../../Components/Common/Skeleton/Skeleton';
import CountryFlag from './CountryFlag';
import '../SettingsSection.css';
import './ProfileSettings.css';

const Chevron = () => (
  <svg className="profile-select__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const sameProfile = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Settings › Profile: loads and saves through the backend (/api/profile).
// Edits are a draft until Save; the name and photo also update the account
// in the sidebar, and language / time zone / date format apply app-wide.
function ProfileSettings({ onNotice }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const fetcher = useCallback(() => fetchProfile(user), [user]);
  const { data, status, reload } = useAsyncData(fetcher);

  if (status === 'loading' && !data) return <ProfileSkeleton title={t('settings.profile')} />;
  if (status === 'error' && !data) {
    return (
      <div className="settings-tab">
        <h1 className="settings-tab__title">{t('settings.profile')}</h1>
        <div className="settings-card profile-load-error" role="alert">
          <p>{t('profile.loadError')}</p>
          <button type="button" className="settings-soft-btn" onClick={reload}>
            {t('profile.retry')}
          </button>
        </div>
      </div>
    );
  }
  return <ProfileForm key={data.updatedAt ?? 'new'} initial={data} onNotice={onNotice} />;
}

function ProfileForm({ initial, onNotice }) {
  const { user, updateUser } = useAuth();
  const { t, code, setRegional } = useLocale();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const fileRef = useRef(null);
  const phoneRef = useRef(null);

  const countries = useMemo(() => countryOptions(code, COUNTRIES), [code]);
  const languages = useMemo(() => languageOptions(code), [code]);
  const zones = useMemo(() => timeZoneOptions(code, draft.timeZone), [code, draft.timeZone]);
  const formats = useMemo(() => DATE_FORMATS.map((f) => ({ value: f, label: f })), []);

  const dirty = !sameProfile(draft, saved);
  const set = (field) => (value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  };
  const errorText = (field) => errors[field] && t(errors[field]);

  // Picking a country also suggests its dial code while no phone is set.
  const pickCountry = (iso) => {
    setDraft((d) => ({ ...d, country: iso, countryCode: d.phone ? d.countryCode : dialFor(iso) ?? d.countryCode }));
    setErrors((e) => ({ ...e, country: undefined }));
  };

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      set('photo')(await resizePhoto(file));
      onNotice?.(t('profile.photoReady'));
    } catch (err) {
      onNotice?.(t(err.message));
    }
  };

  const startPhoneEdit = () => {
    setEditingPhone(true);
    requestAnimationFrame(() => phoneRef.current?.focus());
  };

  const cancel = () => {
    setDraft(saved);
    setErrors({});
    setEditingPhone(false);
  };

  const save = async () => {
    const next = { ...draft, fullName: draft.fullName.trim(), displayName: draft.displayName.trim() };
    const found = validateProfile(next);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const stored = await saveProfile(user, next);
      setSaved(stored);
      setDraft(stored);
      setEditingPhone(false);
      setRegional({ language: stored.language, timeZone: stored.timeZone, dateFormat: stored.dateFormat });
      if (user) updateUser({ name: stored.fullName, photo: stored.photo || null });
      onNotice?.(translateNow(stored.language, 'profile.saved'));
    } catch (err) {
      const fields = Object.fromEntries(
        Object.keys(err.fields ?? {}).map((f) => [f, FIELD_ERROR_KEYS[f] ?? 'profile.errSave']),
      );
      setErrors(Object.keys(fields).length ? fields : { form: 'profile.errSave' });
      if (fields.phone) setEditingPhone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-tab profile-settings">
      <header>
        <h1 className="settings-tab__title">{t('settings.profile')}</h1>
        <p className="settings-tab__subtitle">{t('profile.subtitle')}</p>
      </header>

      <section className="settings-card profile-hero" aria-label={t('menu.account')}>
        <div className="profile-hero__avatar">
          {draft.photo || user?.picture ? (
            <img src={draft.photo || user.picture} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span>{initialsOf(draft.fullName)}</span>
          )}
        </div>
        <div className="profile-hero__text">
          <p className="profile-hero__name">{draft.fullName || t('profile.yourName')}</p>
          <p className="profile-hero__email">{draft.email}</p>
          <span className="profile-hero__status">{t('common.active')}</span>
        </div>
        <div className="profile-hero__actions">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
          <button type="button" className="settings-soft-btn" onClick={() => fileRef.current?.click()}>
            {t('profile.changePhoto')}
          </button>
          {draft.photo && (
            <button type="button" className="profile-hero__remove" onClick={() => set('photo')('')}>
              {t('profile.removePhoto')}
            </button>
          )}
          {errors.photo && <span className="field-error">{errorText('photo')}</span>}
        </div>
      </section>

      <section className="settings-card" aria-labelledby="profile-personal">
        <h2 id="profile-personal" className="settings-card__title">{t('profile.personalTitle')}</h2>
        <p className="settings-card__lead">{t('profile.personalLead')}</p>
        <div className="profile-grid">
          <div className="profile-field">
            <label htmlFor="profile-full-name">{t('profile.fullName')}</label>
            <div className={`profile-field__line ${errors.fullName ? 'profile-field__line--error' : ''}`}>
              <input
                id="profile-full-name"
                value={draft.fullName}
                onChange={(e) => set('fullName')(e.target.value)}
                autoComplete="name"
                maxLength={80}
              />
            </div>
            {errors.fullName && <span className="field-error">{errorText('fullName')}</span>}
          </div>

          <div className="profile-field">
            <label htmlFor="profile-display-name">{t('profile.displayName')}</label>
            <div className={`profile-field__line ${errors.displayName ? 'profile-field__line--error' : ''}`}>
              <input
                id="profile-display-name"
                value={draft.displayName}
                onChange={(e) => set('displayName')(e.target.value)}
                autoComplete="nickname"
                maxLength={40}
              />
            </div>
            {errors.displayName && <span className="field-error">{errorText('displayName')}</span>}
          </div>

          <div className="profile-field">
            <label htmlFor="profile-email">{t('profile.email')}</label>
            <div className="profile-field__line">
              <input id="profile-email" value={draft.email} readOnly className="profile-field__readonly" />
              <button type="button" className="profile-field__action" onClick={() => onNotice?.(t('profile.emailLocked'))}>
                {t('profile.changeEmail')}
              </button>
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="profile-phone">{t('profile.phone')}</label>
            <div className={`profile-field__line ${errors.phone || errors.countryCode ? 'profile-field__line--error' : ''}`}>
              <span className="profile-field__dial">
                <select
                  aria-label={t('profile.countryCode')}
                  value={draft.countryCode}
                  onChange={(e) => set('countryCode')(e.target.value)}
                >
                  {DIAL_CODES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Chevron />
              </span>
              {editingPhone ? (
                <input
                  id="profile-phone"
                  ref={phoneRef}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={draft.phone}
                  onChange={(e) => set('phone')(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder={t('profile.phone')}
                />
              ) : (
                <input
                  id="profile-phone"
                  readOnly
                  className="profile-field__readonly"
                  value={draft.phone ? maskPhone(draft.phone) : ''}
                  placeholder={t('profile.notAdded')}
                />
              )}
              {!editingPhone && (
                <button type="button" className="profile-field__action" onClick={startPhoneEdit}>
                  {t(draft.phone ? 'profile.changePhone' : 'profile.addPhone')}
                </button>
              )}
            </div>
            {(errors.phone || errors.countryCode) && (
              <span className="field-error">{errorText('phone') || errorText('countryCode')}</span>
            )}
          </div>
        </div>
      </section>

      <section className="settings-card profile-regional-card" aria-labelledby="profile-regional">
        <h2 id="profile-regional" className="settings-card__title">{t('profile.regionalTitle')}</h2>
        <p className="settings-card__lead">{t('profile.regionalLead')}</p>
        <div className="profile-regional">
          <SearchSelect
            id="profile-country"
            label={t('profile.country')}
            value={draft.country}
            options={countries}
            onChange={pickCountry}
            searchable
            searchPlaceholder={t('profile.searchCountry')}
            noResults={t('profile.noResults')}
            renderIcon={(o) => <CountryFlag iso={o.value} />}
            error={errorText('country')}
          />
          <SearchSelect
            id="profile-language"
            label={t('profile.language')}
            value={draft.language}
            options={languages}
            onChange={set('language')}
            searchable
            searchPlaceholder={t('profile.searchLanguage')}
            noResults={t('profile.noResults')}
            error={errorText('language')}
          />
          <SearchSelect
            id="profile-tz"
            label={t('profile.timeZone')}
            value={draft.timeZone}
            options={zones}
            onChange={set('timeZone')}
            searchable
            searchPlaceholder={t('profile.searchTimeZone')}
            noResults={t('profile.noResults')}
            error={errorText('timeZone')}
          />
          <SearchSelect
            id="profile-df"
            label={t('profile.dateFormat')}
            value={draft.dateFormat}
            options={formats}
            onChange={set('dateFormat')}
            error={errorText('dateFormat')}
          />
        </div>
        <p className="profile-note">{t('profile.regionalNote')}</p>
      </section>

      {errors.form && (
        <p className="profile-form-error" role="alert">
          {t(errors.form)}
        </p>
      )}
      <div className="profile-actions">
        <button type="button" className="profile-actions__cancel" onClick={cancel} disabled={!dirty || busy}>
          {t('common.cancel')}
        </button>
        <button type="button" className="profile-actions__save" onClick={save} disabled={!dirty || busy}>
          {busy ? t('profile.saving') : t('common.saveChanges')}
        </button>
      </div>
    </div>
  );
}

function ProfileSkeleton({ title }) {
  return (
    <div className="settings-tab" aria-busy="true" aria-label={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width={160} height={34} />
        <Skeleton width={380} height={16} />
      </div>
      <div className="settings-card profile-hero">
        <Skeleton width={132} height={132} radius="50%" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <Skeleton width={200} height={28} />
          <Skeleton width={240} height={18} />
          <Skeleton width={90} height={38} radius={10} />
        </div>
      </div>
      <div className="settings-card">
        <Skeleton width={260} height={26} />
        <div className="profile-grid" style={{ marginTop: 24 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={56} />
          ))}
        </div>
      </div>
      <div className="settings-card">
        <Skeleton width={260} height={26} />
        <div className="profile-regional" style={{ marginTop: 24 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={60} radius={10} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
