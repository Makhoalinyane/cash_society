/**
 * Block create/update/delete unless X-Admin-Key matches.
 * GET stays open so the member /view link can read data.
 */
function requireAdmin(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const expected = process.env.ADMIN_SECRET || 'cash-society-admin';
  const provided = req.get('X-Admin-Key') || '';

  if (!provided || provided !== expected) {
    return res.status(401).json({
      error: 'Editing is disabled on the member view. Use the admin app on this PC to record changes.',
    });
  }

  return next();
}

module.exports = { requireAdmin };
