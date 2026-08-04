import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobsAdis — Prime Hospitality Business Group",
  description:
    "Find hospitality jobs in Addis Ababa — hotels, restaurants, cafes and more. Ethiopia's premium hospitality job marketplace.",
  keywords: "jobs Ethiopia, hospitality JobsAdis Ababa, hotel jobs, restaurant jobs Ethiopia",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0C1017",
};

import { CvUploadProvider } from "@/hooks/useCvUpload";
import { LocaleProvider } from "@/lib/i18n";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The blocking script below and the Telegram SDK both mutate <html> before
    // React hydrates — setting `lang`, `color-scheme`, and --tg-viewport-*. That
    // is the point (it avoids a flash of the wrong theme/language), but it makes
    // the client attributes diverge from the server-rendered ones. This suppresses
    // the resulting warning for this element's own attributes only; children are
    // still checked normally.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload the splash logo so it's in cache before the loading screen renders */}
        <link rel="preload" href="/logo.webp" as="image" />
        {/* Preload admin login logo */}
        <link rel="preload" href="/pbg_logo.webp" as="image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,600;1,700;1,800&family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Ethiopic:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="telegram:web-app" content="true" />
        {/* Load Telegram WebApp SDK — must be synchronous so it's available on init */}
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Apply the saved language before paint so Amharic doesn't flash English.
                var lang = localStorage.getItem('lang');
                document.documentElement.lang = (lang === 'am') ? 'am' : 'en';
              } catch (e) {}
              try {
                var saved = localStorage.getItem('theme');
                // New user: no preference saved yet — lock to light mode explicitly
                if (!saved) {
                  localStorage.setItem('theme', 'light');
                  saved = 'light';
                }
                var isDark = saved === 'dark';
                if (isDark) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                  document.documentElement.style.backgroundColor = '#0C1017';
                } else {
                  document.documentElement.removeAttribute('data-theme');
                  document.documentElement.style.colorScheme = 'light';
                  document.documentElement.style.backgroundColor = '#F7F8FA';
                }
                if (window.Telegram && window.Telegram.WebApp) {
                  var tg = window.Telegram.WebApp;
                  var bg = isDark ? '#0C1017' : '#F7F8FA';
                  var surface = isDark ? '#141924' : '#FFFFFF';
                  if (tg.setHeaderColor) tg.setHeaderColor(bg);
                  if (tg.setBackgroundColor) tg.setBackgroundColor(bg);
                  if (tg.setBottomBarColor) tg.setBottomBarColor(surface);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <LocaleProvider>
          <CvUploadProvider>
            {children}
          </CvUploadProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
