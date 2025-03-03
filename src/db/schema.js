import { pgTable, serial, varchar, boolean, timestamp, integer, text } from "drizzle-orm/pg-core";

// User Table
export const UserTable = pgTable('users', {
  userId: serial('userId').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),  // Ensuring email is unique
  userName: varchar('userName', { length: 255 }).notNull(),//unique
  password: varchar('password', { length: 255 }).notNull(),
  googleId: varchar('googleId', { length: 255 }),
  userIdOnBlockchain: varchar('userIdOnBlockchain', { length: 255 }).notNull(),
  referenceLocation: varchar('referenceLocation', { length: 255 }).notNull(),
  dataSharable: boolean('dataSharable').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// File Table
export const FileTable = pgTable('files', {
  fileId: serial('fileId').primaryKey(),
  userId: integer('userId').references(() => UserTable.userId).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  expirationTime: integer('expirationTime').notNull(),
  url: varchar('url', { length: 255 }).notNull(),
  fileuuid: varchar('fileuuid', { length: 255 }).notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Symptom Table
export const SymptomTable = pgTable('symptoms', {
  symptomId: serial('symptomId').primaryKey(),
  userId: integer('userId').references(() => UserTable.userId).notNull(),
  description: text('description').notNull(),
  result: text('result').notNull(),
  confidenceRateOfResult: integer('confidenceRateOfResult').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Medical Info Table
export const MedicalInfoTable = pgTable('medical_info', {
  id: serial('id').primaryKey(),
  userId: integer('userId').references(() => UserTable.userId).notNull(),
  medical_condition: text('medical_condition'),
  medical_background: text('medical_background'),
  share_data: boolean('share_data').default(false),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});