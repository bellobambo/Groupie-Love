"use client";

import { useAccount, useReadContracts } from "wagmi";
import { useEffect, useState } from "react";
import { groupieContractABI, groupieContractAddress } from "../GroupieABI";
import { formatEther } from "viem";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";

interface Art {
  artist: string;
  title: string;
  artworkURI: string;
  musicURI: string;
  price: bigint;
}

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default function MyCollectibles() {
  const { address, chain } = useAccount();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ownedArts, setOwnedArts] = useState<
    { art: Art; artKey: string; ownedCount: number; tokenIds: bigint[] }[]
  >([]);
  const [transferData, setTransferData] = useState<{
    artKey?: string;
    toAddress?: string;
    amount?: number;
  }>({});

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

  // Step 2: For each token ID, get metadata
  const tokenArtResult = useReadContracts({
    contracts:
      tokenIds?.map((tokenId) => ({
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "tokenArt",
        args: [tokenId],
      })) ?? [],
  });

  // Refresh data function
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([tokenIdsResult.refetch(), tokenArtResult.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Step 3: Group by metadata content but keep track of token IDs
  useEffect(() => {
    if (tokenArtResult.data && tokenIds) {
      const grouped = new Map<
        string,
        { art: Art; ownedCount: number; tokenIds: bigint[] }
      >();

      tokenArtResult.data.forEach((res, index) => {
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
        const tokenId = tokenIds[index];

        if (!grouped.has(artKey)) {
          grouped.set(artKey, { art, ownedCount: 1, tokenIds: [tokenId] });
        } else {
          const existing = grouped.get(artKey)!;
          existing.ownedCount += 1;
          existing.tokenIds.push(tokenId);
        }
      });

      setOwnedArts(
        Array.from(grouped.values()).map((g) => ({
          ...g,
          artKey: g.art.title,
        }))
      );
    }
  }, [tokenArtResult.data, tokenIds]);

  // Prepare transfer transactions
  const transferCalls = (() => {
    if (!transferData.artKey || !transferData.toAddress || !transferData.amount)
      return [];

    const art = ownedArts.find((a) => a.artKey === transferData.artKey);
    if (
      !art ||
      transferData.amount <= 0 ||
      transferData.amount > art.tokenIds.length
    )
      return [];

    return art.tokenIds.slice(0, transferData.amount).map((tokenId) => ({
      address: groupieContractAddress,
      abi: groupieContractABI,
      functionName: "transferFrom",
      args: [address, transferData.toAddress, tokenId],
    }));
  })();

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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Collectibles</h2>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {isRefreshing && (
        <div className="text-center py-4">Loading your collectibles...</div>
      )}

      {!isRefreshing &&
        ownedArts.map(({ art, ownedCount, tokenIds, artKey }, i) => {
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
                    disabled={isRefreshing}
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
                    disabled={isRefreshing}
                  >
                    Download Music
                  </button>
                </>
              )}

              <p>Price: {formatEther(art.price)} ETH</p>
              <p className="font-medium text-green-600">
                You own {ownedCount} {ownedCount > 1 ? "copies" : "copy"}
              </p>

              {ownedCount > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Transfer Ownership</h4>

                  {ownedCount > 1 && (
                    <div className="mb-2">
                      <label className="block text-sm mb-1">
                        Copies to transfer:
                      </label>
                      <select
                        value={
                          transferData.artKey === artKey
                            ? transferData.amount || 1
                            : 1
                        }
                        onChange={(e) =>
                          setTransferData({
                            artKey,
                            toAddress: transferData.toAddress,
                            amount: parseInt(e.target.value),
                          })
                        }
                        className="w-full p-2 border rounded"
                        disabled={isRefreshing}
                      >
                        {Array.from({ length: ownedCount }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} copy{i + 1 > 1 ? "ies" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    className="w-full p-2 border rounded"
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        artKey,
                        toAddress: e.target.value,
                      })
                    }
                    value={
                      transferData.artKey === artKey
                        ? transferData.toAddress || ""
                        : ""
                    }
                    disabled={isRefreshing}
                  />

                  <Transaction
                    chainId={BASE_SEPOLIA_CHAIN_ID}
                    calls={transferCalls}
                    onSuccess={() => {
                      alert(
                        `Successfully transferred ${transferData.amount} copy/copies!`
                      );
                      setTransferData({});
                      refreshData();
                    }}
                    onError={() => refreshData()}
                  >
                    <TransactionButton
                      text={`Transfer ${
                        transferData.artKey === artKey
                          ? transferData.amount || 1
                          : 1
                      } copy${
                        transferData.artKey === artKey &&
                        (transferData.amount || 1) > 1
                          ? "ies"
                          : ""
                      }`}
                      className="  mt-2 w-full "
                      disabled={isRefreshing}
                    />
                    <TransactionStatus className="mt-2">
                      <TransactionStatusLabel />
                      <TransactionStatusAction />
                    </TransactionStatus>
                  </Transaction>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

function isValidAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
