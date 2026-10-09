import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import './globals.css';

const origin = 'https://starapp-world-stage.bold-crab-5018.chatgpt.site';
export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: 'StarApp — The world stage for every talent',
  description: 'Your talent deserves a stage. Meet StarApp: a new home to showcase your creativity, connect with your community, and discover opportunities. Join the early-access list.',
  applicationName: 'StarApp',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', title: 'StarApp — Your talent. A world of possibility.',
    description: 'Create. Connect. Grow. Be part of a new stage for every talent.',
    url: origin, siteName: 'StarApp',
    images: [{ url: '/assets/cover-world-stage-1400.webp', width: 1400, height: 521, alt: 'StarApp — The world stage for every talent' }],
  },
  twitter: { card: 'summary_large_image', title: 'StarApp — The world stage for every talent', images: ['/assets/cover-world-stage-1400.webp'] },
  icons: { icon: '/favicon.svg', apple: '/assets/brand-cobalt.webp' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
