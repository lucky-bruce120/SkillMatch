import OpenAI from 'openai';

let client = null;

/**
 * Lazily construct the OpenAI client.
 *
 * Previously the client was built at module import time, which meant a missing
 * OPENAI_API_KEY threw while the router was being loaded and took down the
 * entire Express app. Constructing on first use keeps the rest of the API
 * (auth, jobs, profiles, ...) working even when no AI key is configured, and
 * gives callers a clear error message only on the routes that need it.
 */
export const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Add it to backend/.env to enable AI features.');
  }

  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return client;
};
