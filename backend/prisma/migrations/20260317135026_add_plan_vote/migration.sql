-- CreateEnum
CREATE TYPE "PlanVoteValue" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "PlanVote" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "value" "PlanVoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanVote_planId_userId_key" ON "PlanVote"("planId", "userId");

-- AddForeignKey
ALTER TABLE "PlanVote" ADD CONSTRAINT "PlanVote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVote" ADD CONSTRAINT "PlanVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
