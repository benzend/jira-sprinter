/*
  Warnings:

  - Added the required column `projectKey` to the `JiraCredential` table without a default value. This is not possible if the table is not empty.

*/
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
CREATE TABLE "new_JiraCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL DEFAULT 'DEFAULT',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JiraCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy existing data
INSERT INTO "new_JiraCredential" ("id", "domain", "email", "apiToken", "userId", "createdAt", "updatedAt", "projectKey")
SELECT "id", "domain", "email", "apiToken", "userId", "createdAt", "updatedAt", 'DEFAULT'
FROM "JiraCredential";

-- Drop the old table
DROP TABLE "JiraCredential";

-- Rename the new table
ALTER TABLE "new_JiraCredential" RENAME TO "JiraCredential";

-- Recreate the unique index
CREATE UNIQUE INDEX "JiraCredential_userId_key" ON "JiraCredential"("userId");
