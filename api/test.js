// Minimal Vercel API test
export default function handler(req, res) {
  res.json({ success: true, message: 'API is working', path: req.url });
}
