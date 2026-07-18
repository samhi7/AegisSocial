import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { LineChart, BarChart } from '../components/CustomChart';
import { 
  ShieldAlert, 
  Users, 
  FileText, 
  MessageSquare, 
  ThumbsDown, 
  PieChart, 
  AlertOctagon, 
  RefreshCw 
} from 'lucide-react';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const adminRes = await fetch(`${API_BASE_URL}/admin_dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const statsRes = await fetch(`${API_BASE_URL}/model_statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (adminRes.ok && statsRes.ok) {
        const adminData = await adminRes.json();
        const statsData = await statsRes.json();
        setData(adminData);
        setModelStats(statsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return <div className="dash-loading">Loading Research Portal...</div>;
  }

  if (!data || !modelStats) {
    return <div className="dash-error">Failed to load system-wide analytics.</div>;
  }

  const { stats, daily_stats, most_reported, most_toxic_users, feedback_stats } = data;

  // Prepare line chart data
  const lineLabels = daily_stats.map(d => d.date.split('-').slice(1).join('/')); // MM/DD
  const publishedCount = daily_stats.map(d => d.published_posts + d.published_comments);
  const blockedCount = daily_stats.map(d => d.blocked_posts + d.blocked_comments);

  // Decile labels
  const decileLabels = ['0-.1', '.1-.2', '.2-.3', '.3-.4', '.4-.5', '.5-.6', '.6-.7', '.7-.8', '.8-.9', '.9-1'];

  return (
    <div className="admin-container fade-in">
      <div className="dash-header">
        <div className="dash-title-area">
          <ShieldAlert className="dash-title-icon admin-icon-color" />
          <div>
            <h1>Admin Research Portal</h1>
            <p>System-wide content moderation diagnostics, feedback reviews, and model performance comparisons</p>
          </div>
        </div>
        <button className="btn btn-secondary refresh-btn" onClick={fetchAdminData}>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Counters */}
      <div className="metrics-grid admin-metrics">
        <div className="glass-card metric-card">
          <div className="metric-icon"><Users size={20} /></div>
          <div className="metric-label">Total Users</div>
          <div className="metric-val">{stats.total_users}</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon"><FileText size={20} /></div>
          <div className="metric-label">Public Posts</div>
          <div className="metric-val">{stats.total_posts}</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon"><MessageSquare size={20} /></div>
          <div className="metric-label">Public Comments</div>
          <div className="metric-val">{stats.total_comments}</div>
        </div>
        <div className="glass-card metric-card danger">
          <div className="metric-icon"><AlertOctagon size={20} /></div>
          <div className="metric-label">Blocked (Post/Comm)</div>
          <div className="metric-val">{stats.blocked_posts + stats.blocked_comments}</div>
        </div>
      </div>

      {/* Model Diagnostic Stats */}
      <div className="stats-comparison-row">
        <div className="glass-card model-metrics-card">
          <h3>AI Models Diagnostic Metrics</h3>
          <div className="metrics-columns">
            <div className="metric-column">
              <h4>System-wide Performance</h4>
              <div className="metric-row-detail">
                <span>Model Agreement Rate</span>
                <strong>{stats.agreement_rate.toFixed(1)}%</strong>
              </div>
              <div className="metric-row-detail">
                <span>Model Disagreement Rate</span>
                <strong>{stats.disagreement_rate.toFixed(1)}%</strong>
              </div>
              <div className="metric-row-detail">
                <span>TF-IDF Avg Confidence</span>
                <strong>{(stats.logistic_regression_avg_confidence * 100).toFixed(0)}%</strong>
              </div>
              <div className="metric-row-detail">
                <span>DistilBERT Avg Confidence</span>
                <strong>{(stats.distilbert_avg_confidence * 100).toFixed(0)}%</strong>
              </div>
            </div>
            
            <div className="metric-column">
              <h4>User Feedback Error Rates</h4>
              <div className="metric-row-detail">
                <span>False Positive Rate (FP)</span>
                <strong className="warning-color">{stats.false_positive_rate.toFixed(1)}%</strong>
              </div>
              <div className="metric-row-detail">
                <span>False Negative Rate (FN)</span>
                <strong className="warning-color">{stats.false_negative_rate.toFixed(1)}%</strong>
              </div>
              <div className="metric-row-detail">
                <span>Total Feedback Items</span>
                <strong>{feedback_stats.total}</strong>
              </div>
              <div className="metric-row-detail">
                <span>Feedback Disagreement Count</span>
                <strong className="danger-color">{feedback_stats.incorrect_count}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="charts-grid">
        <div className="glass-card chart-card">
          <span className="chart-title">Daily Moderation Volume Trend (Last 7 Days)</span>
          <div className="chart-wrapper">
            <LineChart data={publishedCount} labels={lineLabels} />
          </div>
          <div className="chart-legend" style={{ marginTop: '10px' }}>
            <span className="legend-dot success"></span> <span className="legend-txt">Published Content</span>
          </div>
        </div>

        <div className="glass-card chart-card">
          <span className="chart-title">DistilBERT Score Density (Toxicity Deciles)</span>
          <div className="chart-wrapper">
            <BarChart 
              data={modelStats.db_distribution} 
              labels={decileLabels} 
              title="Y-axis represents content count in each score range"
            />
          </div>
        </div>
      </div>

      {/* Tables section: Most Reported Content & Most Toxic Users */}
      <div className="tables-grid">
        <div className="glass-card table-card flex-2">
          <div className="table-header-section">
            <h3>Recent Moderation Disagreements (User Feedback)</h3>
            <p>List of model decisions flagged as incorrect by users</p>
          </div>
          
          {most_reported.length === 0 ? (
            <p className="empty-table-txt">No reported model errors registered yet.</p>
          ) : (
            <div className="table-scroll-wrapper">
              <table className="research-table">
                <thead>
                  <tr>
                    <th>Reporter</th>
                    <th>Content Type</th>
                    <th>Text Sample</th>
                    <th>Toxicity Prob (DB)</th>
                    <th>Feedback Reason</th>
                    <th>User Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {most_reported.map((item, idx) => (
                    <tr key={idx}>
                      <td>@{item.username}</td>
                      <td>
                        <span className="table-type-badge">{item.content_type.toUpperCase()}</span>
                      </td>
                      <td className="table-text-cell" title={item.original_text}>
                        "{item.original_text}"
                      </td>
                      <td>{(item.distilbert_prob * 100).toFixed(0)}%</td>
                      <td>
                        <span className="table-reason-badge">{item.reason}</span>
                      </td>
                      <td className="table-comment-cell">
                        {item.comment ? `"${item.comment}"` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card table-card flex-1">
          <div className="table-header-section">
            <h3>Most Labeled Users</h3>
            <p>Users with the highest percentage of blocked content</p>
          </div>
          
          {most_toxic_users.length === 0 ? (
            <p className="empty-table-txt">No content activity registered.</p>
          ) : (
            <table className="research-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Attempted</th>
                  <th>Blocked</th>
                  <th>Block Ratio</th>
                </tr>
              </thead>
              <tbody>
                {most_toxic_users.map((user, idx) => (
                  <tr key={idx}>
                    <td>@{user.username}</td>
                    <td>{user.total_attempted}</td>
                    <td className="danger-color">{user.blocked_count}</td>
                    <td><strong>{(user.toxicity_ratio * 100).toFixed(0)}%</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .admin-container {
          padding-top: 1rem;
        }

        .admin-icon-color {
          color: var(--accent);
          filter: drop-shadow(0 0 5px rgba(0, 242, 254, 0.4));
        }

        .refresh-btn {
          gap: 6px;
          padding: 8px 16px;
          font-size: 0.85rem;
        }

        .admin-metrics .metric-card {
          position: relative;
        }

        .metric-icon {
          position: absolute;
          top: 15px;
          right: 15px;
          color: var(--text-muted);
          opacity: 0.5;
        }

        .stats-comparison-row {
          margin-bottom: 2rem;
        }

        .model-metrics-card {
          padding: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
        }

        .model-metrics-card h3 {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }

        .metrics-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
        }

        @media (max-width: 768px) {
          .metrics-columns {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        .metric-column h4 {
          font-size: 0.95rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          font-weight: 700;
        }

        .metric-row-detail {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 0.92rem;
        }

        .metric-row-detail span {
          color: var(--text-secondary);
        }

        .warning-color { color: var(--color-warning); }
        .danger-color { color: var(--color-danger); }
        .success-color { color: var(--color-success); }

        .chart-wrapper {
          width: 100%;
          padding: 10px 0;
        }

        .tables-grid {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .tables-grid {
            flex-direction: column;
          }
        }

        .table-card {
          padding: 1.5rem;
          border-radius: var(--border-radius-md);
          overflow: hidden;
        }

        .table-card.flex-2 { flex: 2; }
        .table-card.flex-1 { flex: 1; }

        .table-header-section {
          margin-bottom: 1.5rem;
        }

        .table-header-section h3 {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .table-header-section p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .empty-table-txt {
          font-style: italic;
          color: var(--text-secondary);
          text-align: center;
          padding: 2rem;
          font-size: 0.9rem;
        }

        .table-scroll-wrapper {
          overflow-x: auto;
          width: 100%;
        }

        .research-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .research-table th, .research-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .research-table th {
          font-weight: 700;
          color: var(--text-secondary);
          font-size: 0.8rem;
          text-transform: uppercase;
        }

        .research-table tr:hover {
          background: rgba(255,255,255,0.02);
        }

        .table-type-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--primary-glow);
          color: var(--primary);
        }

        .table-reason-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--color-warning-glow);
          color: var(--color-warning);
          white-space: nowrap;
        }

        .table-text-cell {
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-style: italic;
        }

        .table-comment-cell {
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
