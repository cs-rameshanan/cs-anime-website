'use client';

import { useProfile } from '@/context/ProfileContext';
import { usePersonalize } from '@/context/PersonalizeContext';
import { PROFILE_TYPES } from '@/lib/profileConfig';

export default function ProfileSwitcher() {
  const { profileType, switchProfile, isLoading, isSyncing } = useProfile();
  const { isInitialized: personalizeReady } = usePersonalize();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-8 bg-gray-700 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 hidden sm:inline">Profile:</span>
      <div className="flex rounded-full bg-gray-800 p-1 relative">
        <button
          onClick={() => switchProfile(PROFILE_TYPES.KIDS)}
          disabled={isSyncing}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            profileType === PROFILE_TYPES.KIDS
              ? 'bg-pink-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          } ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}
        >
          Kids
        </button>
        <button
          onClick={() => switchProfile(PROFILE_TYPES.NORMAL)}
          disabled={isSyncing}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            profileType === PROFILE_TYPES.NORMAL
              ? 'bg-purple-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          } ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}
        >
          Normal
        </button>
        
        {/* Sync indicator */}
        {isSyncing && (
          <div className="absolute -top-1 -right-1 w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
        )}
      </div>
      
      {/* Personalize connection status */}
      {personalizeReady && (
        <div className="hidden lg:flex items-center gap-1" title="Connected to Contentstack Personalize">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        </div>
      )}
    </div>
  );
}
