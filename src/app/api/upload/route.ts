import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_S3_API as string,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
  "doc",
  "docx",
  "zip",
  "mp4",
  "webm",
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
  mp4: "video/mp4",
  webm: "video/webm",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the maximum allowed limit of 20 MB." },
        { status: 400 }
      );
    }

    const rawExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!rawExt || !ALLOWED_EXTENSIONS.has(rawExt)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, ZIP, MP4, WEBM.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${crypto.randomUUID()}.${rawExt}`;
    const contentType = EXT_TO_MIME[rawExt] || file.type || "application/octet-stream";

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME as string,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicBase = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
    const publicUrl = `${publicBase}/${fileName}`;

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return NextResponse.json({ error: "Failed to upload file to storage." }, { status: 500 });
  }
}
