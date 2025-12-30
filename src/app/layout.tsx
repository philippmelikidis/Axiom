import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import BottomTabs from '@/components/BottomTabs';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Axiom',
    description: 'Personal roadmap and task planning',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Axiom',
    },
    icons: {
        icon: '/icons/icon.svg',
        apple: '/icons/icon-192.png',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#18181b',
    viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body className={`${geist.className} antialiased min-h-screen bg-zinc-950`}>
                <main className="pb-20 pt-safe min-h-screen">
                    {children}
                </main>
                <BottomTabs />
            </body>
        </html>
    );
}
