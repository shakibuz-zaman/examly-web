import { Layout, Typography, Button, Space, ConfigProvider } from "antd";
import bnBD from "antd/locale/bn_BD";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Link, Outlet } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { useAuth } from "../auth/useAuth";
import { buildTheme } from "../theme/antdTheme";
import { useThemeMode } from "../theme/ThemeContext";

const { Header, Sider, Content } = Layout;

export function AppShell() {
  const { user, logout } = useAuth();
  const { mode, toggle } = useThemeMode();

  return (
    <ConfigProvider locale={bnBD} theme={buildTheme("examiner", mode)}>
      <Layout style={{ minHeight: "100vh" }}>
        <Header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/dashboard" style={{ fontWeight: 700, color: "var(--ex-teal-ink)" }}>
            Examly
          </Link>
          <Space>
            <Button
              type="text"
              icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggle}
              aria-label="থিম বদলান"
            />
            <Typography.Text>
              {user?.email} ({user?.role})
            </Typography.Text>
            <Button onClick={logout}>Logout</Button>
          </Space>
        </Header>
        <Layout>
          <Sider width={220}>
            <SidebarNav />
          </Sider>
          <Content style={{ padding: 24 }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
