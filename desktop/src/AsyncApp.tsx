import React, { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import App from './App';
import { initializeDatabase } from './lib/database'

const AsyncApp: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize PostHog
		const viteApiKey = import.meta.env.VITE_POSTHOST_SECRET
        posthog.init(viteApiKey, {
          api_host: 'https://app.posthog.com'
        });

        // Initialize database
        await initializeDatabase();

        // Any other async initializations...

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    // Show a loading state while initializing
    return <div>Loading...</div>;
  }

  return <App />;
};

export default AsyncApp;
