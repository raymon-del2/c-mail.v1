import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';
import { API_URL } from '../config/api';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const timeoutRef = useRef(null);
  
  useEffect(() => {
    const MAX_WAIT_TIME = 3000;
    
    const checkAuth = async () => {
      timeoutRef.current = setTimeout(() => {
        console.log('Splash screen timeout - forcing redirect');
        const stored = localStorage.getItem('cmail_accounts');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            const activeAccount = data.activeAccount;
            const account = data.accounts?.find(acc => acc.email === activeAccount);
            if (account?.username) {
              navigate(`/${account.username}/inbox`, { replace: true });
              return;
            }
          } catch (e) {
            console.error('Fallback redirect failed:', e);
          }
        }
        navigate('/login', { replace: true });
      }, MAX_WAIT_TIME);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const stored = localStorage.getItem('cmail_accounts');
        
        if (!stored) {
          setStatus('failed');
          navigate('/login', { replace: true });
          return;
        }
        
        const data = JSON.parse(stored);
        const activeAccount = data.activeAccount;
        const account = data.accounts?.find(acc => acc.email === activeAccount);
        
        if (!account || !account.token) {
          setStatus('failed');
          navigate('/login', { replace: true });
          return;
        }
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${account.token}` },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const userData = await response.json();
            clearTimeout(timeoutRef.current);
            navigate(`/${userData.username}/inbox`, { replace: true });
            return;
          }
        } catch (err) {
          console.log('Backend verification failed, using local data:', err.message);
        }
        
        clearTimeout(timeoutRef.current);
        if (account.username) {
          navigate(`/${account.username}/inbox`, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
        
      } catch (e) {
        console.error('Auth check error:', e);
        clearTimeout(timeoutRef.current);
        navigate('/login', { replace: true });
      }
    };
    
    checkAuth();
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [navigate]);
  
  const statusText = {
    checking: 'Checking for accounts...',
    redirecting: 'Opening your inbox...',
    failed: 'Redirecting to login...'
  };
  
  return (
    <div className="splash-screen">
      <div className="splash-content">
        {/* Logo */}
        <div className="splash-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        
        {/* App Name */}
        <h1 className="splash-title">C-mail</h1>
        
        {/* Loader */}
        <div className="splash-loader">
          <Loader2 size={24} className="splash-spinner" />
          <span className="splash-text">{statusText[status]}</span>
        </div>
      </div>
    </div>
  );
}
