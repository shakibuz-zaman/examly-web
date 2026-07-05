import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Space, Upload, message } from "antd";
import { useState } from "react";
import { mediaUrl, uploadMedia } from "../../api/media";

const MAX_DIMENSION = 1600;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Bangladesh mobile connections are the target: shrink at the source so a
// 4 MB phone photo never crosses the wire. Originals are not kept.
async function downscaleIfNeeded(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) return file;

    const scale = MAX_DIMENSION / Math.max(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, 0.85),
    );
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type });
  } finally {
    bitmap.close();
  }
}

type MediaUploaderProps = {
  value: string | null;
  onChange: (mediaId: string | null) => void;
};

export function MediaUploader({ value, onChange }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);

  return (
    <Space direction="vertical">
      {value && (
        <img
          src={mediaUrl(value)}
          alt="Uploaded media"
          style={{ maxWidth: 200, maxHeight: 120, objectFit: "contain", borderRadius: 4 }}
        />
      )}
      <Space>
        <Upload
          accept={ALLOWED_TYPES.join(",")}
          showUploadList={false}
          customRequest={async (options) => {
            const file = options.file as File;
            setUploading(true);
            try {
              if (!ALLOWED_TYPES.includes(file.type)) {
                message.error("Only JPEG, PNG, or WebP images are allowed");
                options.onError?.(new Error("unsupported type"));
                return;
              }
              const processed = await downscaleIfNeeded(file);
              if (processed.size > MAX_BYTES) {
                message.error("Image is larger than 5 MB even after resizing");
                options.onError?.(new Error("too large"));
                return;
              }
              const item = await uploadMedia(processed);
              onChange(item.id);
              options.onSuccess?.(item);
            } catch (e) {
              message.error("Upload failed");
              options.onError?.(e as Error);
            } finally {
              setUploading(false);
            }
          }}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            {value ? "Replace" : "Upload"}
          </Button>
        </Upload>
        {value && (
          <Button danger icon={<DeleteOutlined />} onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </Space>
    </Space>
  );
}
