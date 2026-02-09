import Contentstack from 'contentstack';

// Build SDK config
const config = {
  api_key: process.env.CONTENTSTACK_API_KEY,
  delivery_token: process.env.CONTENTSTACK_DELIVERY_TOKEN,
  environment: process.env.CONTENTSTACK_ENVIRONMENT || 'production',
};

// Set region for standard deployments
if (!process.env.CONTENTSTACK_HOST) {
  if (process.env.CONTENTSTACK_REGION === 'EU') {
    config.region = Contentstack.Region.EU;
  } else {
    config.region = Contentstack.Region.US;
  }
}

const Stack = Contentstack.Stack(config);

// For custom hosts (dev22, non-prod), override AFTER Stack creation
if (process.env.CONTENTSTACK_HOST) {
  Stack.setHost(process.env.CONTENTSTACK_HOST);
  console.log('Contentstack SDK: custom host set to', process.env.CONTENTSTACK_HOST);
}

export default Stack;

