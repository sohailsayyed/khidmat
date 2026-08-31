-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '/uploads/placeholder-cause.svg',
    "raisedLabel" TEXT NOT NULL DEFAULT '',
    "goalLabel" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Cause" ("createdAt", "description", "goalLabel", "id", "imageUrl", "order", "published", "raisedLabel", "title", "updatedAt") SELECT "createdAt", "description", "goalLabel", "id", "imageUrl", "order", "published", "raisedLabel", "title", "updatedAt" FROM "Cause";
DROP TABLE "Cause";
ALTER TABLE "new_Cause" RENAME TO "Cause";
CREATE TABLE "new_SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "siteName" TEXT NOT NULL DEFAULT 'Khidmat',
    "tagline" TEXT NOT NULL DEFAULT 'Serving humanity, one act of kindness at a time',
    "heroTitle" TEXT NOT NULL DEFAULT 'Together We Can Change Lives',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Khidmat connects generous hearts with people who need help the most. Join us in our mission.',
    "heroImageUrl" TEXT NOT NULL DEFAULT '/uploads/placeholder-hero.svg',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "aboutTitle" TEXT NOT NULL DEFAULT 'About Khidmat',
    "aboutText" TEXT NOT NULL DEFAULT 'Khidmat is a community-driven charity dedicated to providing food, education, healthcare, and shelter to those in need. Every contribution, big or small, helps us reach more people.',
    "aboutImageUrl" TEXT NOT NULL DEFAULT '/uploads/placeholder-about.svg',
    "contactNumber" TEXT NOT NULL DEFAULT '+91 90000 00000',
    "contactEmail" TEXT NOT NULL DEFAULT 'contact@khidmat.org',
    "contactAddress" TEXT NOT NULL DEFAULT 'Pune, Maharashtra, India',
    "qrImageUrl" TEXT NOT NULL DEFAULT '/uploads/placeholder-qr.png',
    "donateNote" TEXT NOT NULL DEFAULT 'Scan the QR code or call us to donate. Every contribution is deeply appreciated.',
    "facebookUrl" TEXT NOT NULL DEFAULT '',
    "instagramUrl" TEXT NOT NULL DEFAULT '',
    "twitterUrl" TEXT NOT NULL DEFAULT '',
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SiteSettings" ("aboutImageUrl", "aboutText", "aboutTitle", "contactAddress", "contactEmail", "contactNumber", "donateNote", "facebookUrl", "heroImageUrl", "heroSubtitle", "heroTitle", "id", "instagramUrl", "logoUrl", "qrImageUrl", "siteName", "tagline", "twitterUrl", "updatedAt", "whatsappNumber") SELECT "aboutImageUrl", "aboutText", "aboutTitle", "contactAddress", "contactEmail", "contactNumber", "donateNote", "facebookUrl", "heroImageUrl", "heroSubtitle", "heroTitle", "id", "instagramUrl", "logoUrl", "qrImageUrl", "siteName", "tagline", "twitterUrl", "updatedAt", "whatsappNumber" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
