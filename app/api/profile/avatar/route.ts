import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { createClient } from "@/lib/supabase/server";
import { getAvatarBucketName, normalizeAvatarKey } from "@/lib/storage/avatar";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = /^image\//i;

function createS3Client() {
  const region = process.env.S3_AVATARS_REGION ?? process.env.S3_REGION;
  const endpoint = process.env.S3_AVATARS_ENDPOINT ?? process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_AVATARS_ACCESS_KEY ?? process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_AVATARS_SECRET_KEY ?? process.env.S3_SECRET_KEY;

  if (!region || !endpoint || !accessKey || !secretKey) {
    throw new Error("Avatar storage credentials are not fully configured.");
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}

export async function POST(request: Request) {
  try {
    const bucket = getAvatarBucketName();
    if (!bucket) {
      return NextResponse.json(
        { success: false, error: "S3_AVATARS_BUCKET (or S3_BUCKET) is not configured." },
        { status: 500 },
      );
    }

    const s3Client = createS3Client();

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No avatar file provided." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME.test(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only image files are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Image must be 2MB or smaller." },
        { status: 400 },
      );
    }

    const extension = file.type.split("/")[1]?.split("+")[0] ?? "jpg";
    const key = `${user.id}/${Date.now()}.${extension}`;
    const body = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type,
        ACL: "public-read",
      }),
    );

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: profileError.message ?? "Failed to load profile." },
        { status: 500 },
      );
    }

    const newAvatarKey = key;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newAvatarKey })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message ?? "Failed to update avatar." },
        { status: 500 },
      );
    }

    const previousKey = normalizeAvatarKey(profile?.avatar_url);
    if (previousKey && previousKey !== newAvatarKey) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: previousKey,
        }),
      );
    }

    revalidatePath("/protected/profile");
    revalidatePath("/protected");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload avatar.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
