import { TreeSelect } from "antd";
import { buildCategoryTree, categoryLabel, useExamCategories, type CategoryNode } from "../../api/categories";

type Props = {
  // value/onChange are optional so an antd <Form.Item> can inject them;
  // the builders pass them directly.
  value?: string | null;
  onChange?: (id: string | null) => void;
  disabled?: boolean;
  allowClear?: boolean;
  placeholder?: string;
  // Sections are grouping-only and never taggable in the exam/model-test builders
  // (spec §2.1), so they stay unselectable there. But in the admin category modal
  // sections ARE the valid parents of tracks/nested sections, so opt in there.
  sectionsSelectable?: boolean;
};

function toTreeData(nodes: CategoryNode[], sectionsSelectable: boolean): object[] {
  return nodes.map((n) => ({
    value: n.id,
    title: categoryLabel(n),
    selectable: n.kind !== "section" || sectionsSelectable,
    children: toTreeData(n.children, sectionsSelectable),
  }));
}

export function CategoryTreeSelect({
  value, onChange, disabled, allowClear = true, placeholder, sectionsSelectable = false,
}: Props) {
  const categories = useExamCategories();
  return (
    <TreeSelect
      allowClear={allowClear}
      showSearch
      treeDefaultExpandAll
      treeNodeFilterProp="title"
      style={{ width: "100%" }}
      disabled={disabled}
      placeholder={placeholder ?? "যেমন: বিসিএস"}
      value={value ?? undefined}
      treeData={toTreeData(buildCategoryTree(categories.data ?? []), sectionsSelectable)}
      onChange={(v) => onChange?.((v as string | undefined) ?? null)}
    />
  );
}
