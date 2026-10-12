import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TeesTale — apparel, on your terms",
    template: "%s — TeesTale",
  },
  description: "Shop wholesale blanks, retail polos, custom mesh, and apparel accessories at TeesTale.",
};

const designContract = [
  "THESIS: TeesTale is an editorial apparel sourcebook, not a wall of transactional boxes.",
  "OWN-WORLD: Pearl white, quiet ink, hairline rules, tall fashion imagery, and restrained collection labels.",
  "STORY: Visitors enter through the collection story, browse four apparel categories, then configure selected pieces.",
  "FIRST VIEWPORT: Minimal navigation over a twelve-column editorial hero with one dominant collection panel and two compact category panels.",
  "FORM: Figma Template B hero with Template A borderless portrait product cards; admin-uploaded catalog photos lead, with neutral photo-pending states until images are supplied.",
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <template dangerouslySetInnerHTML={{ __html: `<!-- ${designContract} -->` }} />
        <CartProvider>
          <SiteHeader />
          {children}
          <footer className="site-footer">
            <Link aria-label="TeesTale home" className="wordmark footer-wordmark" href="/">
              tees<span>tale</span><i aria-hidden="true">.</i>
            </Link>
            <p>One shop. Four ways to find your next piece.</p>
            <span className="footer-coordinates">TT / SHOP FLOOR</span>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
