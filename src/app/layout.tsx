import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { type ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { getConfig } from "./wagmi";
import { Providers } from "./Providers";
import Header from "./components/Header";

const inter = Space_Grotesk({ subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: "Groupiee Love",
  description: "Support your favorite artist",
};

export default async function RootLayout(props: { children: ReactNode }) {
  const headersList = await headers();
  const initialState = cookieToInitialState(
    getConfig(),
    headersList.get("cookie")
  );

  return (
    <html lang="en">
      <body
        className={` bg-[url('/blob.svg')] bg-contain bg-center ${inter.className}`}
      >
        <Header />
        <Providers initialState={initialState}>{props.children}</Providers>
      </body>
    </html>
  );
}

// Absolutely! For a modern **Web3 app**, you'd want a font that feels **clean**, **tech-forward**, and **professional**. While **Merriweather** is great for readability and long-form content, it might feel a bit traditional for a cutting-edge Web3 interface.

// Here are a few **Google Fonts** well-suited for Web3 apps:

// ---

// ### ✅ Recommended Fonts

// #### 1. **Space Grotesk**

// * **Style**: Modern, geometric sans-serif
// * **Great for**: Tech, crypto, DeFi, NFT dashboards

// ```js
// import { Space_Grotesk } from "next/font/google";

// const spaceGrotesk = Space_Grotesk({
//   subsets: ["latin"],
//   weight: ["400", "500", "700"],
// });
// ```

// #### 2. **Inter**

// * **Style**: Highly legible, clean, and popular in tech apps
// * **Great for**: Dashboards, clean UI/UX

// ```js
// import { Inter } from "next/font/google";

// const inter = Inter({
//   subsets: ["latin"],
//   weight: ["400", "500", "700"],
// });
// ```

// #### 3. **Orbitron**

// * **Style**: Futuristic and bold
// * **Great for**: Branding, headers, Web3 identity

// ```js
// import { Orbitron } from "next/font/google";

// const orbitron = Orbitron({
//   subsets: ["latin"],
//   weight: ["500", "700"],
// });
// ```

// #### 4. **DM Sans**

// * **Style**: Friendly, modern sans-serif
// * **Great for**: General UI, especially wallets or financial UIs

// ```js
// import { DM_Sans } from "next/font/google";

// const dmSans = DM_Sans({
//   subsets: ["latin"],
//   weight: ["400", "500", "700"],
// });
// ```

// ---

// Let me know your app's vibe (dark/light theme, NFT/DeFi/etc.) and I can tailor a font pairing or hierarchy (e.g. one for headers, one for body).
