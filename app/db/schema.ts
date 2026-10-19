import {
  mysqlTable,
  serial,
  varchar,
  int,
  boolean,
  timestamp,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rooms = mysqlTable("rooms", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roomMembers = mysqlTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  elapsedSec: int("elapsed_sec").notNull().default(0),
  wastedSec: int("wasted_sec").notNull().default(0),
  netSec: int("net_sec").notNull().default(0),
  counted: boolean("counted").notNull().default(false),
  note: varchar("note", { length: 140 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
