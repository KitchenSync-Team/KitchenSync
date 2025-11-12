export function getAvatarBucketName(): string | null {
  return process.env.S3_AVATARS_BUCKET ?? process.env.S3_BUCKET ?? null;
}

export function normalizeAvatarKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const bucket = getAvatarBucketName();

  if (value.startsWith("http") && bucket) {
    const marker = `/${bucket}/`;
    const index = value.indexOf(marker);
    if (index !== -1) {
      const key = value.slice(index + marker.length);
      return key.replace(/^\/+/, "");
    }
  }

  return value.replace(/^\/+/, "");
}
