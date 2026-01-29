import { Outfit, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ChatBot from '@/components/ChatBot';
import { CartProvider } from '@/context/CartContext';
import { PersonalizeProvider } from '@/context/PersonalizeContext';
import { ProfileProvider } from '@/context/ProfileContext';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata = {
  title: 'AniVerse | Discover Your Next Anime',
  description: 'Explore the best anime collection powered by Contentstack',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <PersonalizeProvider>
          <ProfileProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
              <ChatBot />
            </CartProvider>
          </ProfileProvider>
        </PersonalizeProvider>
      </body>
    </html>
  );
}

