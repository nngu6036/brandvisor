import "./globals.css";
import Providers from "./providers";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "BrandVisor",
  description: "AI-powered marketing consultant"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
