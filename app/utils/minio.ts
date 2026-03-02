import { S3Client, PutObjectCommand, DeleteObjectCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3"

const endpoint = process.env.MINIO_ENDPOINT!
const accessKeyId = process.env.MINIO_ACCESS_KEY!
const secretAccessKey = process.env.MINIO_SECRET_KEY!
export const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "mvdesk"
export const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL ?? `${endpoint}/${MINIO_BUCKET}`

export const s3 = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
})

// Aplica policy de leitura pública no bucket
export async function applyPublicReadPolicy(): Promise<void> {
    const policy = {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { AWS: ["*"] },
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
            },
        ],
    }
    await s3.send(
        new PutBucketPolicyCommand({
            Bucket: MINIO_BUCKET,
            Policy: JSON.stringify(policy),
        }),
    )
}

export async function uploadToMinio(
    key: string,
    buffer: Buffer,
    contentType: string,
): Promise<string> {
    await s3.send(
        new PutObjectCommand({
            Bucket: MINIO_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        }),
    )
    return `${MINIO_PUBLIC_URL}/${key}`
}

export async function deleteFromMinio(key: string): Promise<void> {
    await s3.send(
        new DeleteObjectCommand({
            Bucket: MINIO_BUCKET,
            Key: key,
        }),
    )
}
