-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "siteName" TEXT NOT NULL DEFAULT 'Khidmat',
    "tagline" TEXT NOT NULL DEFAULT 'Serving humanity, one act of kindness at a time',
    "heroTitle" TEXT NOT NULL DEFAULT 'Together We Can Change Lives',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Khidmat connects generous hearts with people who need help the most. Join us in our mission.',
    "heroImageUrl" TEXT NOT NULL DEFAULT '/uploads/placeholder-hero.jpg',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "aboutTitle" TEXT NOT NULL DEFAULT 'About Khidmat',
    "aboutText" TEXT NOT NULL DEFAULT 'Khidmat is a community-driven charity dedicated to providing food, education, healthcare, and shelter to those in need. Every contribution, big or small, helps us reach more people.',
    "aboutImageUrl" TEXT NOT NULL DEFAULT '/uploads/placeholder-about.jpg',
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

-- CreateTable
CREATE TABLE "Cause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '/uploads/placeholder-cause.jpg',
    "raisedLabel" TEXT NOT NULL DEFAULT '',
    "goalLabel" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorName" TEXT NOT NULL,
    "donorPhone" TEXT NOT NULL DEFAULT '',
    "donorEmail" TEXT NOT NULL DEFAULT '',
    "amount" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
