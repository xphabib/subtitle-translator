import './globals.css';

export const metadata = {
  title: 'SubTranslate — AI Subtitle Translator',
  description: 'Translate SRT subtitle files from English to Bengali using AI. Fast, accurate, and privacy-focused.',
  keywords: 'subtitle translator, SRT, Bengali, AI translation, movie subtitles',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
