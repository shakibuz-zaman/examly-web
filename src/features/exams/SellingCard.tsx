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
  { value: "public", label: "পাবলিক — স্টোরফ্রন্টে সবার জন্য তালিকাভুক্ত" },
  { value: "private", label: "প্রাইভেট — শুধু সরাসরি আমন্ত্রণ বা সিট কোডে" },
  { value: "both", label: "দুটোই — স্টোরফ্রন্টে থাকবে, আমন্ত্রণেও শেয়ার করা যাবে" },
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
  // `isPending`, not `isLoading` (house rule). Safe here even though `useListing` carries an
  // `enabled` guard — a disabled query stays pending forever, but both call sites (this exam
  // builder and the model-test builder) render the card only once they hold a saved id.
  const { data: listing, isPending, isError, error } = useListing(productType, productId);
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

  if (isPending) {
    return (
      <Card title="বিক্রয়" style={{ marginTop: 16 }}>
        <Spin />
      </Card>
    );
  }

  // A hard (non-404) error — surface it rather than silently show editable defaults.
  if (isError && !notFound) {
    return (
      <Card title="বিক্রয়" style={{ marginTop: 16 }}>
        <Typography.Text type="danger">
          {serverError(error, "বিক্রয় সেটিংস লোড করা যায়নি।")}
        </Typography.Text>
      </Card>
    );
  }

  const windowed = listing?.windowStartUtc != null || hasWindowedContent;
  // Archive is a one-way ACTION offered only when the server listing is already live;
  // the all-windows-ended check is server-side and surfaces as a 409 verbatim.
  const canArchive = listing?.mode === "live";

  const modeOptions = [
    { value: "open", label: "ওপেন — যেকোনো সময় দেওয়া যায়, উইন্ডো নেই" },
    { value: "live", label: "লাইভ — নির্ধারিত সময়ে (উইন্ডো লাগবে)" },
    ...(form.mode === "archive"
      ? [{ value: "archive", label: "আর্কাইভ — প্র্যাকটিস রিপ্লে" }]
      : []),
  ];

  const onSave = async (override?: Partial<SaveListingRequest>) => {
    const body = { ...form, ...override };
    try {
      await save.mutateAsync({ productType, productId, body });
      setForm(body);
      message.success("বিক্রয় সেটিংস সংরক্ষিত হয়েছে");
    } catch (e) {
      message.error(serverError(e, "সংরক্ষণ করা যায়নি"));
    }
  };

  return (
    <Card title="বিক্রয়" style={{ marginTop: 16 }}>
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Typography.Text strong>দৃশ্যমানতা</Typography.Text>
          <Select
            style={{ width: "100%" }}
            value={form.visibility}
            onChange={(v) => setForm((f) => ({ ...f, visibility: v }))}
            options={VISIBILITY_OPTIONS}
          />
        </div>

        <div>
          <Typography.Text strong>মূল্য</Typography.Text>
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            prefix="৳"
            value={form.priceBdt}
            onChange={(v) => setForm((f) => ({ ...f, priceBdt: v ?? 0 }))}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ০ = ফ্রি · পেইড হলে সর্বনিম্ন ৳২০
          </Typography.Text>
        </div>

        <div>
          <Typography.Text strong>মোড</Typography.Text>
          <Select
            style={{ width: "100%" }}
            value={form.mode}
            onChange={(v) => setForm((f) => ({ ...f, mode: v }))}
            options={modeOptions}
          />
          {form.mode === "live" && !windowed && (
            <Typography.Text type="warning" style={{ fontSize: 12, display: "block" }}>
              লাইভ মোডের জন্য কনটেন্টে নির্ধারিত সময়সীমা থাকতে হবে।
            </Typography.Text>
          )}
        </div>

        <Space>
          <Switch
            checked={form.status === "listed"}
            onChange={(on) => setForm((f) => ({ ...f, status: on ? "listed" : "delisted" }))}
          />
          <Typography.Text>স্টোরফ্রন্টে দেখা যাবে</Typography.Text>
        </Space>

        <Button type="primary" loading={save.isPending} onClick={() => void onSave()}>
          বিক্রয় সেটিংস সংরক্ষণ
        </Button>

        {canArchive && (
          <>
            <Divider style={{ margin: "4px 0" }} />
            <Space orientation="vertical" size={4} style={{ width: "100%" }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                লাইভ রান শেষ — নতুন দামে প্র্যাকটিসের জন্য আবার খুলুন।
              </Typography.Text>
              <Button
                loading={save.isPending}
                onClick={() => void onSave({ mode: "archive" })}
              >
                আর্কাইভে সরিয়ে নতুন দাম দিন
              </Button>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
}
