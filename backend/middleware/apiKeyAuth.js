// Simple API key middleware
module.exports = function(req, res, next) {
  const apiKey = req.header('x-api-key');
  const validKey = process.env.IOT_API_KEY || 'test-api-key'; // Set in env for production
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ ok: false, error: 'Invalid or missing API key' });
  }
  next();
};
