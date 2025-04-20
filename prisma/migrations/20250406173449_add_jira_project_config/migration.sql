-- CreateTable
CREATE TABLE "JiraProjectConfig" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "issueTypes" JSONB NOT NULL,
    "jiraCredentialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraProjectConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JiraProjectConfig_jiraCredentialId_key" ON "JiraProjectConfig"("jiraCredentialId");

-- AddForeignKey
ALTER TABLE "JiraProjectConfig" ADD CONSTRAINT "JiraProjectConfig_jiraCredentialId_fkey" FOREIGN KEY ("jiraCredentialId") REFERENCES "JiraCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
