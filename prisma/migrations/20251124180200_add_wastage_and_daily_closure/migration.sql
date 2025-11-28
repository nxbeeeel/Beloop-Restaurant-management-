-- DropForeignKey
ALTER TABLE "DailyClosure" DROP CONSTRAINT "DailyClosure_outletId_fkey";

-- DropIndex
DROP INDEX "DailyClosure_outletId_date_idx";

-- AlterTable
ALTER TABLE "DailyClosure" ALTER COLUMN "date" DROP DEFAULT,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cashSale" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "bankSale" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "zomatoSale" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "swiggySale" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "totalSale" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "totalExpense" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "profit" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Wastage" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wastage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wastage_outletId_idx" ON "Wastage"("outletId");

-- CreateIndex
CREATE INDEX "Wastage_productId_idx" ON "Wastage"("productId");

-- CreateIndex
CREATE INDEX "DailyClosure_outletId_idx" ON "DailyClosure"("outletId");

-- AddForeignKey
ALTER TABLE "DailyClosure" ADD CONSTRAINT "DailyClosure_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wastage" ADD CONSTRAINT "Wastage_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wastage" ADD CONSTRAINT "Wastage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
