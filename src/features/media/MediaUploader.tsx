import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Space, Upload, message } from "antd";
import { useState } from "react";
import { mediaUrl, uploadMedia } from "../../api/media";
import { ALLOWED_IMAGE_TYPES, MAX_BYTES, downscaleIfNeeded } from "../../lib/imageProcessing";

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
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          showUploadList={false}
          customRequest={async (options) => {
            const file = options.file as File;
            setUploading(true);
            try {
              if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
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
