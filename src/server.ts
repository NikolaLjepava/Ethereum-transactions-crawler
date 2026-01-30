import dotenv from 'dotenv';

dotenv.config();

console.log('Environment loaded, API key exists?', !!process.env.ALCHEMY_API_KEY);

import './app';