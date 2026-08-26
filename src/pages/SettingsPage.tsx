import { Divider } from "antd";
import { PageContainer } from "../ui/PageContainer";
import { PageHeader } from "../ui/PageHeader";
import { useAuth } from "../auth/useAuth";
import { useProviders } from "../api/auth";
import { NameSection } from "../features/account/NameSection";
import { PhoneSection } from "../features/account/PhoneSection";
import { EmailSection } from "../features/account/EmailSection";
import { PasswordSection } from "../features/account/PasswordSection";
import { GoogleSection } from "../features/account/GoogleSection";
import { SessionsSection } from "../features/account/SessionsSection";

export function SettingsPage() {
  const { user } = useAuth();
  const providers = useProviders();
  if (!user) return null; // unreachable under RequireAuth; narrows the type

  return (
    <PageContainer>
      <PageHeader title="সেটিংস" summary="অ্যাকাউন্ট ও নিরাপত্তা" />
      <div style={{ maxWidth: 600 }}>
        <NameSection user={user} />
        <Divider />
        <PhoneSection user={user} />
        <Divider />
        <EmailSection user={user} />
        <Divider />
        <PasswordSection user={user} />
        {providers.data?.includes("google") && (
          <>
            <Divider />
            <GoogleSection user={user} />
          </>
        )}
        <Divider />
        <SessionsSection />
      </div>
    </PageContainer>
  );
}
