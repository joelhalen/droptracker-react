const Bottleneck = require('bottleneck');
const { WOMClient } = require('@wise-old-man/utils');

const womclient = new WOMClient({
  authKey: process.env.WOM_API_KEY,
  userAgent: '@joelhalen -droptracker.io'
});

const limiter = new Bottleneck({
  maxConcurrent: 1,       // Allow only one concurrent request at a time
  minTime: 600,           // Minimum time between requests (600 ms = 100 requests per minute)
  reservoir: 100,         // Maximum number of requests per minute
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000 // Refill reservoir every minute
});

async function rateLimitedWomClientCall(fn, ...args) {
  return await limiter.schedule(() => fn.apply(womclient, args));
}

module.exports = {
  womclient,
  rateLimitedWomClientCall
};
