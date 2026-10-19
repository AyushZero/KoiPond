import { z } from "zod";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { rooms, roomMembers, sessions, users } from "@db/schema";

const MIN_SESSION_SEC = 10 * 60; // sessions under this don't count

function roomCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  zero: createRouter({
    /** Create (or fetch) an identity. The id is a device token stored client-side. */
    identify: publicQuery
      .input(z.object({ id: z.string().optional(), name: z.string().min(1).max(64).optional() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        if (input.id) {
          const existing = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
          if (existing[0]) return existing[0];
        }
        const id = randomUUID();
        await db.insert(users).values({ id, name: input.name ?? "Anonymous" });
        const created = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return created[0];
      }),

    rename: publicQuery
      .input(z.object({ userId: z.string(), name: z.string().min(1).max(64) }))
      .mutation(async ({ input }) => {
        await getDb().update(users).set({ name: input.name }).where(eq(users.id, input.userId));
        return { ok: true };
      }),

    createRoom: publicQuery
      .input(z.object({ userId: z.string(), name: z.string().min(1).max(64) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const id = randomUUID();
        let code = roomCode();
        for (let i = 0; i < 5; i++) {
          const clash = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
          if (!clash[0]) break;
          code = roomCode();
        }
        await db.insert(rooms).values({ id, code, name: input.name });
        await db.insert(roomMembers).values({ roomId: id, userId: input.userId });
        return { id, code, name: input.name };
      }),

    joinRoom: publicQuery
      .input(z.object({ userId: z.string(), code: z.string().min(4).max(8) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const found = await db.select().from(rooms).where(eq(rooms.code, input.code.toUpperCase())).limit(1);
        const room = found[0];
        if (!room) throw new Error("No room with that code");
        const member = await db
          .select()
          .from(roomMembers)
          .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, input.userId)))
          .limit(1);
        if (!member[0]) await db.insert(roomMembers).values({ roomId: room.id, userId: input.userId });
        return { id: room.id, code: room.code, name: room.name };
      }),

    leaveRoom: publicQuery
      .input(z.object({ userId: z.string(), roomId: z.string() }))
      .mutation(async ({ input }) => {
        await getDb()
          .delete(roomMembers)
          .where(and(eq(roomMembers.roomId, input.roomId), eq(roomMembers.userId, input.userId)));
        return { ok: true };
      }),

    /** A small room history lets a returning device move between its rooms. */
    recentRooms: publicQuery
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const rows = await getDb()
          .select({ room: rooms, joinedAt: roomMembers.createdAt })
          .from(roomMembers)
          .innerJoin(rooms, eq(rooms.id, roomMembers.roomId))
          .where(eq(roomMembers.userId, input.userId))
          .orderBy(desc(roomMembers.createdAt))
          .limit(5);
        return rows.map((row) => row.room);
      }),

    /** Everything the home screen needs: my room, members, feed, live sessions. */
    state: publicQuery
      .input(z.object({ userId: z.string(), roomId: z.string().optional() }))
      .query(async ({ input }) => {
        const db = getDb();
        const membership = await db
          .select({ room: rooms })
          .from(roomMembers)
          .innerJoin(rooms, eq(rooms.id, roomMembers.roomId))
          .where(input.roomId ? and(eq(roomMembers.userId, input.userId), eq(roomMembers.roomId, input.roomId)) : eq(roomMembers.userId, input.userId))
          .limit(1);
        const room = membership[0]?.room ?? null;
        if (!room) return { room: null, members: [], feed: [], live: [] };

        const memberRows = await db
          .select({ user: users })
          .from(roomMembers)
          .innerJoin(users, eq(users.id, roomMembers.userId))
          .where(eq(roomMembers.roomId, room.id));

        const feed = await db
          .select({ session: sessions, userName: users.name, userId: users.id })
          .from(sessions)
          .innerJoin(users, eq(users.id, sessions.userId))
          .where(eq(sessions.roomId, room.id))
          .orderBy(desc(sessions.startedAt))
          .limit(50);

        return {
          room,
          members: memberRows.map((m) => m.user),
          feed: feed.filter((f) => f.session.endedAt !== null).map((f) => ({ ...f.session, userName: f.userName })),
          live: feed.filter((f) => f.session.endedAt === null).map((f) => ({ ...f.session, userName: f.userName })),
        };
      }),

    stats: publicQuery
      .input(z.object({ roomId: z.string() }))
      .query(async ({ input }) => {
        const rows = await getDb()
          .select({
            userId: users.id,
            userName: users.name,
            studiedSec: sql<number>`coalesce(sum(${sessions.netSec}), 0)`,
            wastedSec: sql<number>`coalesce(sum(${sessions.wastedSec}), 0)`,
            sessions: sql<number>`count(${sessions.id})`,
          })
          .from(roomMembers)
          .innerJoin(users, eq(users.id, roomMembers.userId))
          .leftJoin(sessions, and(eq(sessions.userId, users.id), eq(sessions.roomId, input.roomId), eq(sessions.counted, true)))
          .where(eq(roomMembers.roomId, input.roomId))
          .groupBy(users.id, users.name)
          .orderBy(desc(sql`coalesce(sum(${sessions.netSec}), 0)`));
        return rows.map((row) => ({ ...row, studiedSec: Number(row.studiedSec), wastedSec: Number(row.wastedSec), sessions: Number(row.sessions) }));
      }),

    startSession: publicQuery
      .input(z.object({ userId: z.string(), roomId: z.string() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        // close any dangling live session for this user first
        const dangling = await db
          .select()
          .from(sessions)
          .where(and(eq(sessions.userId, input.userId), isNull(sessions.endedAt)))
          .limit(1);
        if (dangling[0]) {
          const s = dangling[0];
          const elapsed = Math.max(0, Math.floor((Date.now() - s.startedAt.getTime()) / 1000));
          await db
            .update(sessions)
            .set({ endedAt: new Date(), elapsedSec: elapsed, netSec: elapsed, counted: elapsed >= MIN_SESSION_SEC })
            .where(eq(sessions.id, s.id));
        }
        const id = randomUUID();
        await db.insert(sessions).values({ id, roomId: input.roomId, userId: input.userId, startedAt: new Date() });
        return { id, startedAt: Date.now() };
      }),

    stopSession: publicQuery
      .input(
        z.object({
          sessionId: z.string(),
          elapsedSec: z.number().int().min(0),
          wastedSec: z.number().int().min(0).max(24 * 3600),
          note: z.string().max(140).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const net = Math.max(0, input.elapsedSec - input.wastedSec);
        const counted = net >= MIN_SESSION_SEC;
        await db
          .update(sessions)
          .set({
            endedAt: new Date(),
            elapsedSec: input.elapsedSec,
            wastedSec: input.wastedSec,
            netSec: net,
            counted,
            note: input.note ?? null,
          })
          .where(eq(sessions.id, input.sessionId));
        return { netSec: net, counted };
      }),

    discardSession: publicQuery
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await getDb().delete(sessions).where(eq(sessions.id, input.sessionId));
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
