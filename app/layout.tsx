import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Idanu - Report & Find Missing Persons and Items',
  description:
    'A community-driven platform to report missing children, vehicles, and items. Help your neighbors stay safe by reporting sightings and keeping watch together.',
  generator: 'Idanu',
  icons: {
    icon: [
      {
        url: '/idanu-icon.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/idanu-icon.svg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/idanu-icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
