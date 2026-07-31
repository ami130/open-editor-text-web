/**
 * /admin — the dashboard. A thin server page that mounts the interactive
 * client dashboard, passing the current user's permissions so the dashboard can
 * hide tabs the user can't use (the backend still enforces access regardless).
 * (The layout already ran requireAdmin().)
 */
import AdminDashboard from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdmin();
  return <AdminDashboard permissions={user.permissions} />;
}
