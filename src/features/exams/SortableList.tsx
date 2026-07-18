import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HolderOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

type SortableRowProps = { id: string; disabled: boolean; children: ReactNode };

function SortableRow({ id, disabled, children }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        opacity: isDragging ? 0.6 : 1,
        background: "var(--ex-card)",
      }}
    >
      {!disabled && (
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", padding: "10px 4px", color: "#999", touchAction: "none" }}
          aria-label="Drag to reorder"
        >
          <HolderOutlined />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

type SortableListProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  disabled?: boolean;
};

export function SortableList<T>({
  items, getKey, onReorder, renderItem, disabled = false,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => getKey(i) === active.id);
    const newIndex = items.findIndex((i) => getKey(i) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(getKey)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableRow key={getKey(item)} id={getKey(item)} disabled={disabled}>
            {renderItem(item, index)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}
