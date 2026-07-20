import { useEffect, useRef, useState } from "react";
import {
  Button, Card, Divider, InputNumber, Select, Space, Spin, Switch, Typography, message,
} from "antd";
import type { AxiosError } from "axios";
import { useListing, useSaveListing } from "../../api/commerce";
import type { SaveListingRequest } from "../../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public — listed in the storefront for anyone" },
  { value: "private", label: "Private — reachable only by direct invite / seat code" },
  { value: "both", label: "Both — in the storefront and shareable by invite" },
];

const DEFAULT_FORM: SaveListingRequest = {
  priceBdt: 0,
  visibility: "public",
  mode: "open",
  status: "listed",
};

type Props = {
  productType: string;
  productId: string;
  // Best-effort hint (server is authoritative): does the content carry a scheduled window?
  hasWindowedContent: boolean;
};

export function SellingCard({ productType, productId, hasWindowedContent }: Props) {
  const { data: listing, isLoading, isError, error } = useListing(productType, productId);
  const save = useSaveListing();

  // 404 = no listing yet (draft never published / never configured) — start from defaults.
  const notFound = isError && (error as AxiosError)?.response?.status === 404;

  const [form, setForm] = useState<SaveListingRequest>(DEFAULT_FORM);
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (listing && loadedRef.current !== listing.id) {
      loadedRef.current = listing.id;
      setForm({
        priceBdt: listing.priceBdt,
        visibility: listing.visibility,
        mode: listing.mode,
        status: listing.status,
      });
    }
  }, [listing]);

  if (isLoading) {
    return (
      <Card title="Selling" style={{ marginTop: 16 }}>
        <Spin />
      </Card>
    );
  }

  // A hard (non-404) error — surface it rather than silently show editable defaults.
  if (isError && !notFound) {
    return (
      <Card title="Selling" style={{ marginTop: 16 }}>
        <Typography.Text type="danger">
          {serverError(error, "Could not load selling settings.")}
        </Typography.Text>
      </Card>
    );
  }

  const windowed = listing?.windowStartUtc != null || hasWindowedContent;
  // Archive is a one-way ACTION offered only when the server listing is already live;
  // the all-windows-ended check is server-side and surfaces as a 409 verbatim.
  const canArchive = listing?.mode === "live";

  const modeOptions = [
    { value: "open", label: "Open — take anytime, no window" },
    { value: "live", label: "Live — scheduled run (needs a window)" },
    ...(form.mode === "archive"
      ? [{ value: "archive", label: "Archive — practice replay" }]
      : []),
  ];

  const onSave = async (override?: Partial<SaveListingRequest>) => {
    const body = { ...form, ...override };
    try {
      await save.mutateAsync({ productType, productId, body });
      setForm(body);
      message.success("Selling settings saved");
    } catch (e) {
      message.error(serverError(e, "Save failed"));
    }
  };

  return (
    <Card title="Selling" style={{ marginTop: 16 }}>
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Typography.Text strong>Visibility</Typography.Text>
          <Select
            style={{ width: "100%" }}
            value={form.visibility}
            onChange={(v) => setForm((f) => ({ ...f, visibility: v }))}
            options={VISIBILITY_OPTIONS}
          />
        </div>

        <div>
          <Typography.Text strong>Price</Typography.Text>
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            prefix="৳"
            value={form.priceBdt}
            onChange={(v) => setForm((f) => ({ ...f, priceBdt: v ?? 0 }))}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            0 = free · paid minimum ৳20
          </Typography.Text>
        </div>

        <div>
          <Typography.Text strong>Mode</Typography.Text>
          <Select
            style={{ width: "100%" }}
            value={form.mode}
            onChange={(v) => setForm((f) => ({ ...f, mode: v }))}
            options={modeOptions}
          />
          {form.mode === "live" && !windowed && (
            <Typography.Text type="warning" style={{ fontSize: 12, display: "block" }}>
              Live mode needs a scheduled window on the content.
            </Typography.Text>
          )}
        </div>

        <Space>
          <Switch
            checked={form.status === "listed"}
            onChange={(on) => setForm((f) => ({ ...f, status: on ? "listed" : "delisted" }))}
          />
          <Typography.Text>Visible in the storefront</Typography.Text>
        </Space>

        <Button type="primary" loading={save.isPending} onClick={() => void onSave()}>
          Save selling settings
        </Button>

        {canArchive && (
          <>
            <Divider style={{ margin: "4px 0" }} />
            <Space orientation="vertical" size={4} style={{ width: "100%" }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                The live run is over — reopen it for practice at a new price.
              </Typography.Text>
              <Button
                loading={save.isPending}
                onClick={() => void onSave({ mode: "archive" })}
              >
                Move to Archive &amp; reprice
              </Button>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
}
