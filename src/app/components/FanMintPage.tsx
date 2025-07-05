"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";
import { formatEther } from "viem";
import { groupieContractABI, groupieContractAddress } from "../GroupieABI";

interface Art {
  artist: string;
  title: string;
  artworkURI: string;
  musicURI: string;
  price: bigint;
  availableMints: bigint;
  mintedCount: bigint;
}

export default function FanMintPage() {
  const { address, chain } = useAccount();
  const [arts, setArts] = useState<Art[]>([]);

  const { data: nextArtIdData } = useReadContracts({
    contracts: [
      {
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "nextArtId",
      },
    ],
  });

  const nextArtId = Number(nextArtIdData?.[0]?.result || 0);

  const contracts = Array.from({ length: nextArtId }, (_, i) => ({
    address: groupieContractAddress,
    abi: groupieContractABI,
    functionName: "arts",
    args: [BigInt(i)],
  }));

  const { data: artsData } = useReadContracts({
    contracts,
  });

  useEffect(() => {
    if (artsData) {
      console.log("Raw artsData:", artsData);

      const parsed = artsData
        .map((item, i) => {
          const result = item.result as any;
          if (!result) {
            console.warn(`Missing result for index ${i}`, item);
            return undefined;
          }

          return {
            artist: result[0],
            title: result[1],
            artworkURI: result[2],
            musicURI: result[3],
            price: BigInt(result[4]),
            availableMints: BigInt(result[5]),
            mintedCount: BigInt(result[6]),
          } satisfies Art;
        })
        .filter(Boolean) as Art[];

      console.log("Parsed arts:", parsed);
      setArts(parsed);
    }
  }, [artsData]);

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <h2 className="text-2xl font-bold">Available Fan Collectibles</h2>
      {arts.map((art, index) => (
        <div key={index} className="p-6 border rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">{art.title}</h3>
          <img
            src={
              art.artworkURI?.startsWith("ipfs://")
                ? art.artworkURI.replace("ipfs://", "https://ipfs.io/ipfs/")
                : art.artworkURI
            }
            alt={art.title}
            className="w-full h-60 object-cover mb-4 rounded"
          />

          {art.musicURI && (
            <audio
              src={
                art.musicURI.startsWith("ipfs://")
                  ? art.musicURI.replace("ipfs://", "https://ipfs.io/ipfs/")
                  : art.musicURI
              }
              controls
              className="mb-4"
            />
          )}

          <p>
            Price:{" "}
            {typeof art.price === "bigint" ? formatEther(art.price) : "N/A"} ETH
          </p>
          <p>
            Mints:{" "}
            {typeof art.mintedCount === "bigint"
              ? art.mintedCount.toString()
              : "0"}{" "}
            /{" "}
            {typeof art.availableMints === "bigint"
              ? art.availableMints.toString()
              : "0"}
          </p>

          {address && (
            <Transaction
              chainId={chain?.id}
              calls={[
                {
                  address: groupieContractAddress,
                  abi: groupieContractABI,
                  functionName: "mintArt",
                  args: [BigInt(index)],
                  value: art.price,
                },
              ]}
            >
              <TransactionButton text="Mint Collectible" />
              <TransactionStatus className="mt-2">
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          )}
        </div>
      ))}
    </div>
  );
}
