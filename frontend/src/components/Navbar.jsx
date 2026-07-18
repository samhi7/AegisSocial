import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Home, 
  BarChart3, 
  ShieldAlert, 
  User as UserIcon, 
  LogOut, 
  Sun, 
  Moon, 
  ShieldAlert as ShieldIcon 
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="glass-card nav-sidebar">
      <div className="nav-logo">
        <ShieldIcon size={28} className="logo-icon" />
        <span className="logo-text">Aegis<span className="logo-highlight">Social</span></span>
      </div>

      <div className="user-profile-badge">
        <img 
          src={user.profile_pic_url || "https://api.dicebear.com/7.x/adventurer/svg"} 
          alt="Avatar" 
          className="user-badge-img"
        />
        <div className="user-badge-info">
          <p className="user-badge-name">@{user.username}</p>
          <p className="user-badge-role">Researcher Mode</p>
        </div>
      </div>

      <ul className="nav-links">
        <li>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <Home size={20} />
            <span>Feed</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>AI Dashboard</span>
          </Link>
        </li>
        <li>
          <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
            <ShieldAlert size={20} />
            <span>Research Portal</span>
          </Link>
        </li>
        <li>
          <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
            <UserIcon size={20} />
            <span>My Profile</span>
          </Link>
        </li>
      </ul>

      <div className="nav-footer">
        <button className="theme-toggle-btn btn-secondary" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
      
      {/* Dynamic styles injected directly in style tag for exact sidebar layout */}
      <style>{`
        .nav-sidebar {
          width: 260px;
          height: calc(100vh - 2rem);
          position: sticky;
          top: 1rem;
          left: 1rem;
          margin: 1rem;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          z-index: 100;
          border-radius: var(--border-radius-lg);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 2rem;
        }

        .logo-icon {
          color: var(--primary);
          filter: drop-shadow(0 0 8px var(--primary-glow));
        }

        .logo-text {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .logo-highlight {
          color: var(--primary);
        }

        .user-profile-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          margin-bottom: 2rem;
        }

        .user-badge-img {
          width: 42px;
          height: 42px;
          border-radius: var(--border-radius-sm);
          background: rgba(124, 77, 255, 0.1);
          border: 1px solid var(--border-color);
        }

        .user-badge-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-badge-name {
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .user-badge-role {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .nav-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--border-radius-sm);
          color: var(--text-secondary);
          font-weight: 500;
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(4px);
        }

        .nav-link.active {
          color: white;
          background: var(--primary);
          box-shadow: 0 4px 15px var(--primary-glow);
        }

        .nav-footer {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid var(--border-color);
          padding-top: 1.5rem;
        }

        .theme-toggle-btn {
          width: 100%;
          justify-content: flex-start;
          font-size: 0.85rem;
          padding: 10px 16px;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--border-radius-sm);
          color: var(--color-danger);
          font-weight: 600;
          font-size: 0.9rem;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          width: 100%;
          text-align: left;
        }

        .logout-btn:hover {
          background: var(--color-danger-glow);
          transform: translateX(4px);
        }

        @media (max-width: 768px) {
          .nav-sidebar {
            width: 100%;
            height: 60px;
            position: fixed;
            bottom: 0;
            left: 0;
            top: auto;
            margin: 0;
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            border-radius: 0;
            border-top: 1px solid var(--border-color);
            padding: 0 10px;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
          }

          .nav-logo, .user-profile-badge, .nav-footer span, .nav-links span {
            display: none;
          }

          .nav-links {
            flex-direction: row;
            justify-content: space-around;
            width: 100%;
            margin: 0;
          }

          .nav-link {
            padding: 10px;
            border-radius: var(--border-radius-full);
          }

          .nav-link:hover {
            transform: none;
          }

          .nav-footer {
            border-top: none;
            padding-top: 0;
            flex-direction: row;
            gap: 15px;
          }

          .logout-btn {
            padding: 10px;
            width: auto;
          }

          .logout-btn:hover {
            transform: none;
          }

          .theme-toggle-btn {
            width: auto;
            padding: 10px;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
