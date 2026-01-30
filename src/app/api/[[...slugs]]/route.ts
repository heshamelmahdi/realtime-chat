import { redis } from "@/lib/redis";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";

const DEFAULT_ROOM_TTL_MINUTES = 10;

const rooms = new Elysia({ prefix: "/room" })
  .post(
    "/create",
    async ({ body }) => {
      const roomId = nanoid();
      const ttlMinutes = body?.ttlMinutes ?? DEFAULT_ROOM_TTL_MINUTES;
      const ttlSeconds = ttlMinutes * 60;

      await redis.hset(`meta:${roomId}`, {
        connected: [],
        createdAt: Date.now(),
      });

      await redis.expire(`meta:${roomId}`, ttlSeconds);

      return { roomId };
    },
    {
      body: z
        .object({
          ttlMinutes: z.number().int().min(1).max(120).optional(),
        })
        .optional(),
    },
  )
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ query }) => {
      const { roomId } = query;
      const ttl = await redis.ttl(`meta:${roomId}`);
      return { ttl: ttl > 0 ? ttl : 0 };
    },
    { query: z.object({ roomId: z.string() }) },
  )
  .delete(
    "/destroy",
    async ({ auth }) => {
      const { roomId } = auth;
      await realtime
        .channel(roomId)
        .emit("chat.destroy", { isDestroyed: true });

      await Promise.all([
        redis.del(`meta:${roomId}`),
        redis.del(`messages:${roomId}`),
        redis.del(roomId),
      ]);

      return { success: true };
    },
    { query: z.object({ roomId: z.string() }) },
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { roomId, token } = auth;
      const { sender, text } = body;

      const roomExists = await redis.exists(`meta:${roomId}`);
      if (!roomExists) throw new Error("Room not found");

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      // Add message to the history
      await redis.rpush(`messages:${roomId}`, { ...message, token });
      await realtime.channel(roomId).emit("chat.message", message);

      // housekeeping
      const remaining = await redis.ttl(`meta:${roomId}`);
      await redis.expire(`messages:${roomId}`, remaining);
      await redis.expire(roomId, remaining);
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    },
  )
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages:${auth.roomId}`,
        0,
        -1,
      );

      return {
        messages: messages.map((m) => {
          return {
            ...m,
            token: m.token === auth.token ? m.token : undefined,
          };
        }),
      };
    },
    { query: z.object({ roomId: z.string() }) },
  );

const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

export type App = typeof app;
