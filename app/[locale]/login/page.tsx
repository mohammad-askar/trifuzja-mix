import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminLoginClient from "./AdminLoginClient";

type Locale = "en" | "pl";

export default async function LoginPage({
  params,
}: {
  params: { locale: Locale };
}) {
  const session = await auth();

  // ✅ إذا مسجل دخول، لا تعرض صفحة login أبداً
  if (session?.user) {
    redirect(`/${params.locale}/admin/dashboard`);
  }

  return <AdminLoginClient />;
}
