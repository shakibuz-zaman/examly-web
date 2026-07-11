import { Button, Layout, Space, Typography } from "antd";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const { Header, Content } = Layout;

// Minimal mobile-first shell: top bar only, no org sidebar (spec §5).
export function StudentShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#001529",
          paddingInline: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          <Link to="/student/catalog" style={{ color: "white" }}>
            Examly
          </Link>
        </Typography.Title>
        <Space>
          <Button type="text" style={{ color: "white" }} onClick={() => navigate("/student/me")}>
            My exams
          </Button>
          <Button
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </Space>
      </Header>
      <Content
        style={{
          padding: 12,
          maxWidth: 760,
          width: "100%",
          margin: "0 auto",
          textAlign: "left",
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
}
