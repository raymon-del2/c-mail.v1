// Vercel Serverless API wrapper for Express app
let app;

try {
  app = (await import('../backend/server.js')).default;
} catch (err) {
  console.error('Failed to import server:', err);
}

// Vercel serverless handler with error handling
export default async function handler(req, res) {
  if (!app) {
    return res.status(500).json({ 
      error: 'Server initialization failed',
      details: 'Could not load Express app. Check server logs.'
    });
  }
  
  try {
    // Ensure Express app handles the request
    return new Promise((resolve, reject) => {
      app(req, res, (result) => {
        if (result instanceof Error) {
          console.error('Express error:', result);
          return reject(result);
        }
        return resolve(result);
      });
    });
  } catch (error) {
    console.error('Serverless handler error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
