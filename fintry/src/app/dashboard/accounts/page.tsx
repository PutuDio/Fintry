import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import { listAssets } from "@/infrastructure/repositories/assets";
import { listAdjustmentsByUser } from "@/infrastructure/repositories/adjustments";
import { AccountsView } from "@/components/dashboard/accounts-view";

export default async function AccountsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const [assets, adjustments] = await Promise.all([
    listAssets(db, session.user.id),
    listAdjustmentsByUser(db, session.user.id, 30),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 w-full">
      <AccountsView assets={assets} adjustments={adjustments} />
    </main>
  );
}
