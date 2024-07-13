// backend/utils/middleware.js
function restrictToLocalhost(req, res, next) {
  const allowedHosts = ['127.0.0.1', 'localhost', '::1'];
  const forwardedHost = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (allowedHosts.includes(forwardedHost)) {
    next();
  } else {
    res.status(403).send('Access denied');
  }
}

module.exports = { restrictToLocalhost };