import { Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Item = { key: string; label: string; path: string; roles?: string[] };

const items: Item[] = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "questions", label: "Questions", path: "/questions", roles: ["examiner"] },
  { key: "org", label: "Organization", path: "/org/profile", roles: ["examiner"] },
  { key: "taxonomy", label: "Taxonomy", path: "/taxonomy", roles: ["examiner"] },
  { key: "admin-taxonomy", label: "Global Taxonomy", path: "/admin/taxonomy", roles: ["platform_admin"] },
];

export function SidebarNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role ?? "";

  const visible = items.filter((i) => !i.roles || i.roles.includes(role));
  const activeKey = visible.find((i) => location.pathname.startsWith(i.path))?.key ?? "dashboard";

  return (
    <Menu
      mode="inline"
      selectedKeys={[activeKey]}
      onClick={({ key }) => {
        const item = visible.find((i) => i.key === key);
        if (item) navigate(item.path);
      }}
      items={visible.map((i) => ({ key: i.key, label: i.label }))}
      style={{ borderRight: 0 }}
    />
  );
}
