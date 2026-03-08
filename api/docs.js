// Bot-aware API docs route - serves different content based on user agent

export default function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  
  // List of common bot/AI user agents
  const bots = [
    'bot', 'crawl', 'spider', 'slurp', 'mediapartners', 
    'googlebot', 'bingbot', 'yandex', 'duckduckbot',
    'anthropic', 'claude', 'openai', 'gpt', 'chatgpt',
    'anthropic-ai', 'claude-bot', 'ai2-bot', 'meta-externalbot',
    'facebookexternalhit', 'twitterbot', 'applebot', 'discordbot'
  ];
  
  const isBot = bots.some(bot => userAgent.toLowerCase().includes(bot));
  
  if (isBot) {
    // Serve static HTML for bots/AIs
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>C-mail API Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #1e3a8a; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: inherit; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background: #f8fafc; }
    .endpoint { background: #f0fdf4; border: 1px solid #22c55e; padding: 10px; margin: 10px 0; border-radius: 6px; }
    .method { display: inline-block; background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px; }
    .verification { background: #dbeafe; color: #1d4ed8; }
    .notification { background: #dcfce7; color: #16a34a; }
    .promotion { background: #fee2e2; color: #dc2626; }
    .update { background: #fef9c3; color: #ca8a04; }
  </style>
</head>
<body>
  <h1>C-mail API Documentation</h1>
  <p>Build authentication and transactional email into your applications with the C-mail platform.</p>

  <h2>Base URL</h2>
  <p><code>https://c-mail.vercel.app</code></p>

  <h2>Authentication</h2>
  <p>All API requests require an API key. Get your API key from the Developer Console (/devapi).</p>

  <h2>OAuth2 Authorization Flow</h2>
  <h3>Step 1: Redirect to Authorization</h3>
  <pre><code>const params = new URLSearchParams({
  client_id: 'YOUR_API_KEY',
  redirect_uri: 'https://your-app.com/callback',
  response_type: 'code',
  scope: 'profile email'
});
window.location.href = \`https://c-mail.vercel.app/auth/authorize?\${params}\`;</code></pre>

  <h3>Step 2: Exchange Code for Token</h3>
  <pre><code>POST /api/v1/verify
Content-Type: application/json

{
  "code": "AUTHORIZATION_CODE",
  "clientId": "YOUR_API_KEY"
}</code></pre>

  <h3>Token Response</h3>
  <pre><code>{
  "access_token": "cmail_token_abc123",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": {
    "sub": "user_id",
    "name": "John Doe",
    "email": "username@c-mail.vercel.app",
    "username": "username"
  }
}</code></pre>

  <h2>Sending Email</h2>
  <pre><code>POST /api/v1/send
Content-Type: application/json

{
  "apiKey": "YOUR_API_KEY",
  "to": "username@c-mail.vercel.app",
  "subject": "Your Verification Code",
  "body": "<h1>Your code: 123456</h1>",
  "appName": "Your App",
  "category": "verification"
}</code></pre>

  <h3>Email Categories</h3>
  <p>
    <span class="badge verification">verification</span> Blue - for OTPs and verification codes<br>
    <span class="badge notification">notification</span> Green - for general notifications<br>
    <span class="badge promotion">promotion</span> Red - for marketing emails<br>
    <span class="badge update">update</span> Yellow - for product updates
  </p>

  <h2>API Endpoints</h2>
  <div class="endpoint"><span class="method">POST</span> <code>/api/v1/send</code> - Send transactional email</div>
  <div class="endpoint"><span class="method">POST</span> <code>/api/v1/verify</code> - Exchange OAuth code for token</div>
  <div class="endpoint"><span class="method">GET</span> <code>/api/devapi/email-logs/:userId</code> - Get email logs</div>

  <h2>Webhooks</h2>
  <p>Webhooks allow your application to receive real-time notifications when events occur.</p>

  <h3>Authentication Events</h3>
  <table>
    <tr><th>Event</th><th>Description</th></tr>
    <tr><td><code>user.created</code></td><td>New user registered - sync profile to your database</td></tr>
    <tr><td><code>user.updated</code></td><td>User profile changed (email, username, picture)</td></tr>
    <tr><td><code>user.deleted</code></td><td>Account deleted - purge user data for GDPR compliance</td></tr>
    <tr><td><code>session.revoked</code></td><td>User logged out of all devices or account suspended</td></tr>
  </table>

  <h3>Email Events</h3>
  <table>
    <tr><th>Event</th><th>Description</th></tr>
    <tr><td><code>mail.received</code></td><td>New email received with sender, subject, and snippet</td></tr>
    <tr><td><code>mail.failed</code></td><td>Email delivery failed (bounce)</td></tr>
    <tr><td><code>mail.opened</code></td><td>Recipient opened an email sent via API (tracking enabled)</td></tr>
  </table>

  <h3>Webhook Payload</h3>
  <pre><code>{
  "event": "mail.received",
  "created_at": "2026-03-08T21:00:00Z",
  "data": {
    "id": "msg_12345",
    "from": "sender@example.com",
    "subject": "Project Update",
    "snippet": "Here is the latest progress...",
    "link": "https://c-mail.vercel.app/mail/msg_12345"
  }
}</code></pre>

  <h3>Security - Signature Verification</h3>
  <p>Verify webhooks using HMAC-SHA256 with your webhook secret:</p>
  <pre><code>// Node.js example
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

// Check X-Cmail-Signature header
const signature = req.headers['x-cmail-signature'];
if (!verifyWebhook(req.body, signature, WEBHOOK_SECRET)) {
  return res.status(401).send('Invalid signature');
}</code></pre>

  <h3>Retry Logic</h3>
  <p>If your server doesn't return 200 OK, C-mail retries with exponential backoff:</p>
  <ul>
    <li>Retry 1: 1 second delay</li>
    <li>Retry 2: 5 second delay</li>
    <li>Retry 3: 25 second delay</li>
  </ul>
  <p>After 3 failures, the webhook is marked as failed.</p>

  <h2>Error Codes</h2>
  <table>
    <tr><th>Code</th><th>Description</th></tr>
    <tr><td>400</td><td>Bad Request - Invalid parameters</td></tr>
    <tr><td>401</td><td>Unauthorized - Invalid API key</td></tr>
    <tr><td>404</td><td>Not Found - User not found</td></tr>
    <tr><td>429</td><td>Rate Limited - Too many requests</td></tr>
  </table>

  <h2>Rate Limits</h2>
  <table>
    <tr><th>Status</th><th>Daily Limit</th></tr>
    <tr><td>Unverified</td><td>50 emails/day</td></tr>
    <tr><td>Verified Domain</td><td>Unlimited</td></tr>
  </table>
</body>
</html>`);
  } else {
    // Redirect humans to the React app's API docs page
    res.redirect(302, '/api-docs');
  }
}
