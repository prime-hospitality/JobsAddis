import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prime Hospitality — Jobs in Addis Ababa",
  description:
    "Find hospitality jobs in Addis Ababa — hotels, restaurants, cafes and more. Ethiopia's premium hospitality job marketplace.",
  keywords: "jobs Ethiopia, hospitality jobs Addis Ababa, hotel jobs, restaurant jobs Ethiopia",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A0F1E",
};

import { CvUploadProvider } from "@/hooks/useCvUpload";
import { GlobalFetchInterceptor } from "@/components/GlobalFetchInterceptor";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="telegram:web-app" content="true" />
        {/* Load Telegram WebApp SDK — must be synchronous so it's available on init */}
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
                  document.documentElement.style.backgroundColor = '#121212';
                } else {
                  document.documentElement.removeAttribute('data-theme');
                  document.documentElement.style.colorScheme = 'light';
                  document.documentElement.style.backgroundColor = '#F9FAFB';
                }
                if (window.Telegram && window.Telegram.WebApp) {
                  var tg = window.Telegram.WebApp;
                  var bg = isDark ? '#121212' : '#F9FAFB';
                  var surface = isDark ? '#1A1A1A' : '#FFFFFF';
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
        <GlobalFetchInterceptor />
        <CvUploadProvider>
          {children}
        </CvUploadProvider>
      </body>
    </html>
  );
}
