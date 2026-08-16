import {
  BarChart3, Building2, FileText, FolderTree, Landmark, LayoutDashboard,
  ListChecks, Receipt, Settings2, Wallet, BookOpen, Import, type LucideIcon,
} from "lucide-react";

// Shared examiner/admin nav model — consumed by ExaminerSidebar, ExaminerHeader (breadcrumb)
// and the ⌘K palette. Lives outside ExaminerSidebar.tsx so component files export only
// components (react-refresh), mirroring nav.ts on the student side.
export type NavItem = { to: string; label: string; Icon: LucideIcon; badge?: "questions" | "wallet" };
export type NavGroup = { label: string; roles?: string[]; items: NavItem[] };

// The rail's DOM id, shared so the header's toggle can point `aria-controls` at the element
// it actually expands and collapses. A document-unique id is only safe because AppShell
// mounts exactly one ExaminerSidebar; a second instance would need this parameterised.
export const SIDENAV_ID = "ex-sidenav";

// One place for the JWT role claim → Bengali label mapping: the sidebar footer and the
// header's user menu both print it, and two copies would drift.
export const ROLE_LABEL: Record<string, string> = { examiner: "পরীক্ষক", platform_admin: "অ্যাডমিন" };

// The one role-visibility rule, applied by the sidebar to groups and by the palette to
// groups AND actions: no `roles` means universal, otherwise the JWT role claim must be
// listed. Anything the palette offers must pass the same test the rail does, or ⌘K becomes
// a back door to a surface the rail deliberately hides.
export const isVisibleToRole = (entry: { roles?: string[] }, role: string): boolean =>
  !entry.roles || entry.roles.includes(role);

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

// Breadcrumb labels, keyed by raw path segment (spec §1: "Bengali segment labels from one
// shared map"). A segment with no entry here is dropped from the trail rather than printed
// raw — that is what hides the 24-hex ObjectId in /exams/:id/results and /questions/:id;
// the page's own PageHeader names the entity. "new" is a real segment, so it IS mapped.
// Keys cover every examiner/admin route in routes.tsx, including the 7g ones (roster,
// wallet, org) that render inside this shell with their current bodies.
export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "ড্যাশবোর্ড", questions: "প্রশ্ন", new: "নতুন", exams: "পরীক্ষা",
  results: "ফলাফল", "model-tests": "মডেল টেস্ট", wallet: "ওয়ালেট",
  org: "প্রতিষ্ঠান", profile: "প্রোফাইল", taxonomy: "ট্যাক্সোনমি", selling: "বিক্রয়",
  roster: "রোস্টার", admin: "প্ল্যাটফর্ম", categories: "ক্যাটাগরি", qbank: "প্রশ্নব্যাংক",
  "platform-config": "কনফিগারেশন", withdrawals: "উত্তোলন", orders: "অর্ডার",
};

// D5: the palette is navigation-only. Beyond the role-visible nav items it offers exactly
// these two create actions — routes that exist but are not their own sidebar entries.
// Both are examiner-only, and they carry `roles` for the same reason the groups do: the
// routes themselves have no RequireRole guard, so a platform_admin who followed them would
// land on an authoring page whose first call (useSubjects("examiner")) 403s.
export type PaletteAction = { to: string; label: string; roles?: string[] };
export const PALETTE_ACTIONS: PaletteAction[] = [
  { to: "/questions/new", label: "নতুন প্রশ্ন", roles: ["examiner"] },
  { to: "/exams/new", label: "নতুন পরীক্ষা", roles: ["examiner"] },
];
