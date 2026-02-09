import Contentstack from 'contentstack';

// Build SDK config
const config = {
  api_key: process.env.CONTENTSTACK_API_KEY,
  delivery_token: process.env.CONTENTSTACK_DELIVERY_TOKEN,
  environment: process.env.CONTENTSTACK_ENVIRONMENT || 'production',
};

// Determine the CDN host
// Priority: CONTENTSTACK_HOST > CONTENTSTACK_CDN > region-based default
const customHost = process.env.CONTENTSTACK_HOST || process.env.CONTENTSTACK_CDN;

if (!customHost) {
  // Standard deployment - use region
  if (process.env.CONTENTSTACK_REGION === 'EU') {
    config.region = Contentstack.Region.EU;
  } else {
    config.region = Contentstack.Region.US;
  }
}

console.log('Contentstack SDK init:', {
  api_key: config.api_key ? `${config.api_key.substring(0, 8)}...` : 'MISSING',
  delivery_token: config.delivery_token ? `${config.delivery_token.substring(0, 8)}...` : 'MISSING',
  environment: config.environment,
  customHost: customHost || 'none (using region default)',
  region: config.region ? 'set' : 'not set',
});

const Stack = Contentstack.Stack(config);

// For custom hosts (non-prod, Launch CDN override), set AFTER Stack creation
if (customHost) {
  // Strip protocol and /v3 path if present (SDK only wants the hostname)
  const hostOnly = customHost
    .replace(/^https?:\/\//, '')
    .replace(/\/v3\/?$/, '')
    .replace(/\/$/, '');
  Stack.setHost(hostOnly);
  console.log('Contentstack SDK: custom host set to', hostOnly);
}

export default Stack;

