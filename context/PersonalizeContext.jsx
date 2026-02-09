'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PersonalizeContext = createContext(null);

// We'll dynamically import the SDK to avoid SSR issues
let PersonalizeSDK = null;

export function PersonalizeProvider({ children }) {
  const [sdk, setSdk] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize the Personalize SDK
  useEffect(() => {
    async function initPersonalize() {
      const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
      
      if (!projectUid || projectUid === 'your_personalize_project_uid_here') {
        console.warn('Personalize: Project UID not configured. Skipping initialization.');
        setIsLoading(false);
        return;
      }

      try {
        // Dynamically import the SDK
        const module = await import('@contentstack/personalize-edge-sdk');
        PersonalizeSDK = module.default;

        // Set custom edge API URL if provided (required for non-default regions)
        const edgeApiUrl = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL;
        if (edgeApiUrl) {
          PersonalizeSDK.setEdgeApiUrl(edgeApiUrl);
        } else {
          // Default to AWS NA edge API
          PersonalizeSDK.setEdgeApiUrl('https://personalize-edge.contentstack.com');
        }

        // Check if already initialized
        if (!PersonalizeSDK.getInitializationStatus()) {
          const sdkInstance = await PersonalizeSDK.init(projectUid);
          setSdk(sdkInstance);
          setIsInitialized(true);
          console.log('Personalize SDK initialized successfully');
        } else {
          // SDK already initialized, get the existing instance
          setSdk(PersonalizeSDK);
          setIsInitialized(true);
        }
      } catch (err) {
        // Personalize failed - log but don't crash the app
        // Profile switching still works via local filtering without Personalize
        console.warn('Personalize SDK not available:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    initPersonalize();
  }, []);

  /**
   * Set user attributes for personalization
   * @param {Object} attributes - Key-value pairs of attributes
   */
  const setAttributes = useCallback(async (attributes) => {
    if (!sdk) {
      console.warn('Personalize SDK not initialized. Attributes not set.');
      return false;
    }

    try {
      await sdk.set(attributes);
      console.log('Personalize: Attributes set:', attributes);
      return true;
    } catch (err) {
      console.error('Failed to set attributes:', err);
      return false;
    }
  }, [sdk]);

  /**
   * Trigger an impression event for analytics
   * @param {string} experienceShortUid - The experience short UID
   */
  const triggerImpression = useCallback(async (experienceShortUid) => {
    if (!sdk) {
      console.warn('Personalize SDK not initialized. Impression not triggered.');
      return false;
    }

    try {
      await sdk.triggerImpression(experienceShortUid);
      console.log('Personalize: Impression triggered for:', experienceShortUid);
      return true;
    } catch (err) {
      console.error('Failed to trigger impression:', err);
      return false;
    }
  }, [sdk]);

  /**
   * Trigger a conversion/custom event
   * @param {string} eventKey - The event key defined in Personalize
   */
  const triggerEvent = useCallback(async (eventKey) => {
    if (!sdk) {
      console.warn('Personalize SDK not initialized. Event not triggered.');
      return false;
    }

    try {
      await sdk.triggerEvent(eventKey);
      console.log('Personalize: Event triggered:', eventKey);
      return true;
    } catch (err) {
      console.error('Failed to trigger event:', err);
      return false;
    }
  }, [sdk]);

  /**
   * Get variant aliases from variant parameter
   * @param {string} variantParam - The variant parameter from URL
   * @returns {string[]} Array of variant aliases
   */
  const getVariantAliases = useCallback((variantParam) => {
    if (!PersonalizeSDK || !variantParam) return [];
    
    try {
      return PersonalizeSDK.variantParamToVariantAliases(variantParam);
    } catch (err) {
      console.error('Failed to parse variant param:', err);
      return [];
    }
  }, []);

  const value = {
    sdk,
    isInitialized,
    isLoading,
    error,
    setAttributes,
    triggerImpression,
    triggerEvent,
    getVariantAliases,
    // Expose the SDK class for static methods
    PersonalizeSDK,
  };

  return (
    <PersonalizeContext.Provider value={value}>
      {children}
    </PersonalizeContext.Provider>
  );
}

export function usePersonalize() {
  const context = useContext(PersonalizeContext);
  if (!context) {
    throw new Error('usePersonalize must be used within a PersonalizeProvider');
  }
  return context;
}
