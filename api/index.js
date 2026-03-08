// Vercel Serverless API wrapper for Express app
import app from '../backend/server.js';

// Vercel serverless handler
export default async function handler(req, res) {
  // Ensure Express app handles the request
  return new Promise((resolve, reject) => {
    app(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}
