import { S3Client, PutBucketPolicyCommand } from "@aws-sdk/client-s3"
import { readFileSync } from "fs"

// Lê o .env manualmente
const env = readFileSync(".env", "utf-8")
const get = (key) => {
    const match = env.match(new RegExp(`^${key}=(.+)$`, "m"))
    return match ? match[1].replace(/^["']|["']$/g, "").trim() : ""
}

const endpoint = get("MINIO_ENDPOINT")
const accessKeyId = get("MINIO_ACCESS_KEY")
const secretAccessKey = get("MINIO_SECRET_KEY")
const bucket = get("MINIO_BUCKET") || "mvdesk"

if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error("❌ Variáveis MINIO_ENDPOINT, MINIO_ACCESS_KEY ou MINIO_SECRET_KEY não encontradas no .env")
    process.exit(1)
}

const s3 = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
})

const policy = {
    Version: "2012-10-17",
    Statement: [
        {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/*`],
        },
    ],
}

console.log(`🪣 Aplicando policy pública no bucket "${bucket}"...`)
console.log(`📡 Endpoint: ${endpoint}`)

try {
    await s3.send(new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(policy),
    }))
    console.log(`✅ Policy aplicada com sucesso! Arquivos em "${bucket}" agora são públicos.`)
} catch (err) {
    console.error("❌ Erro ao aplicar policy:", err.message)
    process.exit(1)
}
