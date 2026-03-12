import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Check, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import './ProfileSetup.css';
import { API_URL } from '../config/api';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [user] = useState(() => {
    const savedUser = localStorage.getItem('cmail_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [profileUrl, setProfileUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setProfileUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDone = async () => {
    if (!user?._id) {
      setError('User not found. Please sign up again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          profileUrl: profileUrl || ''
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      localStorage.setItem('cmail_user', JSON.stringify(data.user));
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate(`/${user.username}`);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate(`/${user.username}`);
  };

  if (!user) {
    navigate('/');
    return null;
  }

  if (isSuccess) {
    return (
      <div className="cmail-setup-page">
        <div className="cmail-setup-card">
          <div className="cmail-setup-success">
            <div className="cmail-setup-success-icon">
              <Check size={40} />
            </div>
            <h2>All Done!</h2>
            <p>Your profile has been set up successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cmail-setup-page">
      <div className="cmail-setup-card">
        <div className="cmail-setup-header">
          <div className="cmail-setup-avatar" onClick={handleUploadClick}>
            {previewUrl ? (
              <img src={previewUrl} alt="Profile" />
            ) : (
              <>
                {user.firstName?.[0]}{user.secondName?.[0]}
              </>
            )}
            <div className="cmail-setup-avatar-edit">
              <Upload size={16} />
            </div>
          </div>
          <h1 className="cmail-setup-title">Set up your profile</h1>
          <p className="cmail-setup-subtitle">Add a profile picture to personalize your account</p>
        </div>

        <input
          type="file"
          id="profile-upload"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
        />

        {error && <p className="cmail-setup-error">{error}</p>}

        <div className="cmail-setup-actions">
          <button className="cmail-setup-btn cmail-setup-btn-secondary" onClick={handleSkip}>
            Skip
          </button>
          <button 
            className="cmail-setup-btn cmail-setup-btn-primary" 
            onClick={handleDone}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
