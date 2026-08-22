import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import type { Announcements, DragEndEvent, ScreenReaderInstructions } from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HolderOutlined } from "@ant-design/icons";
import { useMemo, type ReactNode } from "react";
import { bnNum } from "../../lib/bn";

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
          // Chrome only — the dnd-kit wiring above and the reorder maths below are untouched.
          // This handle renders on BOTH builders (exam sections and model-test exams), so the
          // last English string in the authoring flow was also its most-repeated one.
          style={{
            cursor: "grab", padding: "10px 4px", color: "var(--ex-ink-soft)",
            touchAction: "none",
          }}
          aria-label="টেনে সাজান"
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

  // dnd-kit ALWAYS renders the hidden instructions node and the live region — the only
  // question is whose words go in them, and the defaults are English («To pick up a
  // draggable item, press the space bar…»). This is the config object and nothing else: the
  // sensor, the collision strategy and the reorder handler below are untouched.
  //
  // The instruction deliberately does not mention the space bar or the arrow keys. Only a
  // PointerSensor is wired here (no KeyboardSensor), so a keyboard pick-up genuinely does not
  // work and promising it would be worse than saying nothing — wiring one is a behaviour
  // change this a11y pass is not allowed to make. Filed as a follow-up instead.
  //
  // The announcements name the POSITION rather than dnd-kit's default raw id: `active.id` here
  // is a question or exam id, which read aloud is a 24-character hex string. `items` is the
  // pre-drag order for the whole gesture (the reorder is committed on drag end, after these
  // fire), so «৩ নম্বর» is the position the reader can actually count to on screen.
  //
  // MEMOISED, and not as a micro-optimisation: DndContext runs an effect keyed on this object,
  // so a fresh identity every render re-subscribes its monitor on every render. The React
  // Compiler is NOT enabled in this build (it runs as a lint rule only), so nothing else would
  // hold the identity stable. `items`/`getKey` are the only inputs — `position` lives inside
  // the memo so the dependency list is honest.
  const accessibility: {
    screenReaderInstructions: ScreenReaderInstructions;
    announcements: Announcements;
  } = useMemo(() => {
    const position = (id: string | number) => {
      const at = items.findIndex((i) => getKey(i) === id);
      return at < 0 ? null : bnNum(at + 1);
    };
    return {
      screenReaderInstructions: {
        draggable:
          "সাজানোর জন্য হাতলটি ধরে আইটেমটি ওপরে বা নিচে টেনে নিন, তারপর নতুন জায়গায় ছেড়ে দিন।",
      },
      announcements: {
        onDragStart: ({ active }) => {
          const at = position(active.id);
          return at ? `${at} নম্বর আইটেমটি তোলা হয়েছে।` : "আইটেমটি তোলা হয়েছে।";
        },
        onDragOver: ({ over }) => {
          const at = over ? position(over.id) : null;
          return at ? `এখন ${at} নম্বর অবস্থানের ওপরে।` : undefined;
        },
        // A drop onto ITSELF is the same no-op `handleDragEnd` returns early on
        // (`active.id === over.id`), so it must announce "unchanged" rather than «N নম্বর
        // অবস্থানে বসানো হয়েছে» — that sentence claims a move the list did not make, and
        // picking an item up and putting it back is the commonest way a drag ends.
        onDragEnd: ({ active, over }) => {
          const at = over && over.id !== active.id ? position(over.id) : null;
          return at ? `${at} নম্বর অবস্থানে বসানো হয়েছে।` : "আগের জায়গাতেই রয়ে গেছে।";
        },
        onDragCancel: () => "সাজানো বাতিল হয়েছে — ক্রম বদলায়নি।",
      },
    };
  }, [items, getKey]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => getKey(i) === active.id);
    const newIndex = items.findIndex((i) => getKey(i) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      accessibility={accessibility}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
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
