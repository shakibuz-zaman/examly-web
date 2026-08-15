import {
  BarChart3, Building2, FileText, FolderTree, Landmark, LayoutDashboard,
  ListChecks, Receipt, Settings2, Wallet, BookOpen, Import, type LucideIcon,
} from "lucide-react";

// Shared examiner/admin nav model — consumed by ExaminerSidebar (and, from 7f T2, the
// ⌘K palette). Lives outside ExaminerSidebar.tsx so component files export only
// components (react-refresh), mirroring nav.ts on the student side.
export type NavItem = { to: string; label: string; Icon: LucideIcon; badge?: "questions" | "wallet" };
export type NavGroup = { label: string; roles?: string[]; items: NavItem[] };

// D1/D2: labels are Bengali chrome even where the page body is still English (7g).
// Role visibility repeats the retired layout/SidebarNav filter: a group with no `roles`
// is universal, otherwise it shows only when the JWT role claim is listed. platform_admin
// therefore sees its own group (with its own ড্যাশবোর্ড entry) and no examiner group.
export const EXAMINER_NAV: NavGroup[] = [
  {
    label: "পরিচালনা",
    roles: ["examiner"],
    items: [
      { to: "/dashboard", label: "ড্যাশবোর্ড", Icon: LayoutDashboard },
      { to: "/questions", label: "প্রশ্ন", Icon: ListChecks, badge: "questions" },
      { to: "/exams", label: "পরীক্ষা", Icon: FileText },
      { to: "/model-tests", label: "মডেল টেস্ট", Icon: BookOpen },
    ],
  },
  {
    label: "ব্যবসা",
    roles: ["examiner"],
    items: [
      { to: "/wallet", label: "ওয়ালেট", Icon: Wallet, badge: "wallet" },
      { to: "/org/profile", label: "প্রতিষ্ঠান", Icon: Building2 },
      { to: "/taxonomy", label: "ট্যাক্সোনমি", Icon: FolderTree },
    ],
  },
  {
    label: "প্ল্যাটফর্ম",
    roles: ["platform_admin"],
    items: [
      { to: "/dashboard", label: "ড্যাশবোর্ড", Icon: LayoutDashboard },
      { to: "/admin/taxonomy", label: "গ্লোবাল ট্যাক্সোনমি", Icon: FolderTree },
      { to: "/admin/categories", label: "ক্যাটাগরি", Icon: BarChart3 },
      { to: "/admin/qbank", label: "প্রশ্নব্যাংক", Icon: Import },
      { to: "/admin/platform-config", label: "কনফিগারেশন", Icon: Settings2 },
      { to: "/admin/withdrawals", label: "উত্তোলন", Icon: Landmark },
      { to: "/admin/orders", label: "অর্ডার", Icon: Receipt },
    ],
  },
];
