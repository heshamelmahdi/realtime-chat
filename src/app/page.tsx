"use client"

import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

const getErrorMessage = (error: string) => {
  switch (error) {
    case "room_not_found":
      return "The room you are looking for does not exist."
    case "room_full":
      return "The room you are looking for is full."
    default:
      return "An unknown error occurred."
  }
}



function Home() {
  const router = useRouter()
  const { username, setUsername } = useUsername()

  const searchParams = useSearchParams()
  const wasDestroyed = searchParams.get("destroyed") === "true"
  const error = searchParams.get("error")

  const [ttlMinutesInput, setTtlMinutesInput] = useState("10")
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [roomIdInput, setRoomIdInput] = useState("")
  const parsedTtlMinutes = useMemo(() => {
    const parsed = Number(ttlMinutesInput)
    if (!Number.isFinite(parsed)) return null
    if (parsed < 1 || parsed > 120) return null
    return Math.floor(parsed)
  }, [ttlMinutesInput])

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post({
        ttlMinutes: parsedTtlMinutes ?? undefined,
      })
      if (res.status === 200 && res.data) {
        router.push(`/room/${res.data.roomId}`)
      }
    }
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {wasDestroyed && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-md text-center text-red-500">
            <p>The room has been destroyed.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-md text-center text-red-500 text-balance">
            <p>{getErrorMessage(error)}</p>
          </div>
        )}


        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">{">"}private_chat</h1>
          <p className="text-zinc-500 text-sm">A private, self-destructing chat room.</p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          <div className="flex border border-zinc-800 rounded-md overflow-hidden mb-6">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === "create" ? "bg-zinc-100 text-black" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}
            >
              CREATE A ROOM
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === "join" ? "bg-zinc-100 text-black" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}
            >
              JOIN A ROOM
            </button>
          </div>

          {activeTab === "create" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center text-zinc-500">
                  Your Identity
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-300 font-mono"
                    placeholder="anonymous-wolf-abcde"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-zinc-500">
                  Room TTL (minutes)
                </label>

                <input
                  type="number"
                  min={1}
                  max={120}
                  value={ttlMinutesInput}
                  onChange={(e) => setTtlMinutesInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-300 font-mono"
                  placeholder="10"
                />
                <p className="text-[11px] text-zinc-600">1-120 minutes</p>
              </div>

              <button
                onClick={() => createRoom()}
                disabled={parsedTtlMinutes === null}
                className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
              >
                CREATE SECURE ROOM
              </button>
            </div>
          )}

          {activeTab === "join" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center text-zinc-500">
                  Your Identity
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-300 font-mono"
                    placeholder="anonymous-wolf-abcde"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-zinc-500">
                  Room ID
                </label>

                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-300 font-mono"
                  placeholder="Enter room id"
                />
              </div>

              <button
                onClick={() => router.push(`/room/${roomIdInput.trim()}`)}
                disabled={!roomIdInput.trim()}
                className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
              >
                JOIN ROOM
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const Page = () => {
  return <Suspense><Home /></Suspense>
}

export default Page;
