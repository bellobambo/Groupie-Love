"use client";

import { useAccount, useReadContracts } from "wagmi";
import { useEffect, useState, useCallback, useMemo } from "react";
import { groupieContractABI, groupieContractAddress } from "../GroupieABI";
import { formatEther, isAddress } from "viem";
import { Music, Image as ImageIcon, Video, FileWarning } from "lucide-react";

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
  previewUrl: string;
  priceInWei: bigint;
  totalMinted: bigint;
  maxSupply: bigint;
}

const BASE_SEPOLIA_CHAIN_ID = 84532;

// MediaRenderer component moved outside the main component
const MediaRenderer = ({
  src,
  type,
  isPreview = false,
}: {
  src: string;
  type: string;
  isPreview?: boolean;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError)
    return <MediaFallback type={isPreview ? "preview" : type} />;

  const handleError = () => setHasError(true);

  try {
    switch (type) {
      case "image":
        return (
          <img
            src={src}
            alt={isPreview ? "NFT Preview" : "NFT Media"}
            className={`w-full ${
              isPreview ? "max-h-48" : "max-h-64"
            } object-contain rounded-md`}
            onError={handleError}
          />
        );
      case "audio":
        return (
          <audio
            controls
            src={src}
            className="w-full rounded"
            onError={handleError}
          />
        );
      case "video":
        return (
          <video
            controls
            src={src}
            className={`w-full ${
              isPreview ? "max-h-48" : "max-h-64"
            } rounded-md`}
            onError={handleError}
          />
        );
      default:
        return <MediaFallback type={isPreview ? "preview" : "media"} />;
    }
  } catch (e) {
    console.error("Error rendering media:", e);
    return <MediaFallback type={isPreview ? "preview" : "media"} />;
  }
};

// Fallback component for failed media
const MediaFallback = ({ type = "media" }: { type?: string }) => {
  let message = "Media not available";
  let Icon = FileWarning;

  if (type === "audio") {
    message = "Audio not available";
    Icon = Music;
  } else if (type === "video") {
    message = "Video not available";
    Icon = Video;
  } else if (type === "image" || type === "preview") {
    message = "Image not available";
    Icon = ImageIcon;
  }

  return (
    <div className="w-full h-48 bg-gray-800 rounded-md flex flex-col items-center justify-center gap-2">
      <Icon className="w-8 h-8 text-gray-400" />
      <span className="text-sm text-gray-400">{message}</span>
    </div>
  );
};

export default function MyCollectibles() {
  const { address } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ownedArts, setOwnedArts] = useState<
    { art: Art; artId: bigint; ownedCount: number }[]
  >([]);
  const [transferInputs, setTransferInputs] = useState<{
    [artId: string]: { toAddress: string; amount: string };
  }>({});

  // Fetch art count
  const artCountResult = useReadContracts({
    contracts: [
      {
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "getArtCount",
      },
    ],
  });

  const artCount = useMemo(() => {
    const count = artCountResult.data?.[0]?.result;
    return count !== undefined ? BigInt(count) : 0n;
  }, [artCountResult.data]);

  // Fetch balances
  const balanceResults = useReadContracts({
    contracts:
      artCount > 0n
        ? Array.from({ length: Number(artCount) }, (_, i) => ({
            address: groupieContractAddress,
            abi: groupieContractABI,
            functionName: "balanceOf",
            args: [address, i],
          }))
        : [],
  });

  // Prepare contracts for art details
  const artDetailsContracts = useMemo(() => {
    if (!balanceResults.data || !artCount) return [];

    return balanceResults.data
      .map((res, i) => ({
        hasBalance: res.result ? BigInt(res.result) > 0n : false,
        artId: i,
      }))
      .filter(({ hasBalance }) => hasBalance)
      .map(({ artId }) => ({
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "getArt",
        args: [artId],
      }));
  }, [balanceResults.data, artCount]);

  // Fetch art details
  const artDetailsResults = useReadContracts({
    contracts: artDetailsContracts,
  });

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([artCountResult.refetch(), balanceResults.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [artCountResult, balanceResults]);

  // Process owned arts
  useEffect(() => {
    if (!artDetailsResults.data || !balanceResults.data || artCount === 0n) {
      setOwnedArts([]);
      return;
    }

    const processedArts = artDetailsResults.data
      .map((res, index) => {
        if (!res.result) return null;

        const artId = artDetailsContracts[index]?.args?.[0];
        if (artId === undefined) return null;

        const balanceRes = balanceResults.data?.[Number(artId)];
        const balance = balanceRes?.result ? BigInt(balanceRes.result) : 0n;

        if (balance === 0n) return null;

        const artData = res.result as any;
        console.log("Fetched NFT data:", artData);

        try {
          return {
            art: {
              title: artData.title || artData[0] || "Untitled",
              artistName: artData.artistName || artData[1] || "Unknown Artist",
              artistWallet: artData.artistWallet || artData[2] || address || "",
              mediaUrl: artData.mediaUrl || artData[3] || "",
              previewUrl: artData.previewUrl || artData[4] || "",
              priceInWei:
                artData.price || artData.priceInWei || artData[5]
                  ? BigInt(artData.price || artData.priceInWei || artData[5])
                  : 0n,
              totalMinted:
                artData.totalMinted || artData[6]
                  ? BigInt(artData.totalMinted || artData[6])
                  : 0n,
              maxSupply:
                artData.maxSupply || artData[7]
                  ? BigInt(artData.maxSupply || artData[7])
                  : 0n,
            },
            artId: BigInt(artId),
            ownedCount: Number(balance),
          };
        } catch (error) {
          console.error("Error processing art data:", error, artData);
          return null;
        }
      })
      .filter(Boolean) as { art: Art; artId: bigint; ownedCount: number }[];

    setOwnedArts(processedArts);
  }, [
    artDetailsResults.data,
    balanceResults.data,
    artCount,
    artDetailsContracts,
    address,
  ]);

  // Improved IPFS URL handler with multiple gateways
  const getIpfsUrl = (ipfsUri: string) => {
    if (!ipfsUri) return "";
    if (ipfsUri.startsWith("ipfs://")) {
      const cid = ipfsUri.replace("ipfs://", "");
      // Try multiple gateways
      const gateways = [
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`,
      ];
      return gateways[0]; // Start with first gateway
    }
    return ipfsUri;
  };

  // Enhanced media type detection
  const getMediaType = (url: string) => {
    if (!url) return "unknown";
    try {
      const pathname = new URL(url).pathname;
      const extension = pathname.split(".").pop()?.toLowerCase() || "";
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
        return "image";
      } else if (["mp3", "wav", "ogg"].includes(extension)) {
        return "audio";
      } else if (["mp4", "webm", "mov"].includes(extension)) {
        return "video";
      }
    } catch (e) {
      console.error("Error parsing media URL:", url, e);
    }
    return "unknown";
  };

  const handleOnStatus = useCallback(
    (status: any) => {
      console.log("Transaction status:", status);
      if (status === "success") {
        refreshData();
      }
    },
    [refreshData]
  );

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
    if (!url) return;

    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  }

  // Prepare all calls outside the render loop
  const allCalls = useMemo(() => {
    return ownedArts.map(({ artId }) => {
      const inputs = transferInputs[artId.toString()] || {
        toAddress: "",
        amount: "",
      };

      const isAddressValid = isAddress(inputs.toAddress);
      const amount = BigInt(inputs.amount || "0");

      const ownedCount =
        ownedArts.find((a) => a.artId === artId)?.ownedCount || 0;
      const isAmountValid = amount > 0n && amount <= BigInt(ownedCount);

      return isAddressValid && isAmountValid
        ? {
            address: groupieContractAddress,
            abi: groupieContractABI,
            functionName: "transferArt",
            args: [inputs.toAddress, artId, amount],
          }
        : null;
    });
  }, [ownedArts, transferInputs]);

  return (
    <div className="py-10 space-y-8 px-4 sm:px-6 w-full max-w-screen-lg mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#007FFF]">
          My Collectibles
        </h2>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className=" py-2 bg-[#007FFF] text-white rounded hover:bg-[#0066cc] disabled:bg-[#A0C4FF] flex items-center gap-2"
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
            <div className="underline">Refresh</div>
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
        <div className=" space-y-6">
          {ownedArts.map(({ art, ownedCount, artId }, index) => {
            const inputs = transferInputs[artId.toString()] || {
              toAddress: "",
              amount: "",
            };

            const isAddressValid = isAddress(inputs.toAddress);
            const amount = parseInt(inputs.amount, 10);
            const isAmountValid =
              Number.isInteger(amount) && amount > 0 && amount <= ownedCount;

            const calls = allCalls[index] ? [allCalls[index]!] : [];

            const previewSrc = getIpfsUrl(art.previewUrl);
            const mediaSrc = getIpfsUrl(art.mediaUrl);
            const mediaType = getMediaType(mediaSrc);
            const previewType = getMediaType(previewSrc);

            return (
              <div
                key={artId.toString()}
                className="p-4 sm:p-6 bg-black rounded-xl shadow-lg border border-gray-300 space-y-4 text-white"
              >
                <h3 className="text-lg font-semibold">{art.title}</h3>
                <p className="text-sm text-gray-400">
                  Artist:{" "}
                  <span
                    className="cursor-pointer hover:text-blue-400"
                    onClick={() =>
                      navigator.clipboard.writeText(art.artistName)
                    }
                  >
                    {art.artistName}
                  </span>
                </p>

                {/* Preview Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Preview</h4>
                  <MediaRenderer
                    src={getIpfsUrl(art.previewUrl)}
                    type="image"
                    isPreview
                  />
                  <button
                    onClick={() =>
                      downloadFile(
                        getIpfsUrl(art.previewUrl),
                        `${art.title.replace(/\s+/g, "_")}_preview.${getIpfsUrl(
                          art.previewUrl
                        )
                          .split(".")
                          .pop()}`
                      )
                    }
                    className="w-full py-1 bg-[#007FFF] rounded hover:bg-[#0066cc] transition-colors disabled:opacity-50"
                    disabled={!art.previewUrl}
                  >
                    Download Preview
                  </button>
                </div>

                {/* Main Media Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-center items-center  text-gray-300">
                    Media
                  </h4>
                  {/* <MediaRenderer
                    src={getIpfsUrl(art.mediaUrl)}
                    type={getMediaType(getIpfsUrl(art.mediaUrl))}
                  /> */}
                  <button
                    onClick={() =>
                      downloadFile(
                        getIpfsUrl(art.mediaUrl),
                        `${art.title.replace(/\s+/g, "_")}_media.${getIpfsUrl(
                          art.mediaUrl
                        )
                          .split(".")
                          .pop()}`
                      )
                    }
                    className="w-full py-1 bg-[#007FFF] rounded hover:bg-[#0066cc] transition-colors disabled:opacity-50"
                    disabled={!art.mediaUrl}
                  >
                    Download Media
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <p>Price: {formatEther(art.priceInWei)} ETH</p>
                  <p>
                    Minted: {art.totalMinted.toString()}/
                    {art.maxSupply.toString()}
                  </p>
                  <p className="text-green-500 col-span-2">
                    You own {ownedCount} {ownedCount > 1 ? "copies" : "copy"}
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    value={inputs.toAddress}
                    onChange={(e) =>
                      handleInputChange(artId, "toAddress", e.target.value)
                    }
                    className={`w-full px-3 py-2 rounded text-white ${
                      inputs.toAddress
                        ? isAddressValid
                          ? "border-green-500"
                          : "border-red-500"
                        : "border-gray-300"
                    } border`}
                  />

                  <div></div>
                  <input
                    type="number"
                    placeholder="Amount"
                    min="1"
                    max={ownedCount}
                    value={inputs.amount}
                    onChange={(e) =>
                      handleInputChange(artId, "amount", e.target.value)
                    }
                    className={`w-full px-3 py-2 rounded text-white ${
                      inputs.amount
                        ? isAmountValid
                          ? "border-green-500"
                          : "border-red-500"
                        : "border-gray-300"
                    } border`}
                  />

                  <Transaction
                    chainId={BASE_SEPOLIA_CHAIN_ID}
                    calls={calls}
                    onStatus={handleOnStatus}
                  >
                    <TransactionButton
                      text="Transfer NFT"
                      disabled={calls.length === 0}
                      className="w-full bg-[#007FFF] text-white py-2 rounded-md font-medium hover:bg-[#0066cc] transition-colors disabled:opacity-50"
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
          })}
        </div>
      )}
    </div>
  );
}
