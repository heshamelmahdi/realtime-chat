"use client"

import { client } from "@/lib/client"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useUsername } from "@/hooks/use-username"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { useRealtime } from "@/lib/realtime-client"

const formatTimeRemaining = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

const RoomPage = () => {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { username } = useUsername()

  // Is the room ID copied to clipboard?
  const [isCopied, setIsCopied] = useState("COPY")

  // Time remaining to self-destruct
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Message input
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: ttl } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } })
      if (res.status === 200 && res.data) {
        return res.data.ttl
      }
      return null
    }
  })

  useEffect(() => {
    if (ttl === undefined) return
    const timeoutId = setTimeout(() => {
      setTimeRemaining(ttl)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [ttl])


  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return
    if (timeRemaining === 0) {
      router.push("/?destroyed=true")
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeRemaining, router])

  // Get the messages
  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } })
      if (res.status === 200 && res.data) {
        return res.data.messages
      }
      return []
    }
  })

  // Send the message
  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async () => {
      await client.messages.post({
        sender: username,
        text: input,
      }, { query: { roomId } })
    },
    onSuccess: () => {
      setInput("")
      inputRef.current?.focus()
    }
  })

  const { mutate: destroyRoom, isPending: isDestroying } = useMutation({
    mutationFn: async () => {
      await client.room.destroy.delete(undefined, { query: { roomId } })
    },
    onSuccess: () => {
      router.push("/?destroyed=true")
    }
  })

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") { refetch() }
      else if (event === "chat.destroy") { router.push("/?destroyed=true") }
    }
  })

  const copyToClipboard = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setIsCopied("COPIED!")
    setTimeout(() => {
      setIsCopied("COPY")
    }, 2000)
  }

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">Room ID</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-500">{roomId}</span>
              <button onClick={copyToClipboard} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
                {isCopied}
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">Self-Destruct</span>
            <span className={`text-sm font-bold items-center gap-2 ${timeRemaining !== null && timeRemaining < 60 ? "text-red-500" : "text-amber-500"}`}>{timeRemaining !== null ? `${formatTimeRemaining(timeRemaining)}` : "--:--"}</span>
          </div>
        </div>

        <button disabled={isDestroying} onClick={() => destroyRoom()} className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{isDestroying ? "DESTROYING..." : "DESTROY NOW"}</button>
      </header>

      {/* Render the messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages?.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm font-mono">No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages?.map(message => (
          <div key={message.id} className="flex flex-col items-start">
            <div className="max-w-[80%] group">
              <div className="flex items-baseline gap-3 mb-1">
                <span className={`text-xs font-bold ${message.sender === username ? "text-green-500" : "text-blue-500"}`}>{message.sender === username ? "You" : message.sender}</span>

                <span className="text-[10px] text-zinc-600">{format(message.timestamp, "HH:mm")}</span>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed break-all">{message.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex gap-4">
          <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">{">"}</span>
            <input autoFocus type="text" className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              ref={inputRef}
              placeholder="Type message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
          </div>

          <button onClick={() => sendMessage()} disabled={!input.trim() || isPending} className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">{isPending ? "Sending..." : "Send"}</button>
        </div>
      </div>
    </main>
  )
}

export default RoomPage