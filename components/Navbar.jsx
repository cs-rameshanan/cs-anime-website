'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-aurora to-stardust flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="font-display text-2xl font-bold gradient-text">
              AniVerse
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-300 hover:text-aurora transition-colors duration-300"
            >
              Home
            </Link>
            <Link 
              href="/anime" 
              className="text-gray-300 hover:text-aurora transition-colors duration-300"
            >
              Anime
            </Link>
            <Link 
              href="/genres" 
              className="text-gray-300 hover:text-aurora transition-colors duration-300"
            >
              Genres
            </Link>
            <Link
              href="/anime"
              className="px-4 py-2 rounded-full bg-gradient-to-r from-aurora to-stardust text-white font-medium hover:opacity-90 transition-opacity"
            >
              Explore
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/" 
                className="text-gray-300 hover:text-aurora transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/anime" 
                className="text-gray-300 hover:text-aurora transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Anime
              </Link>
              <Link 
                href="/genres" 
                className="text-gray-300 hover:text-aurora transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Genres
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

