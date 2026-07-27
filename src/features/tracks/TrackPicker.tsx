import { useState, type CSSProperties } from "react";
import { Spin } from "antd";
import { buildCategoryTree, useExamCategories } from "../../api/categories";
import type { CategoryNode } from "../../api/categories";
import { Chip } from "../../components/Chip";

export type TrackPickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
};

// Display copy per card role (spec §2.5). Kept role-keyed (single-track root vs
// section root), never slug-keyed, so the picker stays generic over the tree.
const TRACK_ROOT_SUBTITLE = "বিসিএস · ব্যাংক · প্রাইমারি · নিবন্ধন — এক ট্র্যাকে সব";
const SECTION_ROOT_SUBTITLE = "মেডিকেল · ইঞ্জিনিয়ারিং · বিশ্ববিদ্যালয় ইউনিট";

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}
function bn(n: CategoryNode): string {
  return n.name.bn || n.name.en || n.slug;
}
function tracksUnder(node: CategoryNode): CategoryNode[] {
  return flatten(node.children).filter((n) => n.kind === "track");
}

const cardBase: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "start",
  border: "1.5px solid",
  borderRadius: 14,
  padding: "16px 18px",
  cursor: "pointer",
  background: "var(--ex-card)",
  borderColor: "var(--ex-line-strong)",
  transition: "background .15s, border-color .15s",
};
const cardActive: CSSProperties = {
  background: "var(--ex-teal-tint)",
  borderColor: "var(--ex-teal)",
};
const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  color: "var(--ex-ink)",
};
const subStyle: CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 13.5,
  color: "var(--ex-ink-soft)",
  lineHeight: 1.6,
};

export function TrackPicker({ value, onChange }: TrackPickerProps) {
  const { data, isLoading } = useExamCategories();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  if (isLoading) return <Spin style={{ display: "block", margin: "32px auto" }} />;

  const roots = buildCategoryTree(data ?? []);
  const selected = new Set(value);
  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {roots.map((root) => {
        // A root that IS a track = single-tap card toggling its own id.
        if (root.kind === "track") {
          const isOn = selected.has(root.id);
          return (
            <button
              key={root.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(root.id)}
              style={{ ...cardBase, ...(isOn ? cardActive : null) }}
            >
              <h4 style={titleStyle}>{bn(root)}</h4>
              <span style={subStyle}>{TRACK_ROOT_SUBTITLE}</span>
            </button>
          );
        }

        // A section root = expanding card; chips are its descendant tracks,
        // direct track children ungrouped and each nested section a labeled group.
        const directTracks = root.children.filter((c) => c.kind === "track");
        const groups = root.children
          .filter((c) => c.kind === "section")
          .map((sec) => ({ id: sec.id, label: bn(sec), tracks: tracksUnder(sec) }));
        const anySelected = tracksUnder(root).some((t) => selected.has(t.id));
        const open = openMap[root.id] ?? anySelected;

        return (
          <div
            key={root.id}
            style={{ ...cardBase, ...(anySelected ? cardActive : null), cursor: "default" }}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenMap((m) => ({ ...m, [root.id]: !open }))}
              style={{
                display: "block",
                width: "100%",
                textAlign: "start",
                background: "transparent",
                border: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <h4 style={titleStyle}>{bn(root)}</h4>
              <span style={subStyle}>{SECTION_ROOT_SUBTITLE}</span>
            </button>

            {open && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                {directTracks.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {directTracks.map((t) => (
                      <Chip
                        key={t.id}
                        label={bn(t)}
                        selected={selected.has(t.id)}
                        onClick={() => toggle(t.id)}
                      />
                    ))}
                  </div>
                )}
                {groups.map((g) => (
                  <div key={g.id}>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: ".05em",
                        textTransform: "uppercase",
                        color: "var(--ex-ink-faint)",
                        marginBottom: 8,
                      }}
                    >
                      {g.label}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {g.tracks.map((t) => (
                        <Chip
                          key={t.id}
                          label={bn(t)}
                          selected={selected.has(t.id)}
                          onClick={() => toggle(t.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
