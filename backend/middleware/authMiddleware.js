const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      // Keep both keys for backward compatibility across mixed route implementations.
      id: decoded.userId,
      userId: decoded.userId,
      role: decoded.role
    };

    next();

  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};