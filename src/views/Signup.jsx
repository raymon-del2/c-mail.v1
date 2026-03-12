import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import './Signup.css';
import './SignupMobile.css';

const API_URL = 'http://localhost:5000/api';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    username: '',
    password: ''
  });
  
  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const payload = isLogin 
        ? { email: `${formData.username}@c-mail.vercel.app`, password: formData.password }
        : { ...formData, email: `${formData.username}@c-mail.vercel.app` };
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Check if response is empty before parsing JSON
      const text = await response.text();
      if (!text) {
        throw new Error('Server returned empty response');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', text);
        throw new Error('Invalid server response');
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      localStorage.setItem('cmail_user', JSON.stringify(data.user));
      
      if (!isLogin) {
        navigate('/setup-profile');
      } else {
        navigate(`/${formData.username}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="center-content cmail-signup-page">
      <div className="cmail-signup-card">
        <div className="cmail-signup-header">
          <div className="cmail-logo">
            <img src="/cmail.svg" alt="C-mail" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="cmail-signup-title">
            {isLogin ? 'Sign In to C-mail' : 'Create your C-mail'}
          </h1>
          <p className="cmail-signup-subtitle">
            {isLogin ? 'Welcome back! Please enter your details.' : 'Enter your details to get started.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="cmail-signup-form">
          {!isLogin && (
            <div className="cmail-form-row">
              <Input 
                label="First Name" 
                name="firstName"
                placeholder="Ex: John"
                value={formData.firstName}
                onChange={handleChange}
                required={!isLogin}
              />
              <Input 
                label="Second Name" 
                name="secondName"
                placeholder="Ex: Doe"
                value={formData.secondName}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}

          <Input 
            label="Username" 
            name="username"
            placeholder="johndoe"
            tail="@c-mail.vercel.app"
            value={formData.username}
            onChange={handleChange}
            required
            pattern="[a-zA-Z0-9]+"
            title="Only alphanumeric characters allowed"
          />

          <Input 
            label="Password" 
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {error && (
            <p style={{ color: '#ff5555', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
          )}

          <div className="cmail-signup-actions">
            <Button type="submit" className="cmail-signup-btn" isLoading={isLoading}>
              {isLogin ? 'Sign In' : 'Continue'}
            </Button>
          </div>
          
          <div className="cmail-signup-toggle">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                className="cmail-toggle-btn"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
          
          <div className="cmail-signup-dev-link">
            <Link to="/api-docs" className="cmail-dev-link">
              Developer
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
