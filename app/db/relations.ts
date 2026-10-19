import { relations } from "drizzle-orm";
import { rooms, roomMembers, sessions, users } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(roomMembers),
  sessions: many(sessions),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  members: many(roomMembers),
  sessions: many(sessions),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, { fields: [roomMembers.roomId], references: [rooms.id] }),
  user: one(users, { fields: [roomMembers.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  room: one(rooms, { fields: [sessions.roomId], references: [rooms.id] }),
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
