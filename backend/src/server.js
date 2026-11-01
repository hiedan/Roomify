const config = require('./config');
const { createApp } = require('./app');

createApp().listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Roomify API listening on http://localhost:${config.port}`);
});
