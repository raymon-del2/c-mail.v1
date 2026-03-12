import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Search, Menu, X, Copy, Check, Command, 
  ChevronRight, Code2, Terminal, Mail, Shield, 
  Zap, FileText, ArrowLeft, ExternalLink 
} from 'lucide-react';
import './ApiDocs.css';

// Simple syntax highlighting component
const CodeBlock = ({ code, language = 'javascript', title }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple keyword highlighting
  const highlightCode = (text) => {
    const keywords = ['const', 'let', 'var', 'function', 'return', 'async', 'await', 'import', 'export', 'from', 'try', 'catch', 'if', 'else', 'for', 'while'];
    
    // Helper to insert zero-width spaces in long strings for mobile breaking
    const insertBreaks = (str, every = 25) => {
      if (str.length <= every) return str;
      return str.split('').map((char, i) => 
        i > 0 && i % every === 0 ? char + '&#8203;' : char
      ).join('');
    };
    
    let highlighted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight strings (simple pattern for quotes)
    highlighted = highlighted.replace(
      /(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
      (match, p1, p2, p3) => {
        // Insert zero-width spaces in the string content for breaking
        const breakableContent = insertBreaks(p2);
        return `<span class="code-string">${p1}${breakableContent}${p3}</span>`;
      }
    );

    // Highlight comments
    highlighted = highlighted.replace(
      /(\/\/.*$)/gm,
      '<span class="code-comment">$1</span>'
    );

    // Highlight keywords
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="code-keyword">${keyword}</span>`);
    });

    return highlighted;
  };

  return (
    <div className="apidocs-code-block">
      {title && (
        <div className="apidocs-code-header">
          <span className="apidocs-code-title">{title}</span>
          <span className="apidocs-code-lang">{language}</span>
        </div>
      )}
      <div className="apidocs-code-content">
        <pre className="apidocs-pre">
          <code 
            className={`apidocs-code language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
          />
        </pre>
        <button 
          className="apidocs-copy-btn"
          onClick={copyToClipboard}
          title="Copy to clipboard"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
};

// Command Palette Component
const CommandPalette = ({ isOpen, onClose, sections, onNavigate }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = sections.flatMap(section => 
    section.items.map(item => ({
      ...item,
      section: section.title
    }))
  ).filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.section.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && items[selectedIndex]) {
        onNavigate(items[selectedIndex].id);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onNavigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="apidocs-command-palette-overlay" onClick={onClose}>
      <div className="apidocs-command-palette" onClick={e => e.stopPropagation()}>
        <div className="apidocs-command-header">
          <Search size={16} className="apidocs-command-search-icon" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            className="apidocs-command-input"
            autoFocus
          />
          <kbd className="apidocs-kbd">ESC</kbd>
        </div>
        <div className="apidocs-command-results">
          {items.length === 0 ? (
            <div className="apidocs-command-empty">No results found</div>
          ) : (
            items.map((item, index) => (
              <button
                key={item.id}
                className={`apidocs-command-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => { onNavigate(item.id); onClose(); }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <FileText size={14} />
                <div className="apidocs-command-item-text">
                  <span className="apidocs-command-item-title">{item.title}</span>
                  <span className="apidocs-command-item-section">{item.section}</span>
                </div>
                <ChevronRight size={14} className="apidocs-command-chevron" />
              </button>
            ))
          )}
        </div>
        <div className="apidocs-command-footer">
          <div className="apidocs-command-hint">
            <kbd className="apidocs-kbd-sm">↑↓</kbd>
            <span>to navigate</span>
          </div>
          <div className="apidocs-command-hint">
            <kbd className="apidocs-kbd-sm">↵</kbd>
            <span>to select</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Table of Contents Component
const TableOfContents = ({ sections, activeId }) => {
  return (
    <div className="apidocs-toc">
      <div className="apidocs-toc-title">On this page</div>
      <nav className="apidocs-toc-nav">
        {sections.map(section => (
          <div key={section.id} className="apidocs-toc-section">
            <a 
              href={`#${section.id}`}
              className={`apidocs-toc-link ${activeId === section.id ? 'active' : ''}`}
            >
              {section.title}
            </a>
            {section.items && (
              <div className="apidocs-toc-subitems">
                {section.items.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`apidocs-toc-sublink ${activeId === item.id ? 'active' : ''}`}
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

// Mobile Drawer Component
const MobileDrawer = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="apidocs-drawer-overlay" onClick={onClose} />
      <div className="apidocs-drawer open">
        <div className="apidocs-drawer-header">
          <span className="apidocs-drawer-title">Documentation</span>
          <button className="apidocs-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="apidocs-drawer-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default function ApiDocs() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [activeSection, setActiveSection] = useState('introduction');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Documentation sections
  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      icon: <FileText size={16} />,
      items: [
        { id: 'getting-started', title: 'Getting Started' },
        { id: 'authentication', title: 'Authentication' }
      ]
    },
    {
      id: 'oauth2',
      title: 'OAuth2 / Auth API',
      icon: <Shield size={16} />,
      items: [
        { id: 'authorization', title: 'Authorization Flow' },
        { id: 'token-exchange', title: 'Token Exchange' },
        { id: 'user-info', title: 'User Information' }
      ]
    },
    {
      id: 'email',
      title: 'Transactional Email',
      icon: <Mail size={16} />,
      items: [
        { id: 'sending-email', title: 'Sending Email' },
        { id: 'email-templates', title: 'Email Templates' },
        { id: 'rate-limits', title: 'Rate Limits' }
      ]
    },
    {
      id: 'reference',
      title: 'API Reference',
      icon: <Terminal size={16} />,
      items: [
        { id: 'endpoints', title: 'Endpoints' },
        { id: 'errors', title: 'Error Codes' },
        { id: 'webhooks', title: 'Webhooks' }
      ]
    }
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll spy for active section
  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll('[id]');
      let current = 'introduction';
      
      headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) {
          current = heading.id;
        }
      });
      
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateTo = useCallback((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Code examples
  const examples = {
    oauth: `// Redirect user to C-mail OAuth
const params = new URLSearchParams({
  client_id: 'YOUR_API_KEY',
  redirect_uri: 'https://your-app.com/callback',
  response_type: 'code',
  scope: 'profile email'
});

window.location.href = \`https://c-mail.vercel.app/auth/authorize?\${params}\`;`,

    token: `// Exchange code for access token
const response = await fetch('https://c-mail.vercel.app/api/v1/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'AUTHORIZATION_CODE',
    clientId: 'YOUR_API_KEY'
  })
});

const { access_token, id_token } = await response.json();`,

    email: `// Send transactional email
const response = await fetch('https://c-mail.vercel.app/api/v1/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: 'YOUR_API_KEY',
    to: '{username}@c-mail.vercel.app',
    subject: 'Welcome!',
    body: '<h1>Your code: 123456</h1>',
    appName: 'Your App',
    category: 'verification'
  })
});

const { messageId, status } = await response.json();`,

    curl: `# Test with cURL
curl -X POST https://c-mail.vercel.app/api/v1/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "YOUR_API_KEY",
    "to": "{username}@c-mail.vercel.app",
    "subject": "Welcome!",
    "body": "Hello from your app",
    "appName": "Your App",
    "category": "notification"
  }'`
  };

  return (
    <div className="apidocs-container">
      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        sections={sections}
        onNavigate={navigateTo}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <nav className="apidocs-sidebar-nav">
          {sections.map(section => (
            <div key={section.id} className="apidocs-sidebar-section">
              <div className="apidocs-sidebar-section-title">
                {section.icon}
                <span>{section.title}</span>
              </div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`apidocs-sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => {
                    navigateTo(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </MobileDrawer>

      {/* Sticky Header */}
      <header className="apidocs-header">
        <div className="apidocs-header-left">
          <button 
            className="apidocs-menu-btn"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <button 
            className="apidocs-back-btn"
            onClick={() => navigate(username ? `/${username}/devapi` : '/')}
          >
            <ArrowLeft size={16} />
            <span>{username ? 'Back to Console' : 'Back to Sign In'}</span>
          </button>
        </div>

        <div className="apidocs-header-center">
          <div className="apidocs-search-bar" onClick={() => setIsCommandOpen(true)}>
            <Search size={16} />
            <span>Search documentation...</span>
            <kbd className="apidocs-kbd">⌘K</kbd>
          </div>
        </div>

        <div className="apidocs-header-right">
          <a 
            href="/api/docs" 
            className="apidocs-header-link"
            style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}
          >
            <ExternalLink size={14} />
            AI Docs
          </a>
          <a 
            href="https://github.com/Raymon-del2/c-mail.v1.git" 
            target="_blank" 
            rel="noopener noreferrer"
            className="apidocs-header-link"
          >
            <ExternalLink size={14} />
            GitHub
          </a>
        </div>
      </header>

      {/* AI Notice Banner */}
      <div style={{ 
        background: '#fef3c7', 
        border: '1px solid #f59e0b', 
        padding: '12px 20px', 
        textAlign: 'center',
        fontSize: '14px',
        color: '#92400e'
      }}>
        <strong>👋 Hey humans!</strong> This is the interactive docs. 
        <a href="/api/docs" style={{ color: '#b45309', textDecoration: 'underline', marginLeft: '8px' }}>
          AI/bots can view the static version here →
        </a>
      </div>

      {/* Main Layout */}
      <div className="apidocs-layout">
        {/* Left Sidebar */}
        <aside className="apidocs-sidebar">
          <div className="apidocs-sidebar-header">
            <div className="apidocs-logo">
              <Code2 size={24} />
              <span>C-mail API</span>
            </div>
            <span className="apidocs-version">v1.0</span>
          </div>

          <nav className="apidocs-sidebar-nav">
            {sections.map(section => (
              <div key={section.id} className="apidocs-sidebar-section">
                <div className="apidocs-sidebar-section-title">
                  {section.icon}
                  <span>{section.title}</span>
                </div>
                {section.items.map(item => (
                  <button
                    key={item.id}
                    className={`apidocs-sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => navigateTo(item.id)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Middle Column - Main Content */}
        <main className="apidocs-main">
          <div className="apidocs-content">
            {/* Introduction */}
            <section id="introduction" className="apidocs-section">
              <h1 className="apidocs-title">C-mail API Documentation</h1>
              <p className="apidocs-description">
                Build authentication and transactional email into your applications 
                with the C-mail platform. Simple, secure, and scalable.
              </p>

              <div id="getting-started" className="apidocs-subsection">
                <h2 className="apidocs-heading">Getting Started</h2>
                <p className="apidocs-text">
                  To get started, you'll need an API key.{username && (<> Navigate to your 
                  <a href={`/${username}/devapi`}> Developer Console</a> to generate one.</>)} {!username && ' Sign up to get your API key.'}
                </p>
                
                <div className="apidocs-info-box">
                  <Zap size={16} className="apidocs-info-icon" />
                  <p>
                    <strong>Quick Start:</strong> Use the API key to authenticate requests 
                    from your server. Never expose your API key in client-side code.
                  </p>
                </div>
              </div>

              <div id="authentication" className="apidocs-subsection">
                <h2 className="apidocs-heading">Authentication</h2>
                <p className="apidocs-text">
                  All API requests require authentication using your API key. 
                  Include it in the request body or headers.
                </p>
                
                <CodeBlock 
                  code={`// Include your API key in requests
const apiKey = 'c-mail_xxxxxxxxxxxxxxxx'; // From /devapi

// For OAuth: Use as client_id
// For Email API: Include in request body`}
                  language="javascript"
                  title="Authentication"
                />
              </div>
            </section>

            {/* OAuth2 */}
            <section id="oauth2" className="apidocs-section">
              <div id="authorization" className="apidocs-subsection">
                <h2 className="apidocs-heading">OAuth2 Authorization Flow</h2>
                <p className="apidocs-text">
                  Implement "Sign in with C-mail" in your application. This flow follows 
                  the OAuth2 standard for secure user authentication.
                </p>

                <CodeBlock 
                  code={examples.oauth}
                  language="javascript"
                  title="Step 1: Redirect to C-mail"
                />

                <p className="apidocs-text">
                  After the user authorizes your app, they'll be redirected back to your 
                  specified callback URL with an authorization code.
                </p>
              </div>

              <div id="token-exchange" className="apidocs-subsection">
                <h2 className="apidocs-heading">Token Exchange</h2>
                <p className="apidocs-text">
                  Exchange the authorization code for user information. This should be 
                  done server-side to protect your API key.
                </p>

                <CodeBlock 
                  code={examples.token}
                  language="javascript"
                  title="Step 2: Exchange Code for Token"
                />
              </div>

              <div id="user-info" className="apidocs-subsection">
                <h2 className="apidocs-heading">User Information</h2>
                <p className="apidocs-text">
                  The token response includes the user's profile information.
                </p>

                <CodeBlock 
                  code={`{
  "access_token": "cmail_token_abc123",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": {
    "iss": "https://c-mail.vercel.app",
    "sub": "user_id",
    "name": "John Doe",
    "email": "{username}@c-mail.vercel.app",
    "picture": "https://...",
    "username": "{username}"
  }
}`}
                  language="json"
                  title="Token Response"
                />
              </div>
            </section>

            {/* Transactional Email */}
            <section id="email" className="apidocs-section">
              <div id="sending-email" className="apidocs-subsection">
                <h2 className="apidocs-heading">Sending Transactional Email</h2>
                <p className="apidocs-text">
                  Send branded transactional emails through the C-mail platform. 
                  Perfect for verification codes, notifications, and updates.
                </p>

                <CodeBlock 
                  code={examples.email}
                  language="javascript"
                  title="Send Email"
                />

                <CodeBlock 
                  code={examples.curl}
                  language="bash"
                  title="cURL Example"
                />
              </div>

              <div id="email-templates" className="apidocs-subsection">
                <h2 className="apidocs-heading">Email Templates</h2>
                <p className="apidocs-text">
                  Emails are automatically branded with your app's identity. 
                  The template includes your app logo, name, and a C-mail footer 
                  with a link to manage connected apps.
                </p>

                <div className="apidocs-categories">
                  <div className="apidocs-category">
                    <span className="apidocs-category-badge verification">Verification</span>
                    <span>Blue theme - for OTPs and verification codes</span>
                  </div>
                  <div className="apidocs-category">
                    <span className="apidocs-category-badge notification">Notification</span>
                    <span>Green theme - for general notifications</span>
                  </div>
                  <div className="apidocs-category">
                    <span className="apidocs-category-badge promotion">Promotion</span>
                    <span>Red theme - for marketing emails</span>
                  </div>
                  <div className="apidocs-category">
                    <span className="apidocs-category-badge update">Update</span>
                    <span>Yellow theme - for product updates</span>
                  </div>
                </div>
              </div>

              <div id="rate-limits" className="apidocs-subsection">
                <h2 className="apidocs-heading">Rate Limits</h2>
                <p className="apidocs-text">
                  To protect your domain reputation, email sending is rate-limited 
                  based on verification status.
                </p>

                <div className="apidocs-table-wrapper">
                  <table className="apidocs-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Daily Limit</th>
                        <th>Spam Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Unverified</td>
                        <td>50 emails/day</td>
                        <td>Required</td>
                      </tr>
                      <tr>
                        <td>Verified Domain</td>
                        <td>Unlimited</td>
                        <td>Optional</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* API Reference */}
            <section id="reference" className="apidocs-section">
              <div id="endpoints" className="apidocs-subsection">
                <h2 className="apidocs-heading">Endpoints</h2>
                
                <div className="apidocs-endpoint">
                  <div className="apidocs-endpoint-header">
                    <span className="apidocs-method post">POST</span>
                    <code className="apidocs-endpoint-url">/api/v1/send</code>
                  </div>
                  <p className="apidocs-endpoint-desc">Send transactional email</p>
                </div>

                <div className="apidocs-endpoint">
                  <div className="apidocs-endpoint-header">
                    <span className="apidocs-method post">POST</span>
                    <code className="apidocs-endpoint-url">/api/v1/verify</code>
                  </div>
                  <p className="apidocs-endpoint-desc">Exchange OAuth code for token</p>
                </div>

                <div className="apidocs-endpoint">
                  <div className="apidocs-endpoint-header">
                    <span className="apidocs-method get">GET</span>
                    <code className="apidocs-endpoint-url">/api/devapi/email-logs/:userId</code>
                  </div>
                  <p className="apidocs-endpoint-desc">Retrieve email send logs</p>
                </div>
              </div>

              <div id="auth-service" className="apidocs-subsection">
                <h2 className="apidocs-heading">Authentication as a Service</h2>
                <p className="apidocs-text">
                  C-mail provides Authentication as a Service for third-party developers. Use our OTP and Magic Link 
                  flows to verify users without building your own email infrastructure. Perfect for SSO, passwordless login, 
                  and account verification.
                </p>

                <div className="apidocs-info-box">
                  <strong>Base URL:</strong> <code>https://c-mail.vercel.app/api/dev/auth</code><br/>
                  <strong>Auth Required:</strong> API Key in header <code>X-API-Key</code>
                </div>

                <h3 className="apidocs-subheading">OTP Flow</h3>
                
                <div className="apidocs-endpoint">
                  <div className="apidocs-endpoint-header">
                    <span className="apidocs-method post">POST</span>
                    <code className="apidocs-endpoint-url">/api/dev/auth/send-otp</code>
                  </div>
                  <p className="apidocs-endpoint-desc">Send 6-digit OTP to user's email</p>
                  <CodeBlock code={`// Request
POST /api/dev/auth/send-otp
Headers: { "X-API-Key": "your_api_key" }
Body: {
  "email": "user@example.com",
  "appName": "Your App Name"
}

// Response
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": "10 minutes"
}`} />
                </div>

                <div className="apidocs-endpoint">
                  <div className="apidocs-endpoint-header">
                    <span className="apidocs-method post">POST</span>
                    <code className="apidocs-endpoint-url">/api/dev/auth/verify-otp</code>
                  </div>
                  <p className="apidocs-endpoint-desc">Verify the 6-digit OTP code</p>
                  <CodeBlock code={`// Request
POST /api/dev/auth/verify-otp
Headers: { "X-API-Key": "your_api_key" }
Body: {
  "email": "user@example.com",
  "code": "123456"
}

// Response - Success
{
  "success": true,
  "verified": true,
  "user": {
    "email": "user@example.com",
    "verified": true
  }
}

// Response - Failed
{
  "success": false,
  "verified": false,
  "message": "Invalid or expired code"
}`} />
                </div>

                <h3 className="apidocs-subheading">Magic Link Flow</h3>
                
                <div className="apidocs-endpoint">
                  <div className="apidocs-endpoint-header">
                    <span className="apidocs-method post">POST</span>
                    <code className="apidocs-endpoint-url">/api/dev/auth/send-magic-link</code>
                  </div>
                  <p className="apidocs-endpoint-desc">Send clickable magic link for one-click verification</p>
                  <CodeBlock code={`// Request
POST /api/dev/auth/send-magic-link
Headers: { "X-API-Key": "your_api_key" }
Body: {
  "email": "user@example.com",
  "appName": "Your App Name",
  "redirectUrl": "https://yourapp.com/callback"
}

// Response
{
  "success": true,
  "message": "Magic link sent successfully",
  "expiresIn": "15 minutes"
}`} />
                </div>

                <div className="apidocs-endpoint">
                  <div className="apidocs-endpoint-header">
                    <span className="apidocs-method post">POST</span>
                    <code className="apidocs-endpoint-url">/api/dev/auth/verify-link</code>
                  </div>
                  <p className="apidocs-endpoint-desc">Verify magic link token (called by your frontend after user clicks link)</p>
                  <CodeBlock code={`// Request
POST /api/dev/auth/verify-link
Headers: { "X-API-Key": "your_api_key" }
Body: {
  "token": "abc123xyz",
  "appId": "your_app_id"
}

// Response - Success
{
  "success": true,
  "verified": true,
  "redirectUrl": "https://yourapp.com/callback?status=success",
  "user": {
    "email": "user@example.com",
    "verified": true
  }
}

// Response - Failed
{
  "success": false,
  "verified": false,
  "message": "Invalid or expired link"
}`} />
                </div>

                <h3 className="apidocs-subheading">Email Templates</h3>
                <p className="apidocs-text">
                  C-mail automatically sends branded emails using your app name:
                </p>
                <ul className="apidocs-list">
                  <li><strong>OTP Email:</strong> Contains 6-digit code, expires in 10 minutes, dark mode design</li>
                  <li><strong>Magic Link Email:</strong> Contains clickable button, expires in 15 minutes, redirects back to your app</li>
                </ul>
              </div>

              <div id="webhooks" className="apidocs-subsection">
                <h2 className="apidocs-heading">Webhooks</h2>
                <p className="apidocs-text">
                  Webhooks allow your application to receive real-time notifications when events occur.
                  Configure webhook endpoints in your Developer Console to receive POST requests when users
                  authenticate, emails arrive, or other events happen.
                </p>

                <h3 className="apidocs-subheading">Authentication Events</h3>
                <div className="apidocs-table-wrapper">
                  <table className="apidocs-table">
                    <thead>
                      <tr><th>Event</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                      <tr><td><code>user.created</code></td><td>New user registered - sync profile to your database</td></tr>
                      <tr><td><code>user.updated</code></td><td>User profile changed (email, username, picture)</td></tr>
                      <tr><td><code>user.deleted</code></td><td>Account deleted - purge user data for GDPR compliance</td></tr>
                      <tr><td><code>session.revoked</code></td><td>User logged out of all devices or account suspended</td></tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="apidocs-subheading">Email Events</h3>
                <div className="apidocs-table-wrapper">
                  <table className="apidocs-table">
                    <thead>
                      <tr><th>Event</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                      <tr><td><code>mail.received</code></td><td>New email received with sender, subject, and snippet</td></tr>
                      <tr><td><code>mail.failed</code></td><td>Email delivery failed (bounce)</td></tr>
                      <tr><td><code>mail.opened</code></td><td>Recipient opened an email sent via API (tracking enabled)</td></tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="apidocs-subheading">Webhook Payload</h3>
                <CodeBlock 
                  code={`{
  "event": "mail.received",
  "created_at": "2026-03-08T21:00:00Z",
  "data": {
    "id": "msg_12345",
    "from": "sender@example.com",
    "subject": "Project Update",
    "snippet": "Here is the latest progress on the deployment...",
    "link": "https://c-mail.vercel.app/mail/msg_12345"
  }
}`}
                  language="json"
                  title="Example Payload"
                />

                <h3 className="apidocs-subheading">Security - Signature Verification</h3>
                <p className="apidocs-text">
                  All webhooks include a signature header to verify they came from C-mail. 
                  Verify using HMAC-SHA256 with your webhook secret:
                </p>
                <CodeBlock 
                  code={`// Node.js example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Verify the X-Cmail-Signature header
const signature = req.headers['x-cmail-signature'];
if (!verifyWebhook(req.body, signature, WEBHOOK_SECRET)) {
  return res.status(401).send('Invalid signature');
}`}
                  language="javascript"
                  title="Signature Verification"
                />

                <h3 className="apidocs-subheading">Retry Logic</h3>
                <p className="apidocs-text">
                  If your server doesn't return a 200 OK, C-mail will retry with exponential backoff:
                  <br/>• Retry 1: 1 second delay
                  <br/>• Retry 2: 5 second delay  
                  <br/>• Retry 3: 25 second delay
                  <br/>After 3 failures, the webhook is marked as failed.
                </p>
              </div>

              <div id="errors" className="apidocs-subsection">
                <h2 className="apidocs-heading">Error Codes</h2>
                
                <div className="apidocs-table-wrapper">
                  <table className="apidocs-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>400</code></td>
                        <td>Bad Request - Invalid parameters</td>
                      </tr>
                      <tr>
                        <td><code>401</code></td>
                        <td>Unauthorized - Invalid API key</td>
                      </tr>
                      <tr>
                        <td><code>404</code></td>
                        <td>Not Found - User not found</td>
                      </tr>
                      <tr>
                        <td><code>429</code></td>
                        <td>Rate Limited - Too many requests</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Right Column - Table of Contents */}
        <aside className="apidocs-toc-column">
          <TableOfContents sections={sections} activeId={activeSection} />
        </aside>
      </div>
    </div>
  );
}
