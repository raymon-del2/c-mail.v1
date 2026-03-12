import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Camera, Lock, ShieldCheck, MapPin, Globe, Check } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import './Settings.css';
import { API_URL } from '../config/api';

const LOCATIONS = [
  "New York, USA",
  "San Francisco, USA",
  "London, UK",
  "Berlin, Germany",
  "Tokyo, Japan",
  "Sydney, Australia",
  "Toronto, Canada",
  "Remote / Global"
];

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  // Initialize user and form data from localStorage without causing cascading renders
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('cmail_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      return parsedUser;
    }
    return null;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  const [formData, setFormData] = useState(() => {
    const savedUser = localStorage.getItem('cmail_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      return {
        firstName: parsedUser.firstName || '',
        secondName: parsedUser.secondName || '',
        number: parsedUser.number || '',
        username: parsedUser.username || '',
        location: '',
        avatarUrl: parsedUser.profileUrl // Keep existing profileUrl (can be undefined)
      };
    }
    return {
      firstName: '',
      secondName: '',
      number: '',
      username: '',
      location: '',
      avatarUrl: undefined
    };
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!localStorage.getItem('cmail_user')) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Image compression utility
  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed base64
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image before processing - more aggressive compression
      const compressedImage = await compressImage(file, 200, 200, 0.5);
      
      setFormData(prev => ({
        ...prev,
        avatarUrl: compressedImage
      }));
      
      // Update user object immediately to show the new avatar
      const updatedUser = {
        ...user,
        profileUrl: compressedImage
      };
      localStorage.setItem('cmail_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number is not empty
    if (!formData.number || !formData.number.trim()) {
      setPhoneError('Phone number is required and cannot be removed');
      return;
    }
    
    setPhoneError('');
    setIsSaving(true);
    
    try {
      // Save to database
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user._id,
          firstName: formData.firstName,
          secondName: formData.secondName,
          number: formData.number,
          profileUrl: formData.avatarUrl?.trim() || user?.profileUrl?.trim() || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }
      
      const updatedUserFromDB = await response.json();
      
      // Update localStorage with the latest data from DB
      localStorage.setItem('cmail_user', JSON.stringify(updatedUserFromDB));
      setUser(updatedUserFromDB);
      
      // Show success toast
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      // Fallback to localStorage only if DB fails
      const updatedUser = {
        ...user,
        ...formData,
        profileUrl: formData.avatarUrl || user?.profileUrl,
        email: `${formData.username}@c-mail.vercel.app`
      };
      localStorage.setItem('cmail_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="cmail-settings-page">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="cmail-settings-toast">
          <Check size={18} />
          <span>Saved successfully</span>
        </div>
      )}
      
      <header className="cmail-settings-header">
        <div className="cmail-settings-header-inner">
          <Link to="/dashboard" className="cmail-back-link">
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </Link>
          <h1 className="cmail-settings-title">Profile Settings</h1>
          <div className="cmail-header-spacer"></div>
        </div>
      </header>

      <main className="cmail-settings-content">
        <form onSubmit={handleSubmit} className="cmail-settings-card">
          
          <div className="cmail-avatar-section">
            <div className="cmail-avatar-wrapper" onClick={handleAvatarClick}>
              {(formData.avatarUrl?.trim() || user?.profileUrl?.trim()) ? (
                <img 
                  src={formData.avatarUrl || user?.profileUrl} 
                  alt="Profile" 
                  className="cmail-avatar-img" 
                />
              ) : (
                <div className="cmail-avatar-placeholder">
                  {formData.firstName?.[0] || user?.firstName?.[0]}{formData.secondName?.[0] || user?.secondName?.[0]}
                </div>
              )}
              <div className="cmail-avatar-overlay">
                <Camera size={20} />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="cmail-hidden-input"
              />
            </div>
            <div className="cmail-avatar-info">
              <h3>Profile Picture</h3>
              <p>Click to upload a new avatar. Recommended size 256x256px.</p>
            </div>
          </div>

          <div className="cmail-settings-divider"></div>

          <div className="cmail-form-grid">
            <Input 
              label="First Name" 
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <Input 
              label="Second Name" 
              name="secondName"
              value={formData.secondName}
              onChange={handleChange}
              required
            />
            
            <Input 
              label="Phone Number" 
              name="number"
              type="tel"
              value={formData.number}
              onChange={(e) => {
                handleChange(e);
                if (phoneError) setPhoneError('');
              }}
              error={phoneError}
              required
            />

            <Input 
              label="Username" 
              name="username"
              tail="@c-mail.vercel.app"
              value={formData.username}
              onChange={handleChange}
              disabled
              className="cmail-input-disabled"
            />
          </div>

          <div className="cmail-settings-divider"></div>

          <div className="cmail-location-section">
            <div className="cmail-location-header">
              <label className="cmail-input-label">Physical Location</label>
              <div className="cmail-encrypted-badge">
                <ShieldCheck size={14} className="cmail-secure-icon" />
                <span>End-to-End Encrypted</span>
              </div>
            </div>
            
            <div className="cmail-location-input-wrapper">
              <div className="cmail-location-display disabled">
                <div className="cmail-location-flex">
                  <Lock size={16} className="cmail-lock-icon" />
                  <span className="cmail-loc-placeholder">Not needed</span>
                </div>
              </div>
            </div>
            <p className="cmail-settings-hint">
              Location tracking is disabled for this account.
            </p>
          </div>

          <div className="cmail-settings-actions">
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>

        </form>
      </main>
    </div>
  );
}
