import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
const { server } = createApp(config);
server.listen(config.port, config.host, () => {
  console.log(`NEPTUNE on http://${config.host}:${config.port}  (tz ${config.timezone}, claude ${config.claudeEnabled ? 'on' : 'off'})`);
});
