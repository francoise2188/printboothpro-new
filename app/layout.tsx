import './globals.css';
import { Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { Outfit, Playfair_Display } from 'next/font/google';
import NavigationWrapper from './components/NavigationWrapper';

const outfit = Outfit({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata = {
  title: 'Photo Booth',
  description: 'Virtual Photo Booth Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable}`}>
      <body>
        <NavigationWrapper />
        {children}
        <Toaster position="bottom-center" />
        <Analytics />
      </body>
    </html>
  );
}
