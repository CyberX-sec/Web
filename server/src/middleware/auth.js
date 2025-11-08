function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    next();
    return;
  }

  res.status(401).json({ error: 'Unauthorized' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.session.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}

module.exports = {
  ensureAuthenticated,
  requireRole,
};
