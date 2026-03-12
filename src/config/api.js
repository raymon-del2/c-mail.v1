// API Configuration
// Uses environment variable in production, localhost in development

const getApiUrl = () => {
  // Check for Vite environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check for other environment variables
  if (import.meta.env.REACT_APP_API_URL) {
    return import.meta.env.REACT_APP_API_URL;
  }
  
  // If running on Vercel (production), use relative path for API rewrites
  if (window.location.hostname.includes('vercel.app')) {
    return '';  // Empty string = relative path, Vercel rewrite handles it
  }
  
  // Default to localhost for development
  return 'http://localhost:5000';
};

export const API_URL = getApiUrl();
export const API_BASE = API_URL ? `${API_URL}/api` : '/api';

export default API_URL;
