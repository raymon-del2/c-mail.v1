import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import './Verify.css';
import { API_URL } from '../config/api';

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(() => {
    const token = searchParams.get('token');
    const appId = searchParams.get('appId');
    return !token || !appId ? 'error' : 'verifying';
  });
  const [message, setMessage] = useState(() => {
    const token = searchParams.get('token');
    const appId = searchParams.get('appId');
    return !token || !appId ? 'Invalid or missing verification link' : '';
  });
  
  const token = searchParams.get('token');
  const appId = searchParams.get('appId');
  
  useEffect(() => {
    if (!token || !appId) return;
    
    // Verify the magic link
    const verifyLink = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dev/auth/verify-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, appId })
        });
        
        const data = await response.json();
        
        if (data.success && data.verified) {
          setStatus('success');
          setMessage('Email verified successfully!');
          
          // Redirect to the developer's app after 2 seconds
          if (data.redirectUrl) {
            const redirectUrl = new URL(data.redirectUrl);
            redirectUrl.searchParams.append('code', data.authCode);
            redirectUrl.searchParams.append('email', data.email);
            
            setTimeout(() => {
              window.location.href = redirectUrl.toString();
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };
    
    verifyLink();
  }, [token, appId]);
  
  return (
    <div className="verify-container">
      <div className="verify-card">
        {status === 'verifying' && (
          <>
            <Loader2 className="verify-icon verifying" size={48} />
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your link.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="verify-icon success" size={48} />
            <h2>Email Verified!</h2>
            <p>{message}</p>
            <p className="verify-redirect">Redirecting you back to the app...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="verify-icon error" size={48} />
            <h2>Verification Failed</h2>
            <p>{message}</p>
            <button 
              className="verify-home-btn"
              onClick={() => navigate('/')}
            >
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
