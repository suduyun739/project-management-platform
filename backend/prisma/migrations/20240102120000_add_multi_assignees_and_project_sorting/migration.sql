-- AlterTable: Add sortOrder to projects table
ALTER TABLE "projects" ADD COLUMN "sortOrder" SERIAL NOT NULL;

-- CreateTable: Create requirement_assignees junction table
CREATE TABLE "requirement_assignees" (
    "requirementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_assignees_pkey" PRIMARY KEY ("requirementId","userId")
);

-- CreateTable: Create task_assignees junction table
CREATE TABLE "task_assignees" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("taskId","userId")
);

-- AddForeignKey: Add foreign key for requirement_assignees -> requirements
ALTER TABLE "requirement_assignees" ADD CONSTRAINT "requirement_assignees_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Add foreign key for requirement_assignees -> users
ALTER TABLE "requirement_assignees" ADD CONSTRAINT "requirement_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Add foreign key for task_assignees -> tasks
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Add foreign key for task_assignees -> users
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Migrate existing single assignees to the new multi-assignee tables
INSERT INTO "requirement_assignees" ("requirementId", "userId", "assignedAt")
SELECT "id", "assigneeId", "createdAt"
FROM "requirements"
WHERE "assigneeId" IS NOT NULL;

INSERT INTO "task_assignees" ("taskId", "userId", "assignedAt")
SELECT "id", "assigneeId", "createdAt"
FROM "tasks"
WHERE "assigneeId" IS NOT NULL;
