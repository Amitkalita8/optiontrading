import { useState } from 'react';
import './CampaignApproachModal.css';

const TAKE_PROFIT_OPTS = ['50%', '75%', '100%', 'Custom'];
const STOP_LOSS_OPTS = ['10%', '15%', '20%', 'Custom'];

function CampaignApproachModal({ isOpen, onClose, onSave }) {
  const [takeProfit, setTakeProfit] = useState('75%');
  const [customTakeProfit, setCustomTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('15%');
  const [customStopLoss, setCustomStopLoss] = useState('');
  const [maxPositionSizing, setMaxPositionSizing] = useState('10.00');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dteThreshold, setDteThreshold] = useState('14');
  const [autoRollDelta, setAutoRollDelta] = useState('0.70');
  const [assignmentBuffer, setAssignmentBuffer] = useState('3');
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        takeProfit: takeProfit === 'Custom' ? customTakeProfit : takeProfit,
        stopLoss: stopLoss === 'Custom' ? customStopLoss : stopLoss,
        maxPositionSizing,
        dteThreshold,
        autoRollDelta,
        assignmentBuffer,
      });
    }
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="approach-modal__backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="approach-modal" onClick={(e) => e.stopPropagation()}>
        <div className="approach-modal__header">
          <div className="approach-modal__title-row">
            <h2 className="approach-modal__title">Campaign Approach</h2>
            <button
              type="button"
              className="approach-modal__close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
          <p className="approach-modal__subtitle">
            Rules governing live positions and automated exits
          </p>
        </div>

        <form onSubmit={handleSubmit} className="approach-modal__form">
          {/* Take-Profit Trigger */}
          <div className="approach-modal__group">
            <label className="approach-modal__label">Take-Profit Trigger</label>
            <div className="approach-modal__pill-group">
              {TAKE_PROFIT_OPTS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`approach-modal__pill ${takeProfit === opt ? 'is-active' : ''}`}
                  onClick={() => setTakeProfit(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {takeProfit === 'Custom' && (
              <div className="approach-modal__custom-input">
                <input
                  type="number"
                  placeholder="e.g. 65"
                  value={customTakeProfit}
                  onChange={(e) => setCustomTakeProfit(e.target.value)}
                  min="1"
                  max="500"
                />
                <span>%</span>
              </div>
            )}
          </div>

          {/* Stop-Loss Threshold */}
          <div className="approach-modal__group">
            <label className="approach-modal__label">Stop-Loss Threshold</label>
            <div className="approach-modal__pill-group">
              {STOP_LOSS_OPTS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`approach-modal__pill ${stopLoss === opt ? 'is-active' : ''}`}
                  onClick={() => setStopLoss(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {stopLoss === 'Custom' && (
              <div className="approach-modal__custom-input">
                <input
                  type="number"
                  placeholder="e.g. 25"
                  value={customStopLoss}
                  onChange={(e) => setCustomStopLoss(e.target.value)}
                  min="1"
                  max="500"
                />
                <span>%</span>
              </div>
            )}
          </div>

          {/* Max Position Sizing */}
          <div className="approach-modal__group">
            <label className="approach-modal__label">Max Position Sizing</label>
            <div className="approach-modal__input-wrap">
              <input
                type="number"
                step="0.01"
                className="approach-modal__input"
                value={maxPositionSizing}
                onChange={(e) => setMaxPositionSizing(e.target.value)}
              />
              <span className="approach-modal__input-suffix">%</span>
            </div>
            <p className="approach-modal__helper-text">
              $10,000 max committed per underlying
            </p>
          </div>

          {/* Collapsible Advanced Parameters */}
          <div className="approach-modal__advanced-wrap">
            <button
              type="button"
              className="approach-modal__advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="approach-modal__advanced-plus">
                {showAdvanced ? '−' : '+'}
              </span>
              <span>Advanced parameters (DTE close threshold, assignment &amp; auto-roll triggers)</span>
            </button>

            {showAdvanced && (
              <div className="approach-modal__advanced-body">
                <div className="approach-modal__adv-field">
                  <label>DTE close threshold (days)</label>
                  <input
                    type="number"
                    value={dteThreshold}
                    onChange={(e) => setDteThreshold(e.target.value)}
                    min="1"
                    max="60"
                  />
                </div>
                <div className="approach-modal__adv-field">
                  <label>Auto-roll delta trigger</label>
                  <input
                    type="number"
                    step="0.05"
                    value={autoRollDelta}
                    onChange={(e) => setAutoRollDelta(e.target.value)}
                    min="0.1"
                    max="1.0"
                  />
                </div>
                <div className="approach-modal__adv-field">
                  <label>Assignment risk alert buffer (days)</label>
                  <input
                    type="number"
                    value={assignmentBuffer}
                    onChange={(e) => setAssignmentBuffer(e.target.value)}
                    min="1"
                    max="14"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="approach-modal__footer">
            <button
              type="button"
              className="btn btn--outline approach-modal__cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary approach-modal__submit-btn"
            >
              {savedToast ? 'Saved ✓' : 'Set Approach →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CampaignApproachModal;
