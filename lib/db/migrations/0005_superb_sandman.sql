ALTER TABLE "User" ADD COLUMN "resetToken" varchar(100);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "resetTokenExpiry" timestamp;