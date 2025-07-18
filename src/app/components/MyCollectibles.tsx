"use client";

import { useAccount, useReadContracts } from "wagmi";
import { useEffect, useState, useCallback } from "react";
import { groupieContractABI, groupieContractAddress } from "../GroupieABI";
import { formatEther, isAddress } from "viem";

import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
  TransactionSponsor,
} from "@coinbase/onchainkit/transaction";

interface Art {
  title: string;
  artistName: string;
  artistWallet: string;
  mediaUrl: string;
  previewImage: string;
  priceInWei: bigint;
  totalMinted: bigint;
  maxSupply: bigint;
}

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default function MyCollectibles() {
  const { address } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ownedArts, setOwnedArts] = useState<
    { art: Art; artId: bigint; ownedCount: number }[]
  >([]);
  const [transferInputs, setTransferInputs] = useState<{
    [artId: string]: { toAddress: string; amount: string };
  }>({});

  const artCountResult = useReadContracts({
    contracts: [
      {
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "getArtCount",
      },
    ],
  });

  const artCount = artCountResult.data?.[0]?.result as bigint | undefined;

  const balanceResults = useReadContracts({
    contracts: artCount
      ? Array.from({ length: Number(artCount) }, (_, i) => ({
          address: groupieContractAddress,
          abi: groupieContractABI,
          functionName: "balanceOf",
          args: [address, i],
        }))
      : [],
  });

  const artDetailsResults = useReadContracts({
    contracts: balanceResults.data
      ? balanceResults.data
          .map((res, i) => ({
            hasBalance: (res.result as bigint) > 0n,
            artId: i,
          }))
          .filter(({ hasBalance }) => hasBalance)
          .map(({ artId }) => ({
            address: groupieContractAddress,
            abi: groupieContractABI,
            functionName: "getArt",
            args: [artId],
          }))
      : [],
  });

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        artCountResult.refetch(),
        balanceResults.refetch(),
        artDetailsResults.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (artDetailsResults.data && balanceResults.data && artCount) {
      const artsWithBalance = balanceResults.data
        .map((res, i) => ({
          balance: res.result as bigint,
          artId: BigInt(i),
        }))
        .filter(({ balance }) => balance > 0n);

      const owned = artDetailsResults.data.map((res, i) => {
        const artData = res.result as any;
        return {
          art: {
            title: artData[0],
            artistName: artData[1],
            artistWallet: artData[2],
            mediaUrl: artData[3],
            previewImage: artData[4],
            priceInWei: BigInt(artData[5]),
            totalMinted: BigInt(artData[6]),
            maxSupply: BigInt(artData[7]),
          },
          artId: artsWithBalance[i].artId,
          ownedCount: Number(artsWithBalance[i].balance),
        };
      });

      setOwnedArts(owned);
    }
  }, [artDetailsResults.data, balanceResults.data, artCount]);

  const handleOnStatus = useCallback((status: any) => {
    console.log("Transaction status:", status);
  }, []);

  const handleInputChange = (
    artId: bigint,
    field: "toAddress" | "amount",
    value: string
  ) => {
    setTransferInputs((prev) => ({
      ...prev,
      [artId.toString()]: {
        ...prev[artId.toString()],
        [field]: value,
      },
    }));
  };

  function downloadFile(url: string, filename: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="py-10 space-y-8 w-full px-4 sm:px-6 max-w-screen-lg mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#007FFF] ">
          My Collectibles
        </h2>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="px-4 py-2 bg-[#007FFF] text-white rounded hover:bg-[#0066cc] disabled:bg-[#A0C4FF] flex items-center gap-2"
        >
          {isRefreshing ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <>Refresh</>
          )}
        </button>
      </div>

      {isRefreshing ? (
        <div className="text-center py-4 text-gray-600">
          Loading your collectibles...
        </div>
      ) : ownedArts.length === 0 ? (
        <div className="text-center py-10 space-y-4">
          <h3 className="text-lg font-medium text-[#007FFF]">
            No collectibles yet
          </h3>
          <p className="text-gray-500">Mint an NFT to start your collection</p>
        </div>
      ) : (
        ownedArts.map(({ art, ownedCount, artId }) => {
          const inputs = transferInputs[artId.toString()] || {
            toAddress: "",
            amount: "",
          };

          const isAddressValid = isAddress(inputs.toAddress);
          const amount = parseInt(inputs.amount, 10);
          const isAmountValid =
            Number.isInteger(amount) && amount > 0 && amount <= ownedCount;

          const calls =
            isAddressValid && isAmountValid
              ? [
                  {
                    address: groupieContractAddress,
                    abi: groupieContractABI,
                    functionName: "transferArt",
                    args: [inputs.toAddress, artId, amount],
                  },
                ]
              : [];

          const previewSrc = art.previewImage?.startsWith("ipfs://")
            ? art.previewImage.replace("ipfs://", "https://ipfs.io/ipfs/")
            : art.previewImage;

          const mediaSrc = art.mediaUrl?.startsWith("ipfs://")
            ? art.mediaUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
            : art.mediaUrl;

          return (
            <div
              key={artId.toString()}
              className="p-4 sm:p-6 bg-black rounded-xl shadow-lg border border-gray-300 space-y-4 text-white"
            >
              <h3 className="text-lg font-semibold">{art.title}</h3>
              <p className="text-sm text-gray-400">
                Artist:{" "}
                <span
                  className="cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(art.artistName)}
                >
                  {art.artistName}
                </span>
              </p>

              {previewSrc && (
                <div>
                  <img
                    src={previewSrc}
                    alt={art.title}
                    className="w-full max-h-48 object-cover rounded-md mb-2"
                  />
                  <button
                    onClick={() =>
                      downloadFile(
                        previewSrc,
                        `${art.title.replace(/\s+/g, "_")}_artwork.jpg`
                      )
                    }
                    className="w-full py-1 bg-[#007FFF] rounded hover:bg-[#0066cc]"
                  >
                    Download Artwork
                  </button>
                </div>
              )}

              {mediaSrc && (
                <div>
                  <audio
                    controls
                    src={mediaSrc}
                    className="w-full rounded max-h-20 mb-2"
                  />
                  <button
                    onClick={() =>
                      downloadFile(
                        mediaSrc,
                        `${art.title.replace(/\s+/g, "_")}_media.mp3`
                      )
                    }
                    className="w-full py-1 bg-[#007FFF] rounded hover:bg-[#0066cc]"
                  >
                    Download Media
                  </button>
                </div>
              )}

              <p className="text-sm">
                Price: {formatEther(art.priceInWei)} ETH
              </p>
              <p className="text-sm">
                Minted: {art.totalMinted.toString()} /{" "}
                {art.maxSupply.toString()}
              </p>
              <p className="text-green-500">
                You own {ownedCount} {ownedCount > 1 ? "copies" : "copy"}
              </p>

              <div className="space-y-2 mt-4 text-black">
                <input
                  type="text"
                  placeholder="Recipient address (0x...)"
                  value={inputs.toAddress}
                  onChange={(e) =>
                    handleInputChange(artId, "toAddress", e.target.value)
                  }
                  className={`w-full px-3 py-2 rounded ${
                    isAddressValid ? "border-green-500" : "border-red-500"
                  } border`}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={inputs.amount}
                  onChange={(e) =>
                    handleInputChange(artId, "amount", e.target.value)
                  }
                  className={`w-full px-3 py-2 rounded ${
                    isAmountValid ? "border-green-500" : "border-red-500"
                  } border`}
                />

                <Transaction
                  chainId={BASE_SEPOLIA_CHAIN_ID}
                  calls={calls}
                  onStatus={handleOnStatus}
                >
                  <TransactionButton
                    text="🚀 Transfer NFT"
                    disabled={calls.length === 0}
                    className="w-full bg-[#007FFF] text-white py-2 rounded-md font-medium hover:bg-[#0066cc]"
                  />
                  <TransactionSponsor />
                  <TransactionStatus className="text-xs mt-2 text-gray-300">
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
