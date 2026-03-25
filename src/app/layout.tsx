import "./globals.css";
import BottomNav from "../components/BottomNav";
import { AppProviders } from "../components/providers/AppProviders";

export const metadata = {
  title: "Annie's Closet Hub",
  description: "Your space to thrift, sell, and shine. Not just my closet, yours too.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen thrifts-bg">
        <AppProviders>
          <div className="min-h-screen pb-16 md:pb-0">
            {children}
            <BottomNav />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
