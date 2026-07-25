import {
  BookOpen, FileText, House, NotebookPen, TrendingUp, type LucideIcon,
} from "lucide-react";

// Shared student nav model — consumed by AppHeader (band pills) and BottomTabBar.
// Lives outside AppHeader.tsx so component files export only components (react-refresh).
export const STUDENT_NAV: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: "/student/home", label: "হোম", Icon: House },
  { to: "/student/qbank", label: "প্রশ্নব্যাংক", Icon: BookOpen },
  { to: "/student/tests", label: "মডেল টেস্ট", Icon: FileText },
  { to: "/student/notebook", label: "ভুলের খাতা", Icon: NotebookPen },
  { to: "/student/progress", label: "প্রোগ্রেস", Icon: TrendingUp },
];
