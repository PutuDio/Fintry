import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { ProfileView } from "@/components/dashboard/profile-view";

export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 w-full">
      <ProfileView user={session.user} />
    </main>
  );
}
