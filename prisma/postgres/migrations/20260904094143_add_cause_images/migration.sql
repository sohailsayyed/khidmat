-- CreateTable
CREATE TABLE "CauseImage" (
    "id" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CauseImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CauseImage" ADD CONSTRAINT "CauseImage_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE CASCADE ON UPDATE CASCADE;
