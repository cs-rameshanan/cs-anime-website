'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PROFILE_TYPES, PROFILE_CONFIG } from '@/lib/profileConfig';
import { usePersonalize } from '@/context/PersonalizeContext';

const ProfileContext = createContext(null);

const PROFILE_STORAGE_KEY = 'user_profile_type';

export function ProfileProvider({ children }) {
  const [profileType, setProfileType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Get Personalize SDK functions
  const { setAttributes, isInitialized: personalizeReady, triggerEvent } = usePersonalize();

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (savedProfile && PROFILE_CONFIG[savedProfile]) {
      setProfileType(savedProfile);
    } else {
      // Default to normal if no profile set
      setProfileType(PROFILE_TYPES.NORMAL);
    }
    setIsLoading(false);
  }, []);

  // Sync profile with Personalize when SDK is ready
  useEffect(() => {
    if (personalizeReady && profileType) {
      syncProfileWithPersonalize(profileType);
    }
  }, [personalizeReady, profileType]);

  // Sync profile type with Contentstack Personalize
  const syncProfileWithPersonalize = useCallback(async (profile) => {
    if (!setAttributes) return;
    
    setIsSyncing(true);
    try {
      // Set the profile_type attribute in Personalize
      await setAttributes({ 
        profile_type: profile,
        is_kids_mode: profile === PROFILE_TYPES.KIDS,
      });
      console.log('Profile synced with Personalize:', profile);
    } catch (err) {
      console.error('Failed to sync profile with Personalize:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [setAttributes]);

  // Switch profile and persist to localStorage + Personalize
  const switchProfile = useCallback(async (newProfileType) => {
    if (!PROFILE_CONFIG[newProfileType]) return;
    
    setProfileType(newProfileType);
    localStorage.setItem(PROFILE_STORAGE_KEY, newProfileType);
    
    // Sync with Contentstack Personalize
    await syncProfileWithPersonalize(newProfileType);
    
    // Trigger a profile switch event for analytics
    if (triggerEvent) {
      await triggerEvent('profile_switched');
    }
  }, [syncProfileWithPersonalize, triggerEvent]);

  // Get current profile configuration
  const getProfileConfig = useCallback(() => {
    return PROFILE_CONFIG[profileType] || PROFILE_CONFIG[PROFILE_TYPES.NORMAL];
  }, [profileType]);

  const value = {
    profileType,
    switchProfile,
    getProfileConfig,
    isLoading,
    isSyncing,
    isKidsProfile: profileType === PROFILE_TYPES.KIDS,
    isNormalProfile: profileType === PROFILE_TYPES.NORMAL,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
