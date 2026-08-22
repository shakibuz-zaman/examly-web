import { useState } from "react";
import { App, Card, Descriptions, Form, Input, Modal, Skeleton, Typography } from "antd";
import type { AxiosError } from "axios";
import { useMyOrg, useUpdateMyOrg } from "../api/me";
import type { UpdateOrgRequest } from "../api/types";
import { MediaUploader } from "../features/media/MediaUploader";
import { formatDhakaFullDateBn } from "../lib/format";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// Org status is its own two-value wire enum ("active" | "suspended", types.ts:7) — NOT the
// four-key union ContentStatusChip is typed to. «স্থগিত» has no entry there and widening that
// union for one org row would re-open the vocabulary T1 closed, so the two readings are named
// here in T1's classes instead: teal for the ordinary state, coral for the one that BLOCKS
// (a suspended org cannot sell). `Object.hasOwn`, not truthiness — the same guard StatusChip
// and the roster's source map record: `status` is a bare wire string, so a value like
// "constructor" resolves through Object.prototype to a *function*, which React throws on as a
// child. An unread value prints raw under the neutral tint and asserts nothing.
const ORG_STATUS: Record<string, { tone: string; label: string }> = {
  active: { tone: "active", label: "সক্রিয়" },
  suspended: { tone: "danger", label: "স্থগিত" },
};

function OrgStatusChip({ status }: { status: string }) {
  const hit = Object.hasOwn(ORG_STATUS, status) ? ORG_STATUS[status] : null;
  return (
    <span className={`ex-chipstat ex-chipstat--${hit ? hit.tone : "archived"}`}>
      {hit ? hit.label : status}
    </span>
  );
}

export function OrgProfilePage() {
  // AppShell mounts antd's `App` inside the examiner ConfigProvider; the imported statics
  // render into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
  const orgQ = useMyOrg();
  const update = useUpdateMyOrg();
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm<UpdateOrgRequest>();

  const org = orgQ.data;

  const onSave = async (values: UpdateOrgRequest) => {
    try {
      await update.mutateAsync(values);
      message.success("প্রতিষ্ঠানের তথ্য সংরক্ষণ হয়েছে");
      setEditing(false);
    } catch (e) {
      // /api/v1/me/org still answers in English (Task 7 does not cover the org endpoints);
      // this fallback is the only half the page owns, and it is Bengali.
      message.error(serverError(e, "তথ্য সংরক্ষণ করা যায়নি"));
    }
  };

  // The `""` is the API's clear sentinel, not an empty name — `UpdateOrgRequest.logoMediaId`
  // is absent = unchanged, "" = detach. Frozen along with the uploader and the media
  // interceptor behind it; only the two toasts moved.
  const onLogoChange = async (mediaId: string | null) => {
    try {
      await update.mutateAsync({ logoMediaId: mediaId ?? "" });
      message.success(mediaId ? "লোগো হালনাগাদ হয়েছে" : "লোগো সরানো হয়েছে");
    } catch (e) {
      message.error(serverError(e, "লোগো হালনাগাদ করা যায়নি"));
    }
  };

  return (
    <>
      <PageHeader
        title="প্রতিষ্ঠান"
        // Names WHICH org the rows below describe — the breadcrumb only says
        // «প্রতিষ্ঠান / প্রোফাইল», and nothing else above the fold carries the name.
        summary={org?.name}
        actions={
          <PillButton
            variant="primary"
            // Nothing loaded means nothing to prefill; the PATCH would go out with an empty
            // form against an org this account may not even have.
            disabled={org == null}
            onClick={() => {
              if (!org) return;
              form.setFieldsValue({
                name: org.name,
                contactEmail: org.contactEmail,
                description: org.description ?? undefined,
              });
              setEditing(true);
            }}
          >
            তথ্য সম্পাদনা
          </PillButton>
        }
      />

      {/* The house three-state shape, with one difference from the roster's: there is no
          `!notFound` gate on the strip, because a 404 here never reaches `error` at all —
          `useMyOrg` swallows it into `data: null` (api/me.ts) and also stops retrying it. So
          "this account has no org" is already a SUCCESSFUL answer and lands in its own dead-end
          branch below; anything that did fail is a real transport error and is worth retrying.
          Reachable for a platform_admin who types /org/profile: RequireOnboarded only bounces
          examiners to /onboarding, so an admin lands here with a 404 and must be told why. */}
      {orgQ.isPending ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : org == null ? (
        orgQ.isError ? (
          <RetryNotice tone="panel" busy={orgQ.isFetching} onRetry={() => void orgQ.refetch()} />
        ) : (
          <Card>
            <Typography.Text type="secondary">
              এই অ্যাকাউন্টের সঙ্গে কোনো প্রতিষ্ঠান যুক্ত নেই।
            </Typography.Text>
          </Card>
        )
      ) : (
        <>
          {orgQ.isError && (
            <RetryNotice tone="strip" busy={orgQ.isFetching} onRetry={() => void orgQ.refetch()} />
          )}
          <Card style={{ maxWidth: 800 }}>
            <Descriptions
              column={1}
              bordered
              size="middle"
              // `items`, not <Descriptions.Item> children: antd 6 marks the children form
              // deprecated (descriptions/index.d.ts:50). Same rows, same order.
              items={[
                { key: "name", label: "নাম", children: org.name },
                {
                  key: "email",
                  label: "যোগাযোগের ইমেইল",
                  // An email address is an identifier — Latin, ratified.
                  children: org.contactEmail,
                },
                {
                  key: "description",
                  label: "বিবরণ",
                  // `||`, not `??`: the API accepts an empty description, and a blank string
                  // would render as an empty row that reads as a layout bug.
                  children: org.description?.trim() || "—",
                },
                {
                  key: "logo",
                  label: "লোগো",
                  // Frozen: the uploader and the media interceptor behind it are untouched, so
                  // its own button copy is still English until features/media is translated.
                  children: (
                    <MediaUploader
                      value={org.logoMediaId ?? null}
                      onChange={(mediaId) => void onLogoChange(mediaId)}
                    />
                  ),
                },
                { key: "status", label: "স্ট্যাটাস", children: <OrgStatusChip status={org.status} /> },
                {
                  key: "currency",
                  label: "মুদ্রা",
                  // "BDT" — an ISO code, i.e. an identifier. Not translated, not digit-mapped.
                  children: org.defaultCurrency,
                },
                {
                  key: "created",
                  label: "তৈরি হয়েছে",
                  // Was `toLocaleString()` — the reader's own locale AND timezone, so an
                  // examiner abroad read a different day than the org was created on.
                  // Dhaka-pinned Bengali now, with the year (see lib/format).
                  children: formatDhakaFullDateBn(org.createdAt) || "—",
                },
              ]}
            />
          </Card>
        </>
      )}

      {/* `forceRender`, matching AdminCategoriesPage / AdminQbankPage: the «তথ্য সম্পাদনা» button
          seeds this form with `setFieldsValue` BEFORE it opens the modal, and antd does not mount
          a dialog's children until its first open, so that first seed lands on a `useForm`
          instance no `<Form>` has hooked yet. @rc-component/form answers that with a next-tick
          check that logs "Instance created by `useForm` is not connected to any Form element" if
          the instance is STILL unhooked when the timeout runs — today it never is, because the
          `setEditing(true)` on the next line mounts the Form in the same task. Keeping the
          children mounted removes the race rather than relying on that ordering. Behaviour is
          unchanged either way: the form store holds the seeded values across the mount. */}
      <Modal
        open={editing}
        forceRender
        title="প্রতিষ্ঠানের তথ্য সম্পাদনা"
        onCancel={() => setEditing(false)}
        onOk={() => form.submit()}
        okText="সংরক্ষণ করুন"
        cancelText="বাতিল"
        confirmLoading={update.isPending}
      >
        <Form<UpdateOrgRequest> form={form} layout="vertical" onFinish={onSave}>
          {/* The length caps are the server's (OrgEndpoints), split out of the single
              `{ required: true, max: 120 }` rule they used to share so each failure can say
              which one it is — one rule can carry only one message. */}
          <Form.Item
            name="name"
            label="নাম"
            rules={[
              { required: true, message: "প্রতিষ্ঠানের নাম দিন" },
              { max: 120, message: "নাম সর্বোচ্চ ১২০ অক্ষরের হতে পারে" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="contactEmail"
            label="যোগাযোগের ইমেইল"
            rules={[
              { required: true, message: "যোগাযোগের ইমেইল দিন" },
              { type: "email", message: "সঠিক ইমেইল ঠিকানা দিন" },
              { max: 200, message: "ইমেইল সর্বোচ্চ ২০০ অক্ষরের হতে পারে" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="বিবরণ"
            rules={[{ max: 2000, message: "বিবরণ সর্বোচ্চ ২০০০ অক্ষরের হতে পারে" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
