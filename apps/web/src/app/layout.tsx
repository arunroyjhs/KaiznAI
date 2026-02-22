import type { Metadata } from 'next';
import { Sidebar } from '../components/sidebar';
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
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-sidebar">
            <div className="max-w-content mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
