import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './AuthAuthorize.css';

const API_BASE_URL = 'http://localhost:5000';

export default function AuthAuthorize() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope') || 'profile email';
  const state = searchParams.get('state');
  const _responseType = searchParams.get('response_type') || 'code';

  const handleAllow = useCallback(async (auto = false) => {
    if (!auto && !consentChecked) return;
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/create-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          userId: currentUser._id,
          redirectUri,
          scope
        })
      });

      const data = await res.json();
      
      if (data.code) {
        // Redirect back to the app with the code
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('code', data.code);
        if (state) {
          redirectUrl.searchParams.set('state', state);
        }
        window.location.assign(redirectUrl.toString());
      } else {
        setError(data.error || 'Failed to create authorization code');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error creating code:', err);
      setError('Failed to authorize. Please try again.');
      setLoading(false);
    }
  }, [clientId, redirectUri, scope, state, currentUser, consentChecked]);

  const checkConsentAndLoad = useCallback(async (userId) => {
    try {
      // Check if user has already consented
      const consentRes = await fetch(`${API_BASE_URL}/api/auth/check-consent?userId=${userId}&clientId=${clientId}`);
      const consentData = await consentRes.json();
      
      if (consentData.hasConsent) {
        // Auto-approve and redirect
        handleAllow(true);
        return;
      }

      // Get API key info for display
      const _apiKeyRes = await fetch(`${API_BASE_URL}/api/devapi/${userId}`);
      const _apiKeyData = await _apiKeyRes.json();
      
      setClientInfo({
        name: 'External App',
        clientId: clientId,
        redirectUri: redirectUri
      });
      
      setConsentChecked(true);
      setLoading(false);
    } catch (err) {
      console.error('Error checking consent:', err);
      setError('Failed to load authorization information');
      setLoading(false);
    }
  }, [clientId, redirectUri, handleAllow]);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const userData = localStorage.getItem('user');
    if (!userData) {
      // Redirect to login with return URL
      navigate(`/?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);

    // Validate required params
    if (!clientId || !redirectUri) {
      setError('Missing required parameters: client_id and redirect_uri are required');
      setLoading(false);
      return;
    }

    // Fetch client info and check consent
    checkConsentAndLoad(user._id);
  }, [clientId, redirectUri, navigate, checkConsentAndLoad]);

  const handleDeny = () => {
    // Redirect back with error
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', 'User denied access');
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }
    window.location.assign(redirectUrl.toString());
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('user');
    navigate(`/?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  };

  if (loading) {
    return (
      <div className="cmail-auth-container">
        <div className="cmail-auth-loading">
          <div className="cmail-auth-spinner"></div>
          <p>Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cmail-auth-container">
        <div className="cmail-auth-card error">
          <h2>Authorization Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="cmail-auth-btn-primary">
            Go to C-mail
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cmail-auth-container">
      <div className="cmail-auth-card">
        {/* App Logo/Header */}
        <div className="cmail-auth-header">
          <div className="cmail-auth-logo">
            <span className="cmail-auth-logo-icon">C</span>
            <span className="cmail-auth-logo-text">C-mail</span>
          </div>
          <p className="cmail-auth-subtitle">Sign in to {clientInfo?.name || 'an external app'}</p>
        </div>

        {/* Permission Scope */}
        <div className="cmail-auth-permissions">
          <p className="cmail-auth-perm-text">
            <strong>{clientInfo?.name || 'This app'}</strong> will receive:
          </p>
          <ul className="cmail-auth-scope-list">
            {scope.split(' ').map((s, i) => (
              <li key={i} className="cmail-auth-scope-item">
                <span className="cmail-auth-check">✓</span>
                <span>{s === 'profile' ? 'Your name and profile picture' : s === 'email' ? 'Your email address' : s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Account Picker */}
        <div className="cmail-auth-account">
          <div className="cmail-auth-profile">
            {currentUser?.profileUrl ? (
              <img src={currentUser.profileUrl} alt="" className="cmail-auth-avatar" />
            ) : (
              <div className="cmail-auth-avatar-placeholder">
                {currentUser?.firstName?.[0]}{currentUser?.secondName?.[0]}
              </div>
            )}
            <div className="cmail-auth-profile-info">
              <p className="cmail-auth-name">{currentUser?.firstName} {currentUser?.secondName}</p>
              <p className="cmail-auth-email">{currentUser?.email}</p>
            </div>
          </div>

          <button 
            className="cmail-auth-btn-continue"
            onClick={() => handleAllow(false)}
          >
            Continue as {currentUser?.firstName}
          </button>

          <button 
            className="cmail-auth-btn-switch"
            onClick={handleSwitchAccount}
          >
            Use another account
          </button>
        </div>

        {/* Footer */}
        <div className="cmail-auth-footer">
          <p>C-mail will share your information with this app.</p>
          <button onClick={handleDeny} className="cmail-auth-btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
