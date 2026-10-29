import { useState } from 'react';
import { useT } from '../../../../Controller/LocaleContext';
import { HELP_CATEGORIES, LEGAL_DOCS, PLATFORM_HELP, SUPPORT_EMAIL } from '../../../../Data/settingsContent';
import { Chevron, HELP_ICONS, SearchIcon } from './HelpIcons';
import '../SettingsSection.css';
import './HelpLegal.css';

const matches = (q, ...fields) => fields.some((f) => f.toLowerCase().includes(q));

// Settings › Help & Legal. Articles and documents are planned content, so
// opening one confirms with a toast for now; search filters what is listed
// (in the user's language).
function HelpLegal({ onNotice }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const categories = HELP_CATEGORIES.map((c) => ({
    ...c,
    title: t(`help.cat.${c.key}`),
    description: t(`help.cat.${c.key}Desc`),
  })).filter((c) => !q || matches(q, c.title, c.description));
  const topics = PLATFORM_HELP.map((k) => t(`help.topic.${k}`)).filter((title) => !q || matches(q, title));
  const docs = LEGAL_DOCS.map((k) => ({ key: k, title: t(`help.doc.${k}`), description: t(`help.doc.${k}Desc`) }));
  const open = (title) => onNotice?.(t('common.comingSoon', { title }));

  return (
    <div className="settings-tab">
      <header>
        <h1 className="settings-tab__title">{t('settings.legal')}</h1>
        <p className="settings-tab__subtitle">{t('help.subtitle')}</p>
      </header>

      <div className="help-layout">
        <section className="settings-card" aria-labelledby="help-center">
          <h2 id="help-center" className="settings-card__title">{t('help.center')}</h2>
          <p className="settings-card__lead">{t('help.centerLead')}</p>
          <label className="help-search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('help.search')}
              aria-label={t('help.search')}
            />
          </label>
          <p className="help-subhead">{t('help.planned')}</p>
          {categories.length === 0 ? (
            <p className="help-empty">{t('help.noMatch', { query })}</p>
          ) : (
            <div>
              {categories.map((c) => (
                <button key={c.key} type="button" className="settings-link-row" onClick={() => open(c.title)}>
                  <span className="help-category__icon">{HELP_ICONS[c.icon]}</span>
                  <span className="settings-link-row__text">
                    <span className="settings-link-row__title">{c.title}</span>
                    <span className="settings-link-row__desc">{c.description}</span>
                  </span>
                  <Chevron />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="help-side">
          <section className="settings-card" aria-labelledby="help-contact">
            <h2 id="help-contact" className="settings-card__title">{t('help.contact')}</h2>
            <p className="settings-card__lead">{t('help.contactLead')}</p>
            <a className="settings-soft-btn help-contact" href={`mailto:${SUPPORT_EMAIL}?subject=Option%20Seller%20support`}>
              {t('help.contact')}
            </a>
          </section>

          <section className="settings-card" aria-labelledby="help-platform">
            <h2 id="help-platform" className="settings-card__title">{t('help.platform')}</h2>
            <p className="settings-card__lead">{t('help.platformLead')}</p>
            {topics.length === 0 ? (
              <p className="help-empty">{t('help.noTopics')}</p>
            ) : (
              <div>
                {topics.map((title) => (
                  <button key={title} type="button" className="settings-link-row help-topic" onClick={() => open(title)}>
                    <span className="settings-link-row__text">
                      <span className="settings-link-row__title">{title}</span>
                    </span>
                    <Chevron />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="settings-card" aria-labelledby="help-legal">
        <h2 id="help-legal" className="settings-card__title">{t('help.legal')}</h2>
        <p className="settings-card__lead">{t('help.legalLead')}</p>
        <div className="legal-grid">
          {docs.map((d) => (
            <button key={d.key} type="button" className="settings-link-row" onClick={() => open(d.title)}>
              <span className="settings-link-row__text">
                <span className="settings-link-row__title legal-title">{d.title}</span>
                <span className="settings-link-row__desc">{d.description}</span>
              </span>
              <Chevron />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HelpLegal;
