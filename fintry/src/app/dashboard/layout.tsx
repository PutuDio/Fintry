import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#0B1F3B] text-[#F2F5F8]">
      <Sidebar
        userEmail={session.user.email}
        userName={session.user.name}
        userUsername={session.user.username}
      />
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        {children}
      </div>
    </div>
  );
}
