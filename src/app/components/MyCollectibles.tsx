"use client";

import { useAccount, useReadContracts } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { groupieContractABI, groupieContractAddress } from "../GroupieABI";
import { formatEther } from "viem";

interface Art {
  artist: string;
  title: string;
  artworkURI: string;
  musicURI: string;
  price: bigint;
}

export default function MyCollectibles() {
  const { address } = useAccount();
  const [ownedArts, setOwnedArts] = useState<
    { art: Art; artKey: string; ownedCount: number }[]
  >([]);

  // Step 1: Get token IDs
  const tokenIdsResult = useReadContracts({
    contracts: address
      ? [
          {
            address: groupieContractAddress,
            abi: groupieContractABI,
            functionName: "getFanTokens",
            args: [address],
          },
        ]
      : [],
  });

  const tokenIds = tokenIdsResult.data?.[0]?.result as bigint[] | undefined;

  // Step 2: For each token ID, get metadata directly from tokenArt()
  const tokenArtResult = useReadContracts({
    contracts:
      tokenIds?.map((tokenId) => ({
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "tokenArt",
        args: [tokenId],
      })) ?? [],
  });

  // Step 3: Group by metadata content (no need for artId anymore)
  useEffect(() => {
    if (tokenArtResult.data) {
      const grouped = new Map<string, { art: Art; ownedCount: number }>();

      tokenArtResult.data.forEach((res) => {
        const result = res.result as any;
        if (!result || result.length < 5) return;

        const art: Art = {
          artist: result[0],
          title: result[1],
          artworkURI: result[2],
          musicURI: result[3],
          price: BigInt(result[4]),
        };

        const artKey = `${art.title}|${art.artworkURI}|${art.musicURI}|${art.price}`;

        if (!grouped.has(artKey)) {
          grouped.set(artKey, { art, ownedCount: 1 });
        } else {
          grouped.get(artKey)!.ownedCount += 1;
        }
      });

      setOwnedArts(
        Array.from(grouped.values()).map((g) => ({ ...g, artKey: g.art.title }))
      );
    }
  }, [tokenArtResult.data]);

  function downloadFile(url: string, filename: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <h2 className="text-2xl font-bold">My Collectibles</h2>

      {ownedArts.map(({ art, ownedCount }, i) => {
        const artworkSrc = art.artworkURI?.startsWith("ipfs://")
          ? art.artworkURI.replace("ipfs://", "https://ipfs.io/ipfs/")
          : art.artworkURI || null;

        const musicSrc = art.musicURI?.startsWith("ipfs://")
          ? art.musicURI.replace("ipfs://", "https://ipfs.io/ipfs/")
          : art.musicURI || null;

        return (
          <div key={i} className="p-6 border rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">{art.title}</h3>
            <p className="text-sm text-gray-500 mb-3">
              Artist: <code>{art.artist}</code>
            </p>

            {artworkSrc && (
              <>
                <img
                  src={artworkSrc}
                  alt={art.title}
                  className="w-full h-60 object-cover mb-2 rounded"
                />
                <button
                  onClick={() =>
                    downloadFile(
                      artworkSrc,
                      `${art.title.replace(/\s+/g, "_")}_artwork.jpg`
                    )
                  }
                  className="btn-download"
                >
                  Download Artwork
                </button>
              </>
            )}

            {musicSrc && (
              <>
                <audio src={musicSrc} controls className="mb-2" />
                <button
                  onClick={() =>
                    downloadFile(
                      musicSrc,
                      `${art.title.replace(/\s+/g, "_")}_music.mp3`
                    )
                  }
                  className="btn-download"
                >
                  Download Music
                </button>
              </>
            )}

            <p>Price: {formatEther(art.price)} ETH</p>
            <p className="font-medium text-green-600">
              You own {ownedCount} {ownedCount > 1 ? "copies" : "copy"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
