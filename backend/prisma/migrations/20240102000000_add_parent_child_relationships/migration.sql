-- AlterTable: Add parentId to requirements table
ALTER TABLE "requirements" ADD COLUMN "parentId" TEXT;

-- AlterTable: Add parentId to tasks table
ALTER TABLE "tasks" ADD COLUMN "parentId" TEXT;

-- AddForeignKey: Add foreign key for requirement parent-child relationship
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Add foreign key for task parent-child relationship
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
