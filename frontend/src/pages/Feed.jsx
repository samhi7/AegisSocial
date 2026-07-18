import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  Send, 
  MessageCircle, 
  Heart, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const Feed = () => {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState({}); // post_id -> boolean
  const [commentInputs, setCommentInputs] = useState({}); // post_id -> string
  const [commentErrors, setCommentErrors] = useState({}); // post_id -> string

  const clearCommentError = (postId) => {
    setCommentErrors(prev => {
      const updated = { ...prev };
      delete updated[postId];
      return updated;
    });
  };
  
  // Warning/Moderation Modal State
  const [modModal, setModModal] = useState({
    isOpen: false,
    text: '',
    type: 'post', // 'post' or 'comment'
    postId: null, // used for comment target
    prediction: null
  });
  
  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (bypass = false) => {
    const textToSend = bypass ? modModal.text : postContent;
    if (!textToSend.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/create_post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: textToSend,
          bypass_warning: bypass
        })
      });
      
      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        if (data.status === "blocked") {
          triggerToast(data.message, "danger");
          setPostContent('');
          setModModal(prev => ({ ...prev, isOpen: false }));
          fetchPosts(); // Reload to show blocked content in the dashboard drawer if desired
        } else if (data.status === "warning") {
          // Trigger Moderation Warning Modal
          setModModal({
            isOpen: true,
            text: textToSend,
            type: 'post',
            postId: null,
            prediction: data.prediction
          });
        } else {
          // Published
          triggerToast("Post published successfully!", "success");
          setPostContent('');
          setModModal(prev => ({ ...prev, isOpen: false }));
          fetchPosts();
        }
      } else {
        triggerToast(data.detail || "Failed to create post", "danger");
      }
    } catch (err) {
      setLoading(false);
      triggerToast("Network error.", "danger");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete_post/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        triggerToast("Post deleted.", "success");
        fetchPosts();
      } else {
        const data = await response.json();
        triggerToast(data.detail || "Could not delete post.", "danger");
      }
    } catch (err) {
      triggerToast("Network error.", "danger");
    }
  };

  const handleLikeToggle = async (postId, hasLiked) => {
    const endpoint = hasLiked ? 'unlike' : 'like';
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}?post_id=${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        // Optimistic UI updates
        setPosts(prevPosts => prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              has_liked: !hasLiked,
              likes_count: hasLiked ? p.likes_count - 1 : p.likes_count + 1
            };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateComment = async (postId, bypass = false) => {
    const textToSend = bypass ? modModal.text : commentInputs[postId];
    if (!textToSend || !textToSend.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/create_comment?post_id=${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: textToSend,
          bypass_warning: bypass
        })
      });
      
      const data = await response.json();

      if (response.ok) {
        if (data.status === "blocked") {
          triggerToast(data.message, "danger");
          setCommentErrors(prev => ({ ...prev, [postId]: data.message }));
          setModModal(prev => ({ ...prev, isOpen: false }));
        } else if (data.status === "warning") {
          clearCommentError(postId);
          setModModal({
            isOpen: true,
            text: textToSend,
            type: 'comment',
            postId: postId,
            prediction: data.prediction
          });
        } else {
          triggerToast("Comment added!", "success");
          setCommentInputs(prev => ({ ...prev, [postId]: '' }));
          clearCommentError(postId);
          setModModal(prev => ({ ...prev, isOpen: false }));
          fetchPosts();
        }
      } else {
        const errMsg = data.detail || "Failed to create comment";
        triggerToast(errMsg, "danger");
        setCommentErrors(prev => ({ ...prev, [postId]: errMsg }));
      }
    } catch (err) {
      triggerToast("Network error.", "danger");
      setCommentErrors(prev => ({ ...prev, [postId]: "Network error." }));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete_comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        triggerToast("Comment deleted.", "success");
        fetchPosts();
      }
    } catch (err) {
      triggerToast("Network error.", "danger");
    }
  };

  const toggleCommentsSection = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleModContinue = () => {
    if (modModal.type === 'post') {
      handleCreatePost(true);
    } else {
      handleCreateComment(modModal.postId, true);
    }
  };

  const handleModEdit = () => {
    if (modModal.type === 'post') {
      setPostContent(modModal.text);
    } else {
      setCommentInputs(prev => ({ ...prev, [modModal.postId]: modModal.text }));
    }
    setModModal({ isOpen: false, text: '', type: 'post', postId: null, prediction: null });
  };

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-alert glass-card ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Warning/Moderation Modal */}
      {modModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content warning-modal glass-card pulse-warning">
            <div className="mod-modal-header">
              <AlertTriangle size={48} className="warn-icon" />
              <h3>Content Warning</h3>
            </div>
            
            <div className="mod-modal-body">
              <p className="warn-msg">This content may be offensive. Do you still want to post?</p>
              
              <div className="flagged-text-preview">
                <span className="quote-lbl">Your content:</span>
                <p>"{modModal.text}"</p>
              </div>

              {modModal.prediction && (
                <div className="moderation-score-preview">
                  <div className="score-row">
                    <span>Toxicity Score (DistilBERT):</span>
                    <span className="score-badge danger">{(modModal.prediction.distilbert_prob * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mod-modal-footer">
              <button className="btn btn-secondary" onClick={handleModEdit}>Edit Text</button>
              <button className="btn btn-warning" onClick={handleModContinue}>Continue Posting</button>
            </div>
          </div>
        </div>
      )}

      <div className="feed-container fade-in">
        <div className="create-post-box glass-card">
        <h3>Share something...</h3>
        <div className="create-post-input-wrapper">
          <textarea
            className="input-field post-textarea"
            placeholder="What is on your mind? (Toxicity checker runs automatically)"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            disabled={loading}
            rows="3"
          />
          <div className="create-post-actions">
            <span className="moderation-badge">AI Shield Active</span>
            <button className="btn btn-primary send-post-btn" onClick={() => handleCreatePost(false)} disabled={loading || !postContent.trim()}>
              <Send size={16} />
              <span>Post</span>
            </button>
          </div>
        </div>
      </div>

      <div className="posts-timeline">
        {posts.length === 0 ? (
          <div className="empty-feed glass-card">
            <HelpCircle size={48} className="empty-icon" />
            <p>No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map(post => {
            const commentsOpen = expandedComments[post.id];
            
            // Format safety tag based on predictions
            let safetyTag = { label: 'Safe', class: 'safe' };
            if (post.prediction) {
              if (post.prediction.final_decision === 'warning') {
                safetyTag = { label: 'Bypassed Warning', class: 'warning' };
              } else if (post.prediction.distilbert_prob >= 0.40) {
                safetyTag = { label: 'Calibrated', class: 'warning' };
              }
            }

            return (
              <article key={post.id} className="post-card glass-card fade-in">
                <div className="post-header">
                  <div className="post-author-info">
                    <img 
                      src={post.owner.profile_pic_url || "https://api.dicebear.com/7.x/adventurer/svg"} 
                      alt={post.owner.username} 
                      className="post-author-avatar"
                    />
                    <div className="post-author-meta">
                      <span className="post-author-name">@{post.owner.username}</span>
                      <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="post-header-badges">
                    <span className={`safety-indicator ${safetyTag.class}`}>{safetyTag.label}</span>
                    {user && post.owner.id === user.id && (
                      <button className="delete-post-btn" onClick={() => handleDeletePost(post.id)} title="Delete post">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="post-body">
                  <p className="post-text">{post.content}</p>
                </div>

                <div className="post-footer">
                  <button 
                    className={`post-action-btn like-btn ${post.has_liked ? 'liked' : ''}`}
                    onClick={() => handleLikeToggle(post.id, post.has_liked)}
                  >
                    <Heart size={18} fill={post.has_liked ? "var(--color-danger)" : "transparent"} />
                    <span>{post.likes_count}</span>
                  </button>

                  <button 
                    className={`post-action-btn comment-btn ${commentsOpen ? 'active' : ''}`}
                    onClick={() => toggleCommentsSection(post.id)}
                  >
                    <MessageCircle size={18} />
                    <span>{post.comments ? post.comments.length : 0}</span>
                  </button>
                </div>

                {commentsOpen && (
                  <div className="post-comments-section">
                    <div className="comments-list">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map(comment => (
                          <div key={comment.id} className="comment-item">
                            <img 
                              src={comment.owner.profile_pic_url || "https://api.dicebear.com/7.x/adventurer/svg"} 
                              alt={comment.owner.username} 
                              className="comment-avatar"
                            />
                            <div className="comment-bubble">
                              <div className="comment-bubble-header">
                                <span className="comment-author">@{comment.owner.username}</span>
                                <span className="comment-time">{new Date(comment.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="comment-txt">{comment.content}</p>
                            </div>
                            
                            {user && comment.owner.id === user.id && (
                              <button className="delete-comment-btn" onClick={() => handleDeleteComment(comment.id)}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="no-comments-txt">No comments yet. Write one below!</p>
                      )}
                    </div>

                    {commentErrors[post.id] && (
                      <div className="comment-error-banner">
                        <AlertTriangle size={14} className="err-icon" />
                        <span>{commentErrors[post.id]}</span>
                        <button className="close-error-btn" onClick={() => clearCommentError(post.id)}>×</button>
                      </div>
                    )}

                    <div className="add-comment-box">
                      <input 
                        type="text" 
                        className="input-field comment-input" 
                        placeholder="Write a comment..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => {
                          setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }));
                          if (commentErrors[post.id]) {
                            clearCommentError(post.id);
                          }
                        }}
                      />
                      <button 
                        className="btn btn-primary add-comment-btn"
                        onClick={() => handleCreateComment(post.id, false)}
                        disabled={!commentInputs[post.id] || !commentInputs[post.id].trim()}
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <style>{`
        .feed-container {
          max-width: 680px;
          margin: 0 auto;
          padding-top: 1rem;
        }

        .toast-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          border-radius: var(--border-radius-sm);
          z-index: 2000;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-weight: 600;
        }

        .toast-alert.success {
          border-left: 4px solid var(--color-success);
          color: var(--color-success);
        }

        .toast-alert.danger {
          border-left: 4px solid var(--color-danger);
          color: var(--color-danger);
        }

        .warning-modal {
          border-top: 5px solid var(--color-warning);
        }

        .mod-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .warn-icon {
          color: var(--color-warning);
        }

        .warn-msg {
          text-align: center;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1.2rem;
        }

        .flagged-text-preview {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          padding: 12px;
          border-radius: var(--border-radius-sm);
          margin-bottom: 1rem;
        }

        .quote-lbl {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .moderation-score-preview {
          background: var(--color-danger-glow);
          border: 1px solid var(--color-danger);
          padding: 10px;
          border-radius: var(--border-radius-sm);
          margin-bottom: 1.5rem;
        }

        .score-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .score-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 800;
        }

        .score-badge.danger {
          background: var(--color-danger);
          color: white;
        }

        .mod-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .create-post-box {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border-radius: var(--border-radius-md);
        }

        .create-post-box h3 {
          font-size: 1.1rem;
          margin-bottom: 12px;
          font-weight: 700;
        }

        .post-textarea {
          resize: none;
          background: rgba(0, 0, 0, 0.15);
        }

        .create-post-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .moderation-badge {
          font-size: 0.75rem;
          color: var(--color-success);
          background: var(--color-success-glow);
          padding: 4px 10px;
          border-radius: var(--border-radius-full);
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .send-post-btn {
          padding: 8px 16px;
          font-size: 0.85rem;
        }

        .empty-feed {
          padding: 3rem;
          text-align: center;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .empty-icon {
          color: var(--text-muted);
        }

        .post-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border-radius: var(--border-radius-md);
        }

        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .post-author-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .post-author-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--border-radius-sm);
          background: rgba(124, 77, 255, 0.1);
          border: 1px solid var(--border-color);
        }

        .post-author-meta {
          display: flex;
          flex-direction: column;
        }

        .post-author-name {
          font-weight: 700;
          font-size: 0.95rem;
        }

        .post-date {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .post-header-badges {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .safety-indicator {
          font-size: 0.7rem;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .safety-indicator.safe {
          background: var(--color-success-glow);
          color: var(--color-success);
        }

        .safety-indicator.warning {
          background: var(--color-warning-glow);
          color: var(--color-warning);
        }

        .delete-post-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .delete-post-btn:hover {
          color: var(--color-danger);
        }

        .post-body {
          margin-bottom: 1rem;
        }

        .post-text {
          font-size: 1.05rem;
          line-height: 1.6;
        }

        .post-footer {
          display: flex;
          gap: 15px;
          border-top: 1px solid var(--border-color);
          padding-top: 10px;
        }

        .post-action-btn {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background var(--transition-fast), color var(--transition-fast);
        }

        .post-action-btn:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .post-action-btn.like-btn.liked {
          color: var(--color-danger);
        }

        .post-action-btn.comment-btn.active {
          color: var(--primary);
        }

        .post-comments-section {
          margin-top: 1rem;
          border-top: 1px dashed var(--border-color);
          padding-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 5px;
        }

        .comment-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          animation: fadeIn 0.2s ease forwards;
        }

        .comment-avatar {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: rgba(124, 77, 255, 0.05);
        }

        .comment-bubble {
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-color);
          padding: 8px 12px;
          border-radius: var(--border-radius-sm);
          flex: 1;
        }

        .comment-bubble-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .comment-author {
          font-weight: 700;
          font-size: 0.8rem;
        }

        .comment-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .comment-txt {
          font-size: 0.88rem;
        }

        .delete-comment-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          margin-top: 10px;
        }

        .delete-comment-btn:hover {
          color: var(--color-danger);
        }

        .no-comments-txt {
          font-size: 0.85rem;
          color: var(--text-secondary);
          text-align: center;
          font-style: italic;
          padding: 10px 0;
        }

        .add-comment-box {
          display: flex;
          gap: 8px;
          margin-top: 5px;
        }

        .comment-input {
          flex: 1;
          padding: 8px 12px;
          font-size: 0.85rem;
        }

        .add-comment-btn {
          padding: 8px 12px;
        }

        .comment-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-left: 4px solid var(--color-danger);
          border-radius: var(--border-radius-sm);
          color: #ef4444;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 8px;
          animation: slideDown 0.2s ease-out forwards;
        }

        .comment-error-banner .err-icon {
          flex-shrink: 0;
          color: var(--color-danger);
        }

        .comment-error-banner span {
          flex: 1;
        }

        .close-error-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          font-size: 1.1rem;
          cursor: pointer;
          line-height: 1;
          padding: 0 4px;
          transition: color var(--transition-fast);
        }

        .close-error-btn:hover {
          color: var(--color-danger);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      </div>
    </>
  );
};

export default Feed;
