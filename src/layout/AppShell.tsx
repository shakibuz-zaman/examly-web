import { Layout, Typography, Button, Space } from "antd";
import { Outlet } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { useAuth } from "../auth/useAuth";

const { Header, Sider, Content } = Layout;

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#001529" }}>
        <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
          Examly
        </Typography.Title>
        <Space>
          <Typography.Text style={{ color: "white" }}>
            {user?.email} ({user?.role})
          </Typography.Text>
          <Button onClick={logout}>Logout</Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: "#fff" }}>
          <SidebarNav />
        </Sider>
        <Content style={{ padding: 24, background: "#f5f5f5" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
