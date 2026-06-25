import './globals.css';

export const metadata = {
  title: 'TrailerFlow Pro',
  description: 'Internal intercompany trailer movement and yard management portal for Hopewell/RNF.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
