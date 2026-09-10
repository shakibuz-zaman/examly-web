import { useState } from "react";
import { Form, Input, InputNumber, Modal } from "antd";

export type NewBundleExamModalProps = {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onCreate: (values: { title: string; durationMinutes: number }) => void;
};

// Spec D11: a new bundled exam asks for its two identifying facts; everything else comes
// from emptyDraft() and is editable on the card afterwards. Controlled Modal (statics bypass
// the theme).
export function NewBundleExamModal({ open, busy, onCancel, onCreate }: NewBundleExamModalProps) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [touched, setTouched] = useState(false);
  // Reset AFTER the close animation, not in an effect on `open`: a setState-in-effect here
  // is a cascading render (and the lint rule that names it). Closing is the only moment the
  // form should forget itself — a failed create leaves the modal open with the typing intact.
  const reset = () => {
    setTitle("");
    setDuration(60);
    setTouched(false);
  };

  const titleError = touched && !title.trim() ? "শিরোনাম দিতে হবে" : undefined;
  const submit = () => {
    setTouched(true);
    if (!title.trim()) return;
    onCreate({ title: title.trim(), durationMinutes: duration });
  };

  return (
    <Modal
      title="নতুন পরীক্ষা"
      open={open}
      onCancel={onCancel}
      onOk={submit}
      okText="তৈরি করুন"
      cancelText="বাতিল"
      confirmLoading={busy}
      afterClose={reset}
      destroyOnHidden
    >
      <Form layout="vertical" onFinish={submit}>
        <Form.Item
          label="শিরোনাম"
          required
          validateStatus={titleError ? "error" : undefined}
          help={titleError}
        >
          <Input
            autoFocus
            value={title}
            placeholder="যেমন: ৪৭তম বিসিএস — বাংলা"
            onChange={(e) => setTitle(e.target.value)}
            onPressEnter={submit}
          />
        </Form.Item>
        <Form.Item label="সময় (মিনিট)">
          <InputNumber
            min={0}
            style={{ width: 160 }}
            value={duration}
            onChange={(v) => setDuration(v ?? 0)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
