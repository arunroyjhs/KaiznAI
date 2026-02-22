import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Outcome Runtime',
  description: 'The infrastructure layer for outcome-driven experimentation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
