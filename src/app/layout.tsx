import type { Metadata } from "next";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Concertium — Project Management",
  description:
    "Track clients, project status, and send email status reports for your team.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // Apply the saved/system theme before paint to avoid a flash of light mode.
  const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {user ? <NavBar user={user} /> : null}
        <main className={user ? "mx-auto max-w-6xl px-4 py-8" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}
