import {
  BookOutlined,
  FileTextOutlined,
  HomeOutlined,
  LineChartOutlined,
  MoonOutlined,
  ReadOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Avatar, Button, Dropdown, Grid, Layout, Select, Space, Spin, Typography } from "antd";
import type { ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { categoryLabel } from "../api/categories";
import { useMyTracks } from "../api/me";
import { useThemeMode } from "../theme/ThemeContext";
import { TrackProvider, useActiveTrack } from "../features/tracks/TrackContext";

const { Header, Content } = Layout;

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: "/student/home", label: "হোম", icon: <HomeOutlined /> },
  { to: "/student/qbank", label: "প্রশ্নব্যাংক", icon: <ReadOutlined /> },
  { to: "/student/tests", label: "মডেল টেস্ট", icon: <FileTextOutlined /> },
  { to: "/student/notebook", label: "ভুলের খাতা", icon: <BookOutlined /> },
  { to: "/student/progress", label: "প্রোগ্রেস", icon: <LineChartOutlined /> },
];

const centeredSpin = (
  <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
    <Spin />
  </div>
);

export function StudentShell() {
  const location = useLocation();
  const onOnboarding = location.pathname.endsWith("/onboarding");
  const onTakeRoute =
    /\/exams\/[^/]+\/take$/.test(location.pathname) ||
    /^\/student\/practice\/[^/]+$/.test(location.pathname);
  const myTracks = useMyTracks();

  // Onboarding and the exam runner render bare (no chrome, no bottom tab bar) so
  // those flows own the full viewport.
  if (onOnboarding || onTakeRoute) return <Outlet />;

  // Wait for the subscription list before deciding — never redirect on a stale/empty load.
  if (myTracks.isLoading) return centeredSpin;
  // A failed load must NOT be read as "no tracks" (that would bounce a subscribed
  // student to onboarding). Surface the error with a retry instead.
  if (myTracks.isError) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 16px" }}>
        <Alert
          type="error"
          showIcon
          message="ট্র্যাক লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => myTracks.refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      </div>
    );
  }
  // Only redirect on a confirmed empty subscription (successful load, zero tracks).
  if (myTracks.data && myTracks.data.trackIds.length === 0) {
    return <Navigate to="/student/onboarding" replace />;
  }

  return (
    <TrackProvider>
      <ShellChrome />
    </TrackProvider>
  );
}

function TrackSwitcher({ compact }: { compact: boolean }) {
  const { tracks, activeTrackId, setActiveTrackId } = useActiveTrack();
  if (tracks.length <= 1) {
    const only = tracks[0];
    return only ? (
      <Typography.Text
        strong
        ellipsis
        style={{ color: "var(--ex-ink)", maxWidth: compact ? 150 : 240 }}
      >
        {categoryLabel(only)}
      </Typography.Text>
    ) : null;
  }
  // Keep the switcher narrow on mobile so the avatar menu (logout) never clips off-screen.
  return (
    <Select
      value={activeTrackId ?? undefined}
      onChange={setActiveTrackId}
      style={{ minWidth: compact ? 110 : 160, maxWidth: compact ? 150 : 240 }}
      options={tracks.map((t) => ({ value: t.id, label: categoryLabel(t) }))}
    />
  );
}

function DesktopNav() {
  return (
    <Space size={4}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            fontWeight: 500,
            background: isActive ? "var(--ex-teal-tint)" : "transparent",
            color: isActive ? "var(--ex-teal-ink)" : "var(--ex-ink-soft)",
          })}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </Space>
  );
}

function BottomTabBar() {
  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: 56,
        display: "flex",
        background: "var(--ex-card)",
        borderTop: "1px solid var(--ex-line)",
        zIndex: 10,
      }}
    >
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            flex: 1,
            minWidth: 48,
            minHeight: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            fontSize: 18,
            color: isActive ? "var(--ex-teal)" : "var(--ex-ink-soft)",
          })}
        >
          {item.icon}
          <span style={{ fontSize: 11, lineHeight: 1.2 }}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ShellChrome() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { mode, toggle } = useThemeMode();
  const isDesktop = Grid.useBreakpoint().md;

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--ex-bg)" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--ex-card)",
          borderBottom: "1px solid var(--ex-line)",
          paddingInline: 16,
        }}
      >
        <Link to="/student/home" style={{ fontWeight: 700, fontSize: 18, color: "var(--ex-teal-ink)" }}>
          Examly
        </Link>
        {isDesktop && <DesktopNav />}
        <Space style={{ marginLeft: "auto" }}>
          <TrackSwitcher compact={!isDesktop} />
          <Button
            type="text"
            icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggle}
            aria-label="থিম বদলান"
          />
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "profile", label: "প্রোফাইল" },
                { key: "me", label: "আমার পরীক্ষা" },
                { type: "divider" },
                { key: "logout", label: "লগআউট" },
              ],
              onClick: ({ key }) => {
                if (key === "profile") navigate("/student/profile");
                else if (key === "me") navigate("/student/me");
                else if (key === "logout") {
                  logout();
                  navigate("/login");
                }
              },
            }}
          >
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ cursor: "pointer", background: "var(--ex-teal-tint)", color: "var(--ex-teal-ink)" }}
            />
          </Dropdown>
        </Space>
      </Header>
      <Content
        style={{
          maxWidth: 960,
          width: "100%",
          margin: "0 auto",
          padding: 16,
          paddingBottom: isDesktop ? 16 : 72,
          textAlign: "left",
        }}
      >
        <Outlet />
      </Content>
      {!isDesktop && <BottomTabBar />}
    </Layout>
  );
}
