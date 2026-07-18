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
};

function toTreeData(nodes: CategoryNode[]): object[] {
  return nodes.map((n) => ({
    value: n.id,
    title: categoryLabel(n),
    selectable: n.kind !== "section", // sections are grouping only (spec §2.1)
    children: toTreeData(n.children),
  }));
}

export function CategoryTreeSelect({ value, onChange, disabled, allowClear = true, placeholder }: Props) {
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
      treeData={toTreeData(buildCategoryTree(categories.data ?? []))}
      onChange={(v) => onChange?.((v as string | undefined) ?? null)}
    />
  );
}
