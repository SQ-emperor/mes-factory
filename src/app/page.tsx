import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // 重定向到用户的工厂看板
  const tenantId = session.user.tenantId || "demo";
  redirect(`/${tenantId}/dashboard`);
}
