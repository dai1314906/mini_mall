/*
  Warnings:

  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);
INSERT INTO "new_Category" ("id", "name", "slug")
SELECT "id", "name",
       CASE "name"
         WHEN '数码' THEN 'digital'
         WHEN '服饰' THEN 'fashion'
         WHEN '食品' THEN 'food'
         WHEN '图书' THEN 'books'
         ELSE 'c-' || "id"
       END
FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
