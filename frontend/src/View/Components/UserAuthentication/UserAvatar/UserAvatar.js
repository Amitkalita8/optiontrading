import { useState } from 'react';
import './UserAvatar.css';

// "Vishu Jain" -> "VJ", "madonna" -> "M"; falls back to the email's first letter.
export function getInitials(user) {
  const words = (user.name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return (user.email || '?')[0].toUpperCase();
}

// Signed out: generic person icon. Google: profile photo (initials if it fails
// to load). Email/password: initials.
function UserAvatar({ user, size = 44 }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };

  if (!user) {
    return (
      <span className="user-avatar user-avatar--guest" style={style} aria-hidden="true">
        <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
        </svg>
      </span>
    );
  }

  const imageSrc = user.picture || user.photo;
  if (imageSrc && !photoFailed) {
    return (
      <img
        className="user-avatar user-avatar--photo"
        style={style}
        src={imageSrc}
        alt=""
        // Google profile photos can refuse requests that carry a referrer.
        referrerPolicy="no-referrer"
        onError={() => setPhotoFailed(true)}
      />
    );
  }

  return (
    <span className="user-avatar" style={style} aria-hidden="true">
      {getInitials(user)}
    </span>
  );
}

export default UserAvatar;
