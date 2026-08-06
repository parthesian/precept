import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Precept",
  description: "Community-curated graph of cinematic influence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div id="precept-root">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
