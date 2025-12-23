import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="glass mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-aurora to-stardust flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="font-display text-2xl font-bold gradient-text">
                AniVerse
              </span>
            </Link>
            <p className="text-gray-400 max-w-md">
              Your ultimate destination for discovering and exploring the best anime. 
              Powered by Contentstack headless CMS.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/anime" className="text-gray-400 hover:text-aurora transition-colors">
                  Browse Anime
                </Link>
              </li>
              <li>
                <Link href="/genres" className="text-gray-400 hover:text-aurora transition-colors">
                  Genres
                </Link>
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="font-display font-semibold text-white mb-4">Built With</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Next.js 14</li>
              <li>Contentstack CMS</li>
              <li>Tailwind CSS</li>
              <li>Jikan API</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-500">
          <p>© {new Date().getFullYear()} AniVerse. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

