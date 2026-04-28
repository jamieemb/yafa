-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecurringItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUT',
    "budgetCategory" TEXT,
    "bankAccount" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RecurringItem" ("active", "amount", "bankAccount", "budgetCategory", "createdAt", "dayOfMonth", "endDate", "frequency", "id", "name", "notes", "startDate", "updatedAt") SELECT "active", "amount", "bankAccount", "budgetCategory", "createdAt", "dayOfMonth", "endDate", "frequency", "id", "name", "notes", "startDate", "updatedAt" FROM "RecurringItem";
DROP TABLE "RecurringItem";
ALTER TABLE "new_RecurringItem" RENAME TO "RecurringItem";
CREATE INDEX "RecurringItem_direction_idx" ON "RecurringItem"("direction");
CREATE INDEX "RecurringItem_budgetCategory_idx" ON "RecurringItem"("budgetCategory");
CREATE INDEX "RecurringItem_active_idx" ON "RecurringItem"("active");
CREATE INDEX "RecurringItem_bankAccount_idx" ON "RecurringItem"("bankAccount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
