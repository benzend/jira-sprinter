-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JiraCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JiraCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JiraCredential" ("apiToken", "createdAt", "domain", "email", "id", "projectKey", "updatedAt", "userId") SELECT "apiToken", "createdAt", "domain", "email", "id", "projectKey", "updatedAt", "userId" FROM "JiraCredential";
DROP TABLE "JiraCredential";
ALTER TABLE "new_JiraCredential" RENAME TO "JiraCredential";
CREATE UNIQUE INDEX "JiraCredential_userId_key" ON "JiraCredential"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
