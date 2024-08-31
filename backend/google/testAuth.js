const { authorize } = require('./googleAuth');

(async () => {
  await authorize();
  console.log('Authorization complete');
})();
