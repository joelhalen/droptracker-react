const fs = require('fs');
const path = require('path');
const { format, differenceInHours } = require('date-fns');

const INSTALLS_CACHE_FILE = path.join(__dirname, './installs_cache.json');

const GetPluginInstalls = async () => {
    {/* Gets the current number of plugin installations specified by the RuneLite website
        Via a simplescraper.io request */}
  if (fs.existsSync(INSTALLS_CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(INSTALLS_CACHE_FILE, 'utf-8'));
    const lastUpdate = new Date(cache.last_update);

    if (differenceInHours(new Date(), lastUpdate) < 6) {
      return cache.total_installs;
    }
  }

  // If cache is invalid or does not exist, fetch new data
  const { default: fetch } = await import('node-fetch');
  const apiUrl = 'https://simplescraper.io/api/6pL6kpBjh8V4aI8aL6nA?apikey=6PXAmFZHivf3QX0ADfFV66ZQeKnrSE2C';
  const response = await fetch(apiUrl);
  const data = await response.json();
  const activeInstallsStr = data.data[0]['active installs'];
  const totalInstalls = parseInt(activeInstallsStr.split()[0], 10);

  // Write new cache
  const cache = {
    total_installs: totalInstalls,
    last_update: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  };
  fs.writeFileSync(INSTALLS_CACHE_FILE, JSON.stringify(cache, null, 2));

  return totalInstalls;
};

module.exports = GetPluginInstalls;
