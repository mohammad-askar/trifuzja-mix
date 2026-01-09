//E:\trifuzja-mix\app\[locale]\login\page.tsx
import AdminLoginClient from "./AdminLoginClient";

type Locale = "en" | "pl";

export default async function LoginPage({
}: {
  params: Promise<{ locale: Locale }>;
}) {
  // ❌ لا auth()
  // ❌ لا redirect
  // ❌ لا getToken

  // ✅ middleware فقط هو المسؤول عن الحماية
  return <AdminLoginClient />;
}
