import { useState } from 'react';
import { useAppearance } from '../../../../Controller/AppearanceContext';
import { useT } from '../../../../Controller/LocaleContext';
import { resolveTheme } from '../../../../Model/Appearance/appearanceModel';
import { DENSITY_OPTIONS, THEME_OPTIONS } from '../../../../Data/appearanceSamples';
import ChoiceCard from '../../../Components/Appearance/ChoiceCard/ChoiceCard';
import QuotesPreview from '../../../Components/Appearance/QuotesPreview/QuotesPreview';
import DensitySample from '../../../Components/Appearance/DensitySample/DensitySample';
import './AppearanceSettings.css';

// Settings › Appearance. Choices are previewed on this page and applied to
// the whole app on Save; Cancel goes back to the saved preferences.
function AppearanceSettings({ onSaved }) {
  const { appearance, setAppearance } = useAppearance();
  const t = useT();
  const [draft, setDraft] = useState(appearance);
  const dirty = draft.theme !== appearance.theme || draft.density !== appearance.density;

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const save = () => {
    setAppearance(draft);
    onSaved?.(t('appearance.saved'));
  };

  return (
    <div className="appearance">
      <header>
        <h1 className="appearance__title">{t('settings.appearance')}</h1>
        <p className="appearance__subtitle">{t('appearance.subtitle')}</p>
      </header>

      <section className="appearance__section" aria-labelledby="appearance-theme">
        <h2 id="appearance-theme" className="appearance__heading">{t('appearance.theme')}</h2>
        <p className="appearance__lead">{t('appearance.themeLead')}</p>
        <div className="appearance__grid appearance__grid--themes" role="radiogroup" aria-labelledby="appearance-theme">
          {THEME_OPTIONS.map((o) => (
            <ChoiceCard
              key={o.value}
              name="theme"
              value={o.value}
              checked={draft.theme === o.value}
              onChange={(theme) => update({ theme })}
              label={t(o.label)}
              description={t(o.description)}
              previewFirst
              preview={<QuotesPreview theme={resolveTheme(o.value)} size="mini" rows={2} />}
            />
          ))}
        </div>
      </section>

      <section className="appearance__section" aria-labelledby="appearance-density">
        <h2 id="appearance-density" className="appearance__heading">{t('appearance.density')}</h2>
        <p className="appearance__lead">{t('appearance.densityLead')}</p>
        <div className="appearance__grid appearance__grid--density" role="radiogroup" aria-labelledby="appearance-density">
          {DENSITY_OPTIONS.map((d) => (
            <ChoiceCard
              key={d.value}
              name="density"
              value={d.value}
              checked={draft.density === d.value}
              onChange={(density) => update({ density })}
              label={t(d.label)}
              description={t(d.description)}
              preview={<DensitySample density={d.value} rows={d.rows} />}
            />
          ))}
        </div>
      </section>

      <section className="appearance__section" aria-labelledby="appearance-preview">
        <h2 id="appearance-preview" className="appearance__heading">{t('appearance.preview')}</h2>
        <p className="appearance__lead">{t('appearance.previewLead')}</p>
        <QuotesPreview theme={resolveTheme(draft.theme)} density={draft.density} />
      </section>

      <footer className="appearance__footer">
        <p className="appearance__note">{t('appearance.note')}</p>
        <div className="appearance__actions">
          <button type="button" className="appearance__cancel" onClick={() => setDraft(appearance)} disabled={!dirty}>
            {t('common.cancel')}
          </button>
          <button type="button" className="appearance__save" onClick={save} disabled={!dirty}>
            {t('common.saveChanges')}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default AppearanceSettings;
