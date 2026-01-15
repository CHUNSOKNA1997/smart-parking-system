-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "blockchain_block" INTEGER,
ADD COLUMN     "blockchain_status" VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN     "blockchain_tx_hash" VARCHAR(255);

-- CreateIndex
CREATE INDEX "transactions_blockchain_tx_hash_idx" ON "transactions"("blockchain_tx_hash");
