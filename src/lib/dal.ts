import { redirect } from "next/navigation";
import { auth, type UserRole } from "@/auth";

export async function verifyPageRole(allowed: UserRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!allowed.includes(session.user.role)) {
    if (session.user.role === "admin") redirect("/admin");
    if (session.user.role === "vendor") redirect("/vendor");
    redirect("/account");
  }
  return session;
}
