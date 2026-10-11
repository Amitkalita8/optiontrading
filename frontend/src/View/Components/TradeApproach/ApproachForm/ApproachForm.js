import { useState } from 'react';
import { ACCOUNT_CAPITAL } from '../../../../Model/Approaches/approachModel';
import ChoiceGroup from '../../Common/ChoiceGroup/ChoiceGroup';
import FormSection from '../FormSection/FormSection';
import StrategyPicker from '../StrategyPicker/StrategyPicker';
import PercentField from '../PercentField/PercentField';
import './ApproachForm.css';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const presets = (values) => values.map((v) => ({ value: v, label: `${v}%` }));

const SearchIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.5-4.5M8 10.5h5M10.5 8v5" />
  </svg>
);

const SlidersIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4" />
  </svg>
);

// Discovery Preferences + Position Management for a trade approach.
// `values` is the approach input; `onChange(patch)` merges changes;
// `errors` maps field names to messages (from validation or the backend).
function ApproachForm({ values, onChange, options, errors = {} }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = (field) => (v) => onChange({ [field]: v });
  const maxDollars = typeof values.maxPosition === 'number' ? (ACCOUNT_CAPITAL * values.maxPosition) / 100 : 0;

  return (
    <>
      <FormSection icon={SearchIcon} title="Discovery Preferences" subtitle="Pre-trade filters and scanner eligibility">
        <StrategyPicker
          options={options.strategies}
          value={values.strategies}
          onChange={set('strategies')}
          error={errors.strategies}
        />
        <ChoiceGroup
          label="Strike Moneyness"
          options={options.moneyness}
          value={values.moneyness}
          onChange={set('moneyness')}
          error={errors.moneyness}
        />
        <ChoiceGroup
          label="Target Holding Duration"
          options={options.holdingPeriods}
          value={values.holdingPeriod}
          onChange={set('holdingPeriod')}
          error={errors.holdingPeriod}
        />
        <PercentField
          label="Minimum Target Yield"
          value={values.minYield}
          onChange={set('minYield')}
          hint="min threshold"
          min={0}
          max={100}
          error={errors.minYield}
        />
        <ChoiceGroup
          label="Risk Classification"
          options={options.risks}
          value={values.risk}
          onChange={set('risk')}
          error={errors.risk}
        />
      </FormSection>

      <FormSection icon={SlidersIcon} title="Position Management" subtitle="Rules governing live positions and automated exits">
        <ChoiceGroup
          label="Take-Profit Trigger"
          options={presets(options.takeProfitPresets)}
          value={values.takeProfit}
          onChange={set('takeProfit')}
          custom={{ suffix: '% of max profit', min: 1, max: 500 }}
          error={errors.takeProfit}
        />
        <ChoiceGroup
          label="Stop-Loss Threshold"
          options={presets(options.stopLossPresets)}
          value={values.stopLoss}
          onChange={set('stopLoss')}
          custom={{ suffix: '% loss', min: 1, max: 100 }}
          error={errors.stopLoss}
        />
        <PercentField
          className="span-2"
          label="Max Position Sizing"
          value={values.maxPosition}
          onChange={set('maxPosition')}
          hint={`${usd.format(maxDollars)} max committed per underlying`}
          min={0}
          max={100}
          error={errors.maxPosition}
        />

        <div className="span-2 approach-form__advanced">
          <button
            type="button"
            className="approach-form__advanced-toggle"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((s) => !s)}
          >
            <span aria-hidden="true">{showAdvanced ? '−' : '+'}</span> Advanced parameters (DTE close threshold,
            assignment &amp; auto-roll triggers)
          </button>

          {showAdvanced && (
            <div className="approach-form__advanced-body">
              <PercentField
                label="DTE Close Threshold"
                value={values.dteCloseThreshold}
                onChange={set('dteCloseThreshold')}
                suffix="days"
                step={1}
                min={0}
                max={365}
                hint="before expiry · 0 = off"
                error={errors.dteCloseThreshold}
              />
              <ChoiceGroup
                label="Assignment Handling"
                options={options.assignmentHandling}
                value={values.assignmentHandling}
                onChange={set('assignmentHandling')}
                error={errors.assignmentHandling}
              />
              <label className="approach-form__switch span-2">
                <input
                  type="checkbox"
                  role="switch"
                  checked={values.autoRoll}
                  onChange={(e) => onChange({ autoRoll: e.target.checked })}
                />
                <span className="approach-form__switch-track" aria-hidden="true" />
                <span>
                  <b>Auto-roll</b> — roll positions forward automatically when the take-profit or DTE threshold is
                  reached
                </span>
              </label>
            </div>
          )}
        </div>
      </FormSection>
    </>
  );
}

export default ApproachForm;
