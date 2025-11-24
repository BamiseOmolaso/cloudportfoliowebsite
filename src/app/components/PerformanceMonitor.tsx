'use client';

import { useEffect } from 'react';

export function PerformanceMonitor() {
  useEffect(() => {
    // Track LCP
    const trackLCP = async () => {
      try {
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lastEntry = lcpEntries[lcpEntries.length - 1];

        if (lastEntry) {
          const response = await fetch('/api/performance/lcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              value: lastEntry.startTime,
              url: window.location.href,
            }),
          });

          if (!response.ok) throw new Error('Failed to track LCP');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to track LCP metric';
        console.error('Error tracking LCP:', errorMessage);
      }
    };

    // Track other performance metrics
    const trackPerformance = async () => {
      try {
        const metrics = {
          fcp: performance
            .getEntriesByType('paint')
            .find(entry => entry.name === 'first-contentful-paint')?.startTime,
          ttfb: performance.timing.responseStart - performance.timing.requestStart,
          domContentLoaded:
            performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          load: performance.timing.loadEventEnd - performance.timing.navigationStart,
        };

        const response = await fetch('/api/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metrics),
        });

        if (!response.ok) throw new Error('Failed to track performance');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to track performance metrics';
        console.error('Error tracking performance:', errorMessage);
      }
    };

    // Set up observers
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          trackLCP();
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    // Track initial performance metrics
    if (document.readyState === 'complete') {
      trackPerformance();
    } else {
      window.addEventListener('load', trackPerformance);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('load', trackPerformance);
    };
  }, []);

  return null;
}
