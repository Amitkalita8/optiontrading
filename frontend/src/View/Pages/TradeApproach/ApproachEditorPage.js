import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import {
  DEFAULT_APPROACH,
  createApproach,
  fetchApproachOptions,
  fetchApproaches,
  toInput,
  updateApproach,
} from '../../../Model/Approaches/approachModel';
import FlowPage from '../../Components/Layout/FlowPage/FlowPage';
import Card from '../../Components/Common/Card/Card';
import { ApproachEditorBodySkeleton } from './ApproachEditorSkeleton';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import SegmentedControl from '../../Components/Common/SegmentedControl/SegmentedControl';
import ApproachOption from '../../Components/TradeApproach/ApproachOption/ApproachOption';
import ApproachForm from '../../Components/TradeApproach/ApproachForm/ApproachForm';
import './ApproachEditorPage.css';

const MODES = [
  { value: 'existing', label: 'Existing approach' },
  { value: 'new', label: 'Create new approach' },
];

// Checks the backend also enforces, so most mistakes show before submitting.
function validate(v) {
  const errors = {};
  const pct = (n, max) => typeof n === 'number' && n > 0 && n <= max;
  if (!v.name.trim()) errors.name = 'Give the approach a name.';
  if (v.strategies.length === 0) errors.strategies = 'Choose at least one strategy.';
  if (!pct(v.minYield, 100)) errors.minYield = 'Enter a yield between 0 and 100%.';
  if (!pct(v.takeProfit, 500)) errors.takeProfit = 'Enter a take-profit between 1 and 500%.';
  if (!pct(v.stopLoss, 100)) errors.stopLoss = 'Enter a stop-loss between 1 and 100%.';
  if (!pct(v.maxPosition, 100)) errors.maxPosition = 'Enter a position size between 0 and 100%.';
  const dte = v.dteCloseThreshold;
  if (!(Number.isInteger(dte) && dte >= 0 && dte <= 365)) errors.dteCloseThreshold = 'Enter 0–365 days.';
  return errors;
}

// Create a new approach, or pick an existing one and edit it.
// Routes: /trade-approaches/new  and  /trade-approaches/:id/edit
function ApproachEditorPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const options = useAsyncData(fetchApproachOptions);
  const list = useAsyncData(fetchApproaches);

  const [mode, setMode] = useState(routeId ? 'existing' : 'new');
  const [selectedId, setSelectedId] = useState(routeId ? Number(routeId) : null);
  const [values, setValues] = useState(DEFAULT_APPROACH);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // Bumped whenever the form is reloaded with other values, to reset
  // components that keep local UI state (e.g. "Custom" pills).
  const [formKey, setFormKey] = useState(0);
  const topRef = useRef(null);

  const approaches = list.data ?? [];
  const effectiveId = selectedId ?? approaches[0]?.id ?? null;
  const selected = approaches.find((a) => a.id === effectiveId);

  // Existing mode: load the selected approach into the form.
  useEffect(() => {
    if (mode === 'existing' && selected) {
      setValues(toInput(selected));
      setErrors({});
      setFormKey((k) => k + 1);
    }
  }, [mode, selected]);

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setFormError('');
    if (m === 'new') {
      setValues(DEFAULT_APPROACH);
      setFormKey((k) => k + 1);
    }
  };

  const change = (patch) => {
    setValues((v) => ({ ...v, ...patch }));
    // Editing a field clears its error; the banner goes once none remain.
    const remaining = { ...errors };
    Object.keys(patch).forEach((k) => delete remaining[k]);
    setErrors(remaining);
    if (Object.keys(remaining).length === 0) setFormError('');
  };

  const onContinue = async () => {
    const clientErrors = validate(values);
    setErrors(clientErrors);
    setFormError('');
    if (Object.keys(clientErrors).length) {
      setFormError('Some fields need attention.');
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setSaving(true);
    try {
      const saved = mode === 'new' ? await createApproach(values) : await updateApproach(effectiveId, values);
      navigate('/trade-approaches', {
        state: { notice: `${mode === 'new' ? 'Created' : 'Saved'} “${saved.name}”.` },
      });
    } catch (err) {
      setSaving(false);
      setErrors(err.fields ?? {});
      setFormError(err.message);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const loading = options.status === 'loading' || list.status === 'loading';
  const failed = options.status === 'error' || list.status === 'error';

  let body;
  if (failed) {
    body = (
      <ErrorState
        message="Couldn't load approach settings. Is the backend running?"
        onRetry={() => {
          options.reload();
          list.reload();
        }}
      />
    );
  } else if (loading) {
    body = (
      <div className="approach-editor__stack" aria-busy="true" aria-label="Loading">
        <ApproachEditorBodySkeleton existing={mode === 'existing'} />
      </div>
    );
  } else {
    body = (
      <>
        {mode === 'new' ? (
          <Card className="approach-editor__name">
            <label htmlFor="approach-name" className="approach-editor__label">
              Approach Name
            </label>
            <input
              id="approach-name"
              className={`approach-editor__input ${errors.name ? 'approach-editor__input--error' : ''}`}
              placeholder="e.g. Conservative Income"
              value={values.name}
              onChange={(e) => change({ name: e.target.value })}
              maxLength={80}
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <span className="field-error" role="alert">
                {errors.name}
              </span>
            )}
          </Card>
        ) : approaches.length === 0 ? (
          <div className="approach-editor__empty">No approaches yet — switch to “Create new approach”.</div>
        ) : (
          <div className="approach-editor__options" role="radiogroup" aria-label="Your approaches">
            {approaches.map((a) => (
              <ApproachOption
                key={a.id}
                name="existing-approach"
                approach={a}
                checked={a.id === effectiveId}
                onChange={setSelectedId}
              />
            ))}
          </div>
        )}

        {(mode === 'new' || selected) && (
          <ApproachForm key={formKey} values={values} onChange={change} options={options.data} errors={errors} />
        )}
      </>
    );
  }

  return (
    <FlowPage
      title={routeId ? 'Edit Approach' : 'Create New Approach'}
      backTo="/trade-approaches"
      backLabel="Back to Approach"
      onContinue={onContinue}
      continueDisabled={loading || failed || (mode === 'existing' && !selected)}
      busy={saving}
    >
      <div className="approach-editor__intro" ref={topRef}>
        <div>
          <h2 className="approach-editor__title">Define your approach</h2>
          <p className="approach-editor__subtitle">Tell the AI how you prefer to discover and manage trades.</p>
        </div>
        <SegmentedControl label="Approach source" options={MODES} value={mode} onChange={switchMode} />
      </div>

      {formError && (
        <div className="approach-editor__error" role="alert">
          {formError}
        </div>
      )}

      {body}
    </FlowPage>
  );
}

export default ApproachEditorPage;
