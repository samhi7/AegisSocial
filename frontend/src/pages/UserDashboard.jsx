import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { DonutChart, ConfusionMatrixChart } from '../components/CustomChart';
import { 
  BarChart3, 
  Check, 
  X, 
  ChevronDown, 
  AlertCircle, 
  EyeOff, 
  MessageSquare, 
  PenTool, 
  AlertTriangle 
} from 'lucide-react';

const UserDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackForms, setFeedbackForms] = useState({}); // pred_id -> form_state
  const [showBlockedDrawer, setShowBlockedDrawer] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user_dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleFeedbackSubmit = async (predId) => {
    const form = feedbackForms[predId];
    if (!form) return;

    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prediction_id: predId,
          is_correct: form.isCorrect,
          reason: form.isCorrect ? 'Unsure' : form.reason, // default to Unsure if correct
          comment: form.comment || ''
        })
      });

      if (response.ok) {
        // Refresh dashboard to display the updated feedback status
        fetchDashboardData();
        // Clear form state
        setFeedbackForms(prev => {
          const updated = { ...prev };
          delete updated[predId];
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateFeedbackForm = (predId, field, value) => {
    setFeedbackForms(prev => ({
      ...prev,
      [predId]: {
        ...prev[predId],
        [field]: value
      }
    }));
  };

  if (loading) {
    return <div className="dash-loading">Loading AI Dashboard...</div>;
  }

  if (!data) {
    return <div className="dash-error">Failed to load dashboard metrics.</div>;
  }

  const { stats, agreement, comparison, blocked_posts, blocked_comments } = data;

  return (
    <div className="dashboard-container fade-in">
      <div className="dash-header">
        <div className="dash-title-area">
          <BarChart3 className="dash-title-icon" />
          <div>
            <h1>Personal AI Dashboard</h1>
            <p>Analyze how machine learning models moderated your posts & comments</p>
          </div>
        </div>

        <button className="btn btn-secondary blocked-drawer-btn" onClick={() => setShowBlockedDrawer(!showBlockedDrawer)}>
          <EyeOff size={18} />
          <span>Blocked Content ({blocked_posts.length + blocked_comments.length})</span>
        </button>
      </div>

      {/* Blocked Content Drawer */}
      {showBlockedDrawer && (
        <div className="blocked-drawer-overlay">
          <div className="blocked-drawer glass-card fade-in">
            <div className="drawer-header">
              <h3>Private Blocked Content</h3>
              <button className="drawer-close-btn" onClick={() => setShowBlockedDrawer(false)}><X size={20} /></button>
            </div>
            <p className="drawer-subtitle">This content violates community guidelines and is only visible to you.</p>
            
            <div className="drawer-body">
              <h4>Blocked Posts ({blocked_posts.length})</h4>
              {blocked_posts.length === 0 ? (
                <p className="empty-drawer-txt">No blocked posts.</p>
              ) : (
                blocked_posts.map(post => (
                  <div key={post.id} className="blocked-item-card">
                    <p className="blocked-item-txt">"{post.content}"</p>
                    <span className="blocked-item-meta">{new Date(post.created_at).toLocaleString()}</span>
                  </div>
                ))
              )}

              <h4 style={{ marginTop: '1.5rem' }}>Blocked Comments ({blocked_comments.length})</h4>
              {blocked_comments.length === 0 ? (
                <p className="empty-drawer-txt">No blocked comments.</p>
              ) : (
                blocked_comments.map(comm => (
                  <div key={comm.id} className="blocked-item-card">
                    <p className="blocked-item-txt">"{comm.content}"</p>
                    <span className="blocked-item-meta">On Post #{comm.post_id} - {new Date(comm.created_at).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-label">Total Posts</div>
          <div className="metric-val">{stats.total_posts}</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-label">Total Comments</div>
          <div className="metric-val">{stats.total_comments}</div>
        </div>
        <div className="glass-card metric-card warning">
          <div className="metric-label">Warnings</div>
          <div className="metric-val">{stats.warning_count}</div>
        </div>
        <div className="glass-card metric-card danger">
          <div className="metric-label">Blocked Content</div>
          <div className="metric-val">{stats.blocked_count}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="glass-card chart-card">
          <span className="chart-title">Content Toxicity Ratio</span>
          <DonutChart cleanPercent={stats.clean_percentage} toxicPercent={stats.toxic_percentage} />
        </div>

        <div className="glass-card chart-card">
          <span className="chart-title">AI Models Agreement Rate</span>
          <ConfusionMatrixChart 
            lrToxicCount={agreement.logistic_regression_toxic_count} 
            dbToxicCount={agreement.distilbert_toxic_count}
            total={comparison.length}
            disagreementCount={agreement.disagreement_count}
          />
          <div className="agreement-summary-stats">
            <p>Agreement Rate: <strong>{agreement.agreement_rate.toFixed(1)}%</strong></p>
            <p>Disagreements: <strong>{agreement.disagreement_count}</strong></p>
          </div>
        </div>
      </div>

      {/* Model Comparison Table & Feedback Section */}
      <div className="glass-card comparison-section">
        <div className="comparison-header">
          <h3>Detailed Model Comparison & Feedback</h3>
          <p>Highlighting agreement and disagreement between TF-IDF (Baseline) and DistilBERT (Primary)</p>
        </div>

        {comparison.length === 0 ? (
          <p className="no-comparisons">No moderated items yet. Post something to generate comparative model analytics!</p>
        ) : (
          <div className="comparison-list">
            {comparison.map(item => {
              const hasDisagreed = item.baseline_pred !== item.distilbert_pred;
              const feedbackForm = feedbackForms[item.id];
              
              // Calculate confidence scores
              const lrConf = item.baseline_pred === 1 ? item.baseline_prob : (1.0 - item.baseline_prob);
              const dbConf = item.distilbert_pred === 1 ? item.distilbert_prob : (1.0 - item.distilbert_prob);

              return (
                <div key={item.id} className={`comparison-row ${hasDisagreed ? 'disagreement-row' : ''}`}>
                  <div className="comparison-row-top">
                    <div className="comparison-text-cell">
                      <div className="content-type-badge">
                        {item.content_type === 'post' ? <PenTool size={12} /> : <MessageSquare size={12} />}
                        <span>{item.content_type.toUpperCase()}</span>
                      </div>
                      <p className="comparison-text">"{item.text}"</p>
                    </div>

                    <div className="comparison-scores">
                      <div className="model-score-col">
                        <span className="model-name">TF-IDF Baseline</span>
                        <span className={`pred-indicator ${item.baseline_pred === 1 ? 'toxic' : 'clean'}`}>
                          {item.baseline_pred === 1 ? 'Toxic' : 'Clean'}
                        </span>
                        <span className="pred-details">Prob: {item.baseline_prob.toFixed(2)}</span>
                        <span className="pred-details">Conf: {(lrConf * 100).toFixed(0)}%</span>
                      </div>

                      <div className="model-score-col primary-model">
                        <span className="model-name">DistilBERT Primary</span>
                        <span className={`pred-indicator ${item.distilbert_pred === 1 ? 'toxic' : 'clean'}`}>
                          {item.distilbert_pred === 1 ? 'Toxic' : 'Clean'}
                        </span>
                        <span className="pred-details">Prob: {item.distilbert_prob.toFixed(2)}</span>
                        <span className="pred-details">Conf: {(dbConf * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="decision-col">
                      <span className="col-lbl">Decision</span>
                      <span className={`decision-badge ${item.final_decision}`}>
                        {item.final_decision.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {hasDisagreed && (
                    <div className="disagreement-banner">
                      <AlertTriangle size={14} />
                      <span>Models Disagree: Baseline predicted {item.baseline_pred === 1 ? 'Toxic' : 'Clean'}, Primary predicted {item.distilbert_pred === 1 ? 'Toxic' : 'Clean'}</span>
                    </div>
                  )}

                  {/* Feedback Section */}
                  <div className="row-feedback-area">
                    {item.feedback ? (
                      <div className="submitted-feedback">
                        <span className="feedback-badge">Feedback Registered</span>
                        <p>
                          Was prediction correct? <strong>{item.feedback.is_correct ? 'Yes' : 'No'}</strong>
                          {!item.feedback.is_correct && ` (Reason: ${item.feedback.reason})`}
                        </p>
                        {item.feedback.comment && <p className="feedback-comment">" {item.feedback.comment} "</p>}
                      </div>
                    ) : (
                      <div className="feedback-action-trigger">
                        {!feedbackForm ? (
                          <div className="feedback-prompt">
                            <span>Was this AI prediction correct?</span>
                            <button className="feedback-btn yes" onClick={() => updateFeedbackForm(item.id, 'isCorrect', true)}>
                              <Check size={14} /> Yes
                            </button>
                            <button className="feedback-btn no" onClick={() => {
                              updateFeedbackForm(item.id, 'isCorrect', false);
                              updateFeedbackForm(item.id, 'reason', 'False Positive');
                            }}>
                              <X size={14} /> No
                            </button>
                          </div>
                        ) : (
                          <div className="feedback-form-expanded">
                            {feedbackForm.isCorrect === true ? (
                              <div className="feedback-form-row">
                                <span className="feedback-prompt-label">Explain why the model is correct (optional):</span>
                                <input 
                                  type="text" 
                                  className="input-field feedback-input-box" 
                                  placeholder="Provide optional details..." 
                                  onChange={(e) => updateFeedbackForm(item.id, 'comment', e.target.value)}
                                />
                                <div className="feedback-form-buttons">
                                  <button className="btn btn-primary btn-sm" onClick={() => handleFeedbackSubmit(item.id)}>Submit</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => updateFeedbackForm(item.id, null, null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="feedback-form-row col">
                                <div className="feedback-form-fields">
                                  <div className="feedback-field-group">
                                    <label>Select Reason:</label>
                                    <select 
                                      className="input-field feedback-select"
                                      value={feedbackForm.reason || 'False Positive'}
                                      onChange={(e) => updateFeedbackForm(item.id, 'reason', e.target.value)}
                                    >
                                      <option value="False Positive">False Positive (Flagged clean text as toxic)</option>
                                      <option value="False Negative">False Negative (Failed to flag toxic text)</option>
                                      <option value="Too Strict">Too Strict (Moderation threshold is too sensitive)</option>
                                      <option value="Too Lenient">Too Lenient (Moderation threshold is too soft)</option>
                                      <option value="Unsure">Unsure / Ambiguous</option>
                                    </select>
                                  </div>
                                  <div className="feedback-field-group">
                                    <label>Describe the issue:</label>
                                    <input 
                                      type="text" 
                                      className="input-field feedback-input-box" 
                                      placeholder="Explain why you disagree..."
                                      onChange={(e) => updateFeedbackForm(item.id, 'comment', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="feedback-form-buttons align-end">
                                  <button className="btn btn-secondary btn-sm" onClick={() => setFeedbackForms(prev => {
                                    const updated = { ...prev };
                                    delete updated[item.id];
                                    return updated;
                                  })}>Cancel</button>
                                  <button className="btn btn-primary btn-sm" onClick={() => handleFeedbackSubmit(item.id)}>Submit Feedback</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .dashboard-container {
          padding-top: 1rem;
        }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .dash-title-area {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .dash-title-icon {
          color: var(--primary);
          width: 36px;
          height: 36px;
          filter: drop-shadow(0 0 5px var(--primary-glow));
        }

        .dash-header h1 {
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .dash-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .blocked-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          backdrop-filter: blur(4px);
        }

        .blocked-drawer {
          width: 100%;
          max-width: 460px;
          height: 100vh;
          border-radius: 0;
          border-left: 1px solid var(--border-color);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
          background: var(--bg-main);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .drawer-close-btn {
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .drawer-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
        }

        .drawer-body h4 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .blocked-item-card {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid var(--color-danger-glow);
          padding: 12px;
          border-radius: var(--border-radius-sm);
          margin-bottom: 10px;
        }

        .blocked-item-txt {
          font-size: 0.9rem;
          font-weight: 500;
          font-style: italic;
          color: var(--text-primary);
        }

        .blocked-item-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: block;
          margin-top: 5px;
        }

        .empty-drawer-txt {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .agreement-summary-stats {
          margin-top: 15px;
          display: flex;
          gap: 20px;
          font-size: 0.85rem;
        }

        .comparison-section {
          padding: 2rem;
          border-radius: var(--border-radius-md);
        }

        .comparison-header {
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 15px;
        }

        .comparison-header h3 {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .comparison-header p {
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .no-comparisons {
          font-style: italic;
          color: var(--text-secondary);
          text-align: center;
          padding: 2rem;
        }

        .comparison-list {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .comparison-row {
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color var(--transition-fast);
        }

        .comparison-row.disagreement-row {
          border-left: 4px solid var(--color-warning);
          background: rgba(245, 158, 11, 0.02);
        }

        .comparison-row-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .comparison-text-cell {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .content-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--primary);
          background: var(--primary-glow);
          padding: 2px 8px;
          border-radius: 4px;
          width: fit-content;
        }

        .comparison-text {
          font-size: 0.95rem;
          font-weight: 500;
          font-style: italic;
        }

        .comparison-scores {
          display: flex;
          gap: 20px;
        }

        .model-score-col {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 8px;
          background: rgba(0,0,0,0.1);
          border-radius: var(--border-radius-sm);
          min-width: 120px;
          border: 1px solid var(--border-color);
        }

        .model-score-col.primary-model {
          border-color: var(--primary-glow);
          background: rgba(124, 77, 255, 0.03);
        }

        .model-name {
          font-size: 0.72rem;
          color: var(--text-secondary);
          font-weight: 700;
          text-transform: uppercase;
        }

        .pred-indicator {
          font-size: 0.85rem;
          font-weight: 800;
        }

        .pred-indicator.toxic { color: var(--color-danger); }
        .pred-indicator.clean { color: var(--color-success); }

        .pred-details {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .decision-col {
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: center;
        }

        .col-lbl {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 700;
        }

        .decision-badge {
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: var(--border-radius-full);
          font-weight: 800;
        }

        .decision-badge.publish {
          background: var(--color-success-glow);
          color: var(--color-success);
        }

        .decision-badge.warning {
          background: var(--color-warning-glow);
          color: var(--color-warning);
        }

        .decision-badge.block {
          background: var(--color-danger-glow);
          color: var(--color-danger);
        }

        .disagreement-banner {
          background: var(--color-warning-glow);
          color: var(--color-warning);
          padding: 8px 12px;
          border-radius: var(--border-radius-sm);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .row-feedback-area {
          border-top: 1px solid var(--border-color);
          padding-top: 10px;
        }

        .submitted-feedback {
          font-size: 0.85rem;
        }

        .feedback-badge {
          font-size: 0.7rem;
          font-weight: 700;
          background: var(--color-success-glow);
          color: var(--color-success);
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 4px;
        }

        .feedback-comment {
          font-style: italic;
          color: var(--text-secondary);
          margin-top: 4px;
          background: rgba(255,255,255,0.02);
          padding: 6px;
          border-radius: 4px;
          border-left: 2px solid var(--border-color);
        }

        .feedback-prompt {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .feedback-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.03);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .feedback-btn:hover {
          background: rgba(255,255,255,0.08);
        }

        .feedback-btn.yes:hover {
          color: var(--color-success);
          border-color: var(--color-success);
          background: var(--color-success-glow);
        }

        .feedback-btn.no:hover {
          color: var(--color-danger);
          border-color: var(--color-danger);
          background: var(--color-danger-glow);
        }

        .feedback-form-expanded {
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border-color);
          padding: 12px;
          border-radius: var(--border-radius-sm);
        }

        .feedback-form-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feedback-form-row.col {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }

        .feedback-form-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .feedback-field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .feedback-field-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .feedback-prompt-label {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .feedback-input-box {
          flex: 1;
          padding: 8px 12px;
          font-size: 0.85rem;
        }

        .feedback-select {
          padding: 8px;
          font-size: 0.85rem;
        }

        .feedback-form-buttons {
          display: flex;
          gap: 8px;
        }

        .feedback-form-buttons.align-end {
          justify-content: flex-end;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.8rem;
        }

        .dash-loading, .dash-error {
          text-align: center;
          padding: 4rem;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        @media (max-width: 900px) {
          .comparison-row-top {
            flex-direction: column;
            gap: 15px;
          }
          .comparison-scores {
            width: 100%;
            justify-content: space-between;
          }
          .decision-col {
            align-items: flex-start;
          }
          .feedback-form-fields {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default UserDashboard;
