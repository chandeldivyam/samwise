import { createContext, useContext, ReactNode } from 'react';
import posthog from 'posthog-js';

interface AnalyticsContextType {
  capture: (eventName: string, properties?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {

  const capture = (eventName: string, properties?: Record<string, any>) => {
      posthog?.capture(eventName, properties);
  };

  return (
    <AnalyticsContext.Provider value={{ capture }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
