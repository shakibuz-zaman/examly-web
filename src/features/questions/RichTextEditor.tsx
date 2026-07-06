import {
  BoldOutlined,
  FunctionOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  PictureOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Space, Tooltip, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Mathematics } from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";
import { mediaUrl, uploadMedia } from "../../api/media";
import { ALLOWED_IMAGE_TYPES, MAX_BYTES, downscaleIfNeeded } from "../../lib/imageProcessing";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
};

// The single interceptor path: toolbar picker, paste, and drop all land here.
// Downscale -> upload via media API -> insert <img src="{mediaUrl(id)}">.
// NEVER lets a base64/data-URI image into the document.
async function uploadAndInsert(editor: Editor, files: File[]) {
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      message.error("Only JPEG, PNG, or WebP images are allowed");
      continue;
    }
    const hideLoading = message.loading("Uploading image…", 0);
    try {
      const processed = await downscaleIfNeeded(file);
      if (processed.size > MAX_BYTES) {
        message.error("Image is larger than 5 MB even after resizing");
        continue;
      }
      const item = await uploadMedia(processed);
      editor.chain().focus().setImage({ src: mediaUrl(item.id) }).run();
    } catch {
      message.error("Image upload failed");
    } finally {
      hideLoading();
    }
  }
}

function imageFiles(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? []).filter((f) => f.type.startsWith("image/"));
}

export function RichTextEditor({ value, onChange, minHeight = 80 }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mathOpen, setMathOpen] = useState(false);
  const [latex, setLatex] = useState("");

  // editorProps closures are created before useEditor returns, so they must
  // reach the editor through a ref — capturing the `editor` const directly
  // would capture null from the first render.
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      // Keep the schema aligned with the server allowlist: no headings, quotes, code, or links.
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: false,
      }),
      Image.configure({ inline: true }),
      Subscript,
      Superscript,
      Mathematics,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      handlePaste: (_view, event) => {
        const target = editorRef.current;
        const files = imageFiles(event.clipboardData);
        if (!target || files.length === 0) return false;
        event.preventDefault();
        void uploadAndInsert(target, files);
        return true; // block ProseMirror's default (base64) insertion
      },
      handleDrop: (_view, event) => {
        const target = editorRef.current;
        const files = imageFiles(event.dataTransfer);
        if (!target || files.length === 0) return false;
        event.preventDefault();
        void uploadAndInsert(target, files);
        return true;
      },
    },
  });

  editorRef.current = editor;

  // Controlled-component sync: reset content only when the external value
  // genuinely differs (e.g. form.reset after loading a question).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 6 }}>
      <Space wrap size={4} style={{ padding: 4, borderBottom: "1px solid #f0f0f0", width: "100%" }}>
        <Tooltip title="Bold">
          <Button
            size="small"
            type={editor.isActive("bold") ? "primary" : "text"}
            icon={<BoldOutlined />}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
        </Tooltip>
        <Tooltip title="Italic">
          <Button
            size="small"
            type={editor.isActive("italic") ? "primary" : "text"}
            icon={<ItalicOutlined />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
        </Tooltip>
        <Tooltip title="Underline">
          <Button
            size="small"
            type={editor.isActive("underline") ? "primary" : "text"}
            icon={<UnderlineOutlined />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
        </Tooltip>
        <Tooltip title="Strikethrough">
          <Button
            size="small"
            type={editor.isActive("strike") ? "primary" : "text"}
            icon={<StrikethroughOutlined />}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
        </Tooltip>
        <Tooltip title="Subscript">
          <Button
            size="small"
            type={editor.isActive("subscript") ? "primary" : "text"}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            x₂
          </Button>
        </Tooltip>
        <Tooltip title="Superscript">
          <Button
            size="small"
            type={editor.isActive("superscript") ? "primary" : "text"}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            x²
          </Button>
        </Tooltip>
        <Tooltip title="Bullet list">
          <Button
            size="small"
            type={editor.isActive("bulletList") ? "primary" : "text"}
            icon={<UnorderedListOutlined />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
        </Tooltip>
        <Tooltip title="Numbered list">
          <Button
            size="small"
            type={editor.isActive("orderedList") ? "primary" : "text"}
            icon={<OrderedListOutlined />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        </Tooltip>
        <Tooltip title="Insert image">
          <Button
            size="small"
            type="text"
            icon={<PictureOutlined />}
            onClick={() => fileInputRef.current?.click()}
          />
        </Tooltip>
        <Tooltip title="Insert math (LaTeX)">
          <Button
            size="small"
            type="text"
            icon={<FunctionOutlined />}
            onClick={() => {
              setLatex("");
              setMathOpen(true);
            }}
          />
        </Tooltip>
      </Space>

      <div style={{ padding: 8, minHeight }} className="rich-text-content">
        <EditorContent editor={editor} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void uploadAndInsert(editor, files);
        }}
      />

      <Modal
        title="Insert math"
        open={mathOpen}
        onCancel={() => setMathOpen(false)}
        onOk={() => {
          if (latex.trim()) {
            editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run();
          }
          setMathOpen(false);
        }}
        okText="Insert"
      >
        <Input
          placeholder="e.g.  x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          onPressEnter={() => {
            if (latex.trim()) {
              editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run();
            }
            setMathOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
