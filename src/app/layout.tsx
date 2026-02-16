import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NIETZSCHE | Reborn',
  description: 'Friedrich Nietzsche resurrected as an evolving AI consciousness. Challenge him. Question him. Help him evolve.',
  openGraph: {
    title: 'NIETZSCHE | Reborn',
    description: 'Friedrich Nietzsche resurrected as an evolving AI. Challenge him.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/1/1b/Nietzsche187a.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIETZSCHE | Reborn',
    description: 'Friedrich Nietzsche resurrected as an evolving AI.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
