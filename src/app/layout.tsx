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

  return (
    <html lang="en">
      <body>
        {user ? <NavBar user={user} /> : null}
        <main className={user ? "mx-auto max-w-6xl px-4 py-8" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}
