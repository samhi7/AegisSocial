import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  User as UserIcon, 
  Calendar, 
  Mail, 
  PenTool, 
  Heart, 
  MessageSquare,
  FileText,
  CheckCircle2
} from 'lucide-react';

const Profile = () => {
  const { username: routeUsername } = useParams();
  const { user: currentUser, token, updateProfile } = useAuth();
  
  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  const isOwnProfile = !routeUsername || routeUsername === currentUser?.username;
  const activeUsername = isOwnProfile ? currentUser?.username : routeUsername;

  const fetchProfileAndPosts = async () => {
    setLoading(true);
    try {
      // 1. Fetch user metadata
      let userResponse;
      if (isOwnProfile) {
        userResponse = await fetch(`${API_BASE_URL}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        userResponse = await fetch(`${API_BASE_URL}/profile/${routeUsername}`);
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setProfileUser(userData);
        setBio(userData.bio || '');
        setAvatar(userData.profile_pic_url || '');

        // 2. Fetch user's posts
        const postsResponse = await fetch(`${API_BASE_URL}/get_posts?username=${userData.username}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setUserPosts(postsData);
        }
      } else {
        setProfileUser(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeUsername) {
      fetchProfileAndPosts();
    }
  }, [routeUsername, currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditSuccess(false);
    try {
      await updateProfile(bio, avatar);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
      setIsEditing(false);
      fetchProfileAndPosts();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading Profile...</div>;
  }

  if (!profileUser) {
    return <div className="profile-error">User @{routeUsername} not found.</div>;
  }

  return (
    <div className="profile-container fade-in">
      <div className="profile-card glass-card">
        <div className="profile-header-layout">
          <img 
            src={profileUser.profile_pic_url || "https://api.dicebear.com/7.x/adventurer/svg"} 
            alt={profileUser.username} 
            className="profile-avatar"
          />
          
          <div className="profile-info-block">
            <div className="profile-name-row">
              <h2>@{profileUser.username}</h2>
              {isOwnProfile && !isEditing && (
                <button className="btn btn-secondary edit-profile-btn" onClick={() => setIsEditing(true)}>
                  <PenTool size={14} />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            <p className="profile-bio-text">"{profileUser.bio || 'No bio written yet.'}"</p>

            <div className="profile-meta-details">
              <div className="meta-item">
                <Calendar size={14} />
                <span>Joined {new Date(profileUser.join_date).toLocaleDateString()}</span>
              </div>
              {isOwnProfile && (
                <div className="meta-item">
                  <Mail size={14} />
                  <span>{profileUser.email}</span>
                </div>
              )}
              <div className="meta-item">
                <FileText size={14} />
                <span>{userPosts.length} Posts published</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit profile form modal/box */}
        {isEditing && (
          <div className="edit-profile-form-container">
            <form onSubmit={handleSaveProfile} className="edit-profile-form">
              <h3>Edit Profile Details</h3>
              
              <div className="form-group">
                <label>Biography</label>
                <textarea 
                  className="input-field" 
                  rows="3" 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                />
              </div>

              <div className="form-group">
                <label>Profile Picture URL</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
                <span className="input-hint">Tip: You can use direct links to image files or SVG generators.</span>
              </div>

              <div className="edit-form-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        )}

        {editSuccess && (
          <div className="edit-success-banner glass-card">
            <CheckCircle2 size={16} className="success-icon" />
            <span>Profile updated successfully!</span>
          </div>
        )}
      </div>

      {/* User's posts list */}
      <div className="profile-posts-section">
        <h3>Published Content Timeline</h3>
        
        {userPosts.length === 0 ? (
          <div className="empty-profile-feed glass-card">
            <p>This user has not published any moderated posts yet.</p>
          </div>
        ) : (
          <div className="profile-posts-grid">
            {userPosts.map(post => (
              <div key={post.id} className="profile-post-item glass-card fade-in">
                <p className="profile-post-content">"{post.content}"</p>
                <div className="profile-post-meta">
                  <span className="profile-post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                  <div className="profile-post-stats">
                    <span className="stat"><Heart size={12} fill="currentColor" /> {post.likes_count}</span>
                    <span className="stat"><MessageSquare size={12} /> {post.comments ? post.comments.length : 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .profile-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .profile-card {
          padding: 2.5rem;
          border-radius: var(--border-radius-lg);
          margin-bottom: 2rem;
        }

        .profile-header-layout {
          display: flex;
          gap: 2.5rem;
          align-items: flex-start;
        }

        @media (max-width: 600px) {
          .profile-header-layout {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .profile-meta-details {
            justify-content: center;
            flex-direction: column;
            align-items: center;
          }
        }

        .profile-avatar {
          width: 110px;
          height: 110px;
          border-radius: var(--border-radius-md);
          background: rgba(124, 77, 255, 0.1);
          border: 2px solid var(--border-color);
          object-fit: cover;
        }

        .profile-info-block {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .profile-name-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .profile-name-row h2 {
          font-size: 1.6rem;
          font-weight: 800;
        }

        .edit-profile-btn {
          padding: 6px 12px;
          font-size: 0.8rem;
        }

        .profile-bio-text {
          font-size: 1.05rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        .profile-meta-details {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 10px;
          border-top: 1px solid var(--border-color);
          padding-top: 15px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .edit-profile-form-container {
          margin-top: 2rem;
          border-top: 1px dashed var(--border-color);
          padding-top: 1.5rem;
        }

        .edit-profile-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .edit-profile-form h3 {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .input-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .edit-form-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .edit-success-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-success-glow);
          border: 1px solid var(--color-success);
          color: var(--color-success);
          padding: 10px 16px;
          border-radius: var(--border-radius-sm);
          font-size: 0.88rem;
          font-weight: 600;
          margin-top: 15px;
          animation: fadeIn 0.2s ease forwards;
        }

        .profile-posts-section h3 {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 1.2rem;
        }

        .empty-profile-feed {
          padding: 2.5rem;
          text-align: center;
          color: var(--text-secondary);
          font-style: italic;
        }

        .profile-posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.2rem;
        }

        .profile-post-item {
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 120px;
        }

        .profile-post-content {
          font-size: 0.95rem;
          font-style: italic;
          line-height: 1.5;
        }

        .profile-post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-color);
          padding-top: 8px;
        }

        .profile-post-stats {
          display: flex;
          gap: 10px;
        }

        .profile-post-stats .stat {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .profile-loading, .profile-error {
          text-align: center;
          padding: 4rem;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default Profile;
