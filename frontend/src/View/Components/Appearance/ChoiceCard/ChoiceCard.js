import { useT } from '../../../../Controller/LocaleContext';
import './ChoiceCard.css';

// A selectable card backed by a real radio input (keyboard + screen reader
// friendly). `preview` sits above the title for theme cards, below the
// description for density cards.
function ChoiceCard({ name, value, checked, onChange, label, description, preview, previewFirst = false }) {
  const t = useT();
  return (
    <label className={`choice-card ${checked ? 'choice-card--checked' : ''}`}>
      <input
        type="radio"
        className="visually-hidden"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      {previewFirst && preview}
      <span className="choice-card__head">
        <span className="choice-card__label">{label}</span>
        <span className="choice-card__state">
          {checked && <span className="choice-card__selected">{t('common.selected')}</span>}
          <span className="choice-card__radio" aria-hidden="true" />
        </span>
      </span>
      <span className="choice-card__desc">{description}</span>
      {!previewFirst && preview}
    </label>
  );
}

export default ChoiceCard;
