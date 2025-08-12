require('dotenv').config();
const { execSync } = require('child_process');

const envVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
  'NODE_ENV',
  'DATABASE_URL'
];

function syncEnvToRender() {
  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value) {
      try {
        execSync(`render env set ${envVar}="${value}"`, { stdio: 'inherit' });
        console.log(`Successfully set ${envVar}`);
      } catch (error) {
        console.error(`Failed to set ${envVar}:`, error);
      }
    } else {
      console.warn(`Warning: ${envVar} not found in .env file`);
    }
  }
}

syncEnvToRender();
