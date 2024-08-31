const jwt = require('jsonwebtoken');

function restrictToLocalhost(req, res, next) {
  const allowedHosts = ['127.0.0.1', 'localhost', '::1'];
  const forwardedHost = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (allowedHosts.includes(forwardedHost)) {
    next();
  } else {
    res.status(403).send('Access denied');
  }
}

const verifyToken = (req, res, next) => {
  const allowedHosts = ['127.0.0.1', 'localhost', '::1'];
  const forwardedHost = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (allowedHosts.includes(forwardedHost)) {
    next();
  } else {
    const token = req.headers['authorization'];
    if (!token) {
      console.error('No token provided');
      return res.status(403).send({ auth: false, message: 'No token provided.' });
    }

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Failed to authenticate token', err);
        return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
      }
      req.userId = decoded.id;
      next();
    });
  }
};

module.exports = { verifyToken, restrictToLocalhost };
