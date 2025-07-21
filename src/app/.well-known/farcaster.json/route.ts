import dotenv from "dotenv";
dotenv.config();

function withValidProperties(
  properties: Record<string, undefined | string | string[]>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    })
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL;

  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: withValidProperties({
      version: "1",
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      screenshotUrls: [
        "https://aqua-junior-bobolink-189.mypinata.cloud/ipfs/bafybeigs7hccbnp7yuoy2osl5iecu3k4gtjzmq43v5d76ozehk2h7yuipm",
      ],
      iconUrl:
        "https://aqua-junior-bobolink-189.mypinata.cloud/ipfs/bafybeidqul6eombbz5hx2xv7qpbkfkujf7oaas5kwjpujckjkpijb2fxuy",
      splashImageUrl:
        "https://aqua-junior-bobolink-189.mypinata.cloud/ipfs/bafybeidqul6eombbz5hx2xv7qpbkfkujf7oaas5kwjpujckjkpijb2fxuy",
      splashBackgroundColor: "#0066FF",
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tags: [],
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
    }),
  });
}
