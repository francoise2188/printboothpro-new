import './globals.css';
import { Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { Outfit, Playfair_Display } from 'next/font/google';

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
    <html lang="en" className={`h-full ${outfit.variable} ${playfair.variable}`}>
      <body className="h-full">
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--primary-green)',
              color: 'var(--text-light)',
              fontFamily: 'var(--font-primary)',
            },
          }}
        />
      </body>
    </html>
  );
}
