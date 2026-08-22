// SHARED SURFACE: /taxonomy (examiner) and /admin/taxonomy (platform_admin) are both this
// component. Its body — tables, modals, drawer, buttons, toasts, validation copy — is Bengali in
// BOTH modes, so the admin page reads Bengali inside an otherwise-English admin area: that leak
// is accepted by spec D6 (plan note P2). Do not fork the file or add a locale prop to undo it.
// The ONE exception is the PageHeader title + summary pair, which spec §2 assigns to English on
// the admin surface: D6's accepted-leak clause covers only strings with no cheap split, and the
// header already had a `mode === "admin"` fork, so it is branched rather than leaked. That fork
// is the whole exception — do not grow it into a general per-mode copy split.
import {
  App, Button, Card, Drawer, Form, Input, Modal, Popconfirm, Select, Skeleton, Space, Table, Typography,
} from "antd";
import { useState } from "react";
import {
  useCreateSubject, useCreateTopic, useDeleteSubject, useDeleteTopic,
  useSubjects, useTopics, useUpdateSubject, useUpdateTopic,
} from "../../api/taxonomy";
import type { BilingualText, SubjectResponse, TopicResponse } from "../../api/types";
import { bnNum } from "../../lib/bn";
import { count } from "../../lib/format";
import { PageHeader } from "../../ui/PageHeader";
import { PillButton } from "../../ui/PillButton";
import { RetryNotice } from "../../ui/RetryNotice";
import { ContentStatusChip } from "../../ui/StatusChip";

type Mode = "examiner" | "admin";

type SubjectFormValues = { nameEn?: string; nameBn?: string; slug?: string };
type TopicFormValues = { nameEn?: string; nameBn?: string; slug?: string; parentTopicId?: string | null };

function toBilingual(v: { nameEn?: string; nameBn?: string }): BilingualText {
  const out: BilingualText = {};
  if (v.nameEn?.trim()) out.en = v.nameEn.trim();
  if (v.nameBn?.trim()) out.bn = v.nameBn.trim();
  return out;
}

function serverError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

// Bengali-first, exactly as `bilingualLabel` reads a taxonomy node elsewhere; `||` for its
// reason too — the API's validator requires only ONE half to be non-blank and never normalises
// the other, so `{ bn: "", en: "History" }` is a shape another client can write and `??` would
// keep the `""`. The slug is the last resort rather than «—»: it is the node's own identifier
// and always present, so the drawer title can never come up empty.
function nodeLabel(name: BilingualText, slug: string): string {
  return name.bn?.trim() || name.en?.trim() || slug;
}

// «গ্লোবাল» = the platform's shared tree, «প্রতিষ্ঠান» = this org's own additions. It was a
// `<Tag color="blue|purple">` — antd presets, which sit outside the token module entirely and
// so ignore both themes. It does NOT become a chip: scope is provenance, not state, exactly
// like the roster's «উৎস» column, and this row already carries a real state chip one column
// over. A first draft did make it a chip and the two collided outright — «প্রতিষ্ঠান» on
// `--anytime` and «সক্রিয়» on `--active` resolve to the SAME two tokens (teal-tint + teal-ink,
// measured live as rgb(18,51,46) on rgb(127,208,194) in dark), so two adjacent cells rendered
// identical pills carrying different facts. Reaching for a free hue instead would have aliased
// a third vocabulary; secondary text says the quieter thing truthfully and adds nothing to the
// chip namespace. No unknown branch: `scope` is a closed two-value union on the wire
// (types.ts:29/:42) and `canEdit` already keys off it.
function scopeLabel(scope: "global" | "org"): string {
  return scope === "global" ? "গ্লোবাল" : "প্রতিষ্ঠান";
}

export function TaxonomyManager({ mode }: { mode: Mode }) {
  // AppShell mounts antd's `App` inside the examiner/admin ConfigProvider; the imported
  // statics render into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
  const subjectsQ = useSubjects(mode);
  const createSubj = useCreateSubject(mode);
  const updateSubj = useUpdateSubject(mode);
  const deleteSubj = useDeleteSubject(mode);

  const [subjModalOpen, setSubjModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectResponse | null>(null);
  const [subjForm] = Form.useForm<SubjectFormValues>();

  const [drawerSubject, setDrawerSubject] = useState<SubjectResponse | null>(null);

  function canEdit(scope: "global" | "org") {
    return mode === "admin" ? scope === "global" : scope === "org";
  }

  async function onSubjectSubmit(values: SubjectFormValues) {
    const body = { name: toBilingual(values), slug: values.slug?.trim() || undefined };
    try {
      if (editingSubject) {
        await updateSubj.mutateAsync({ id: editingSubject.id, body });
        message.success("বিষয় হালনাগাদ হয়েছে");
      } else {
        await createSubj.mutateAsync(body);
        message.success("বিষয় যোগ হয়েছে");
      }
      setSubjModalOpen(false);
      setEditingSubject(null);
      subjForm.resetFields();
    } catch (e) {
      // The SAVE-path taxonomy errors still answer in English — Task 7 translated only the two
      // examiner delete-conflict lines (ExaminerTaxonomyEndpoints), which the Popconfirms below
      // surface; slug-collision and parent-validation sentences are post-series work. The
      // fallback here is the half this component owns.
      message.error(serverError(e, "সংরক্ষণ করা যায়নি"));
    }
  }

  const subjects = subjectsQ.data;

  return (
    <>
      <PageHeader
        // The header the two thin wrappers (TaxonomyPage / AdminTaxonomyPage) would otherwise
        // duplicate: only this component holds the subject list, so the count summary has to be
        // rendered from here — a wrapper asking for it would mean a second subscription.
        //
        // Title AND summary branch together, per spec §2: the admin page's own chrome is English
        // (D1), so its count goes with it — Western digits, which is also what D8 asks of a
        // dense numeric run. The examiner half is Bengali prose and takes bnNum. The examiner
        // title matches its sidebar entry verbatim (examinerNav.ts:49); the admin sidebar entry
        // stays «গ্লোবাল ট্যাক্সোনমি» because nav LABELS are Bengali on both surfaces (D1/D2) —
        // it is page bodies and page headers that are English on admin, and this is the header.
        title={mode === "admin" ? "Global Taxonomy" : "ট্যাক্সোনমি"}
        summary={
          subjects
            ? mode === "admin"
              ? count(subjects.length, "subject", "subjects")
              : `${bnNum(subjects.length)}টি বিষয়`
            : undefined
        }
        actions={
          <PillButton
            variant="primary"
            onClick={() => {
              setEditingSubject(null);
              subjForm.resetFields();
              setSubjModalOpen(true);
            }}
          >
            {mode === "admin" ? "গ্লোবাল বিষয় যোগ করুন" : "বিষয় যোগ করুন"}
          </PillButton>
        }
      />

      {/* House three-state. The branch keys on `!subjects`, never `isError`: TanStack keeps
          `data` through a same-key refetch failure, so a list we already hold stays on screen
          under the strip instead of being thrown away for a panel that says we have nothing.
          It also replaces the table's own `loading` prop, whose empty state said «কোনও ডেটা
          নেই» (antd's bn_BD default) after a FAILED fetch — a lie about the tree. */}
      {subjectsQ.isPending ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : subjects == null ? (
        <RetryNotice
          tone="panel"
          busy={subjectsQ.isFetching}
          onRetry={() => void subjectsQ.refetch()}
        />
      ) : (
        <>
          {subjectsQ.isError && (
            <RetryNotice
              tone="strip"
              busy={subjectsQ.isFetching}
              onRetry={() => void subjectsQ.refetch()}
            />
          )}
          <Card>
            <Table<SubjectResponse>
              rowKey="id"
              dataSource={subjects}
              pagination={{ pageSize: 20 }}
              scroll={{ x: true }}
              locale={{
                emptyText:
                  mode === "admin"
                    ? "এখনো কোনো গ্লোবাল বিষয় নেই — উপরে বিষয় যোগ করুন।"
                    : "এখনো কোনো বিষয় নেই — উপরে বিষয় যোগ করুন।",
              }}
              columns={[
                // Both name columns stay, in their original order: this is a bilingual
                // authoring grid where the two halves are separate editable fields, not a
                // surface that picks one label to show (that rule is `nodeLabel`, used for the
                // drawer title and the parent picker below).
                { title: "নাম (ইংরেজি)", dataIndex: ["name", "en"], render: (v?: string) => v ?? "—" },
                { title: "নাম (বাংলা)", dataIndex: ["name", "bn"], render: (v?: string) => v ?? "—" },
                // A slug is an identifier — Latin, ratified.
                { title: "স্লাগ", dataIndex: "slug" },
                {
                  title: "পরিধি", dataIndex: "scope",
                  render: (s: "global" | "org") =>
                    <Typography.Text type="secondary">{scopeLabel(s)}</Typography.Text>,
                },
                {
                  title: "স্ট্যাটাস", dataIndex: "status",
                  // Was the raw wire word. `SubjectResponse.status` is "active" | "archived",
                  // both of which the shared content-status vocabulary already names.
                  render: (s: "active" | "archived") => <ContentStatusChip status={s} />,
                },
                {
                  title: "অ্যাকশন", key: "actions",
                  render: (_, record) => (
                    <Space>
                      <Button size="small" onClick={() => setDrawerSubject(record)}>টপিক</Button>
                      {canEdit(record.scope) && (
                        <>
                          <Button size="small" onClick={() => {
                            setEditingSubject(record);
                            subjForm.setFieldsValue({
                              nameEn: record.name.en, nameBn: record.name.bn, slug: record.slug,
                            });
                            setSubjModalOpen(true);
                          }}>সম্পাদনা</Button>
                          <Popconfirm
                            title="বিষয়টি মুছবেন?"
                            description="কোনো টপিক না থাকলেই কেবল মোছা যাবে।"
                            okText="মুছুন"
                            cancelText="না"
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => {
                              try {
                                await deleteSubj.mutateAsync(record.id);
                                message.success("বিষয় মুছে ফেলা হয়েছে");
                              } catch (e) {
                                message.error(serverError(e, "মোছা যায়নি"));
                              }
                            }}
                          >
                            <Button size="small" danger>মুছুন</Button>
                          </Popconfirm>
                        </>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}

      {/* `forceRender`, matching AdminCategoriesPage / AdminQbankPage: both entry points seed
          this form before the modal opens — «সম্পাদনা» calls `setFieldsValue`, the header's add
          button calls `resetFields` — and antd does not mount a dialog's children until its
          first open, so that seed lands on a `useForm` instance no `<Form>` has hooked yet.
          @rc-component/form checks on the next tick and logs "Instance created by `useForm` is
          not connected to any Form element" if it is still unhooked then; keeping the children
          mounted removes the race instead of relying on the open landing in the same task.
          Behaviour is unchanged: the form store holds the seeded values across the mount. */}
      <Modal
        open={subjModalOpen}
        forceRender
        title={editingSubject ? "বিষয় সম্পাদনা" : "নতুন বিষয়"}
        onCancel={() => setSubjModalOpen(false)}
        onOk={() => subjForm.submit()}
        okText="সংরক্ষণ করুন"
        cancelText="বাতিল"
        confirmLoading={createSubj.isPending || updateSubj.isPending}
      >
        <Form<SubjectFormValues> form={subjForm} layout="vertical" onFinish={onSubjectSubmit}>
          {/* The two name placeholders are each written in the language of their own field —
              an English example under «নাম (ইংরেজি)» is the useful hint, not a Bengali one. */}
          <Form.Item name="nameEn" label="নাম (ইংরেজি)">
            <Input placeholder="যেমন Bangladesh Affairs" />
          </Form.Item>
          <Form.Item name="nameBn" label="নাম (বাংলা)">
            <Input placeholder="যেমন বাংলাদেশ বিষয়াবলী" />
          </Form.Item>
          <Form.Item name="slug" label="স্লাগ (ঐচ্ছিক — ফাঁকা রাখলে ইংরেজি নাম থেকে তৈরি হবে)">
            <Input placeholder="bangladesh-affairs" />
          </Form.Item>
        </Form>
      </Modal>

      <TopicsDrawer
        mode={mode}
        subject={drawerSubject}
        onClose={() => setDrawerSubject(null)}
        canEditScope={canEdit}
      />
    </>
  );
}

function TopicsDrawer({
  mode, subject, onClose, canEditScope,
}: {
  mode: Mode;
  subject: SubjectResponse | null;
  onClose: () => void;
  canEditScope: (s: "global" | "org") => boolean;
}) {
  const { message } = App.useApp();
  const topicsQ = useTopics(mode, subject?.id ?? null);
  const createTopic = useCreateTopic(mode, subject?.id ?? "");
  const updateTopic = useUpdateTopic(mode, subject?.id ?? "");
  const deleteTopic = useDeleteTopic(mode, subject?.id ?? "");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicResponse | null>(null);
  const [form] = Form.useForm<TopicFormValues>();

  if (!subject) return null;

  const subjectIsEditable = canEditScope(subject.scope);

  const allTopics = topicsQ.data ?? [];
  const topLevel = allTopics.filter((t) => !t.parentTopicId);
  const byParent = new Map<string, TopicResponse[]>();
  for (const t of allTopics) {
    if (!t.parentTopicId) continue;
    byParent.set(t.parentTopicId, [...(byParent.get(t.parentTopicId) ?? []), t]);
  }
  const treeData = topLevel.map((t) => {
    const children = byParent.get(t.id);
    return children ? { ...t, children } : t;
  });

  async function onSubmit(values: TopicFormValues) {
    const body = {
      name: toBilingual(values),
      slug: values.slug?.trim() || undefined,
      // create: null = top-level; update: "" clears, id sets (API sentinel contract)
      parentTopicId: editingTopic ? (values.parentTopicId ?? "") : (values.parentTopicId ?? null),
    };
    try {
      if (editingTopic) {
        await updateTopic.mutateAsync({ id: editingTopic.id, body });
        message.success("টপিক হালনাগাদ হয়েছে");
      } else {
        await createTopic.mutateAsync(body);
        message.success("টপিক যোগ হয়েছে");
      }
      setModalOpen(false);
      setEditingTopic(null);
      form.resetFields();
    } catch (e) {
      message.error(serverError(e, "সংরক্ষণ করা যায়নি"));
    }
  }

  return (
    <Drawer
      open={!!subject}
      onClose={onClose}
      title={`টপিক — ${nodeLabel(subject.name, subject.slug)}`}
      size={640}
      extra={subjectIsEditable && (
        <Button type="primary" onClick={() => {
          setEditingTopic(null); form.resetFields(); setModalOpen(true);
        }}>টপিক যোগ করুন</Button>
      )}
    >
      {/* Same three-state rule as the subject list above, for the same reason. */}
      {topicsQ.isPending ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : topicsQ.data == null ? (
        <RetryNotice
          tone="panel"
          framed={false}
          busy={topicsQ.isFetching}
          onRetry={() => void topicsQ.refetch()}
        />
      ) : (
        <>
          {topicsQ.isError && (
            <RetryNotice
              tone="strip"
              busy={topicsQ.isFetching}
              onRetry={() => void topicsQ.refetch()}
            />
          )}
          <Table<TopicResponse>
            rowKey="id"
            size="small"
            dataSource={treeData}
            pagination={false}
            // Parity with the subject table: five columns plus a two-button action cell do not
            // fit the 640px Drawer, so the overflow scrolls inside the table rather than pushing
            // the drawer body sideways.
            scroll={{ x: true }}
            expandable={{ defaultExpandAllRows: true }}
            locale={{
              emptyText: subjectIsEditable
                ? "এই বিষয়ে এখনো কোনো টপিক নেই — উপরে টপিক যোগ করুন।"
                : "এই বিষয়ে এখনো কোনো টপিক নেই।",
            }}
            columns={[
              { title: "নাম (ইংরেজি)", dataIndex: ["name", "en"], render: (v?: string) => v ?? "—" },
              { title: "নাম (বাংলা)", dataIndex: ["name", "bn"], render: (v?: string) => v ?? "—" },
              { title: "স্লাগ", dataIndex: "slug" },
              {
                title: "পরিধি", dataIndex: "scope",
                render: (s: "global" | "org") =>
                  <Typography.Text type="secondary">{scopeLabel(s)}</Typography.Text>,
              },
              {
                title: "অ্যাকশন", key: "actions",
                render: (_, record) =>
                  canEditScope(record.scope) && (
                    <Space>
                      <Button size="small" onClick={() => {
                        setEditingTopic(record);
                        form.setFieldsValue({
                          nameEn: record.name.en, nameBn: record.name.bn, slug: record.slug,
                          parentTopicId: record.parentTopicId ?? undefined,
                        });
                        setModalOpen(true);
                      }}>সম্পাদনা</Button>
                      <Popconfirm
                        title="টপিকটি মুছবেন?"
                        description="কোনো সাব-টপিক না থাকলেই কেবল মোছা যাবে।"
                        okText="মুছুন"
                        cancelText="না"
                        okButtonProps={{ danger: true }}
                        onConfirm={async () => {
                          try {
                            await deleteTopic.mutateAsync(record.id);
                            message.success("টপিক মুছে ফেলা হয়েছে");
                          } catch (e) {
                            message.error(serverError(e, "মোছা যায়নি"));
                          }
                        }}
                      >
                        <Button size="small" danger>মুছুন</Button>
                      </Popconfirm>
                    </Space>
                  ),
              },
            ]}
          />
        </>
      )}

      {/* `forceRender` for the subject modal's reason — the row's «সম্পাদনা» seeds this form
          with `setFieldsValue`, and the drawer's add button with `resetFields`, both before this
          modal's first open. */}
      <Modal
        open={modalOpen}
        forceRender
        title={editingTopic ? "টপিক সম্পাদনা" : "নতুন টপিক"}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="সংরক্ষণ করুন"
        cancelText="বাতিল"
        confirmLoading={createTopic.isPending || updateTopic.isPending}
      >
        <Form<TopicFormValues> form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="nameEn" label="নাম (ইংরেজি)">
            <Input />
          </Form.Item>
          <Form.Item name="nameBn" label="নাম (বাংলা)">
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="স্লাগ (ঐচ্ছিক)">
            <Input />
          </Form.Item>
          <Form.Item name="parentTopicId" label="প্যারেন্ট টপিক (দিলে এটি সাব-টপিক হবে)">
            <Select
              allowClear
              placeholder="নেই — টপ-লেভেল টপিক"
              options={topLevel
                .filter((t) => t.id !== editingTopic?.id)
                .map((t) => ({
                  value: t.id,
                  label: t.name.bn && t.name.en ? `${t.name.bn} — ${t.name.en}` : nodeLabel(t.name, t.slug),
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
