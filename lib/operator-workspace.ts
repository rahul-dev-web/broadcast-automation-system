import { supabase } from "@/lib/supabase/client";

export type OperatorWorkspace = {
  organizationId: string;
  role: "OWNER" | "OPERATOR";
  planId: string | null;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: string | null;
};

export async function resolveOperatorWorkspace(): Promise<OperatorWorkspace> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Please sign in before using this workspace.");

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id,role,created_at")
    .eq("user_id", user.id)
    .in("role", ["OWNER", "OPERATOR"])
    .order("created_at", { ascending: true });

  if (membershipError) throw membershipError;
  if (!memberships?.length) throw new Error("No operator workspace is available for this account.");

  const organizationIds = memberships.map(item => item.organization_id);
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("organization_id,plan_id,status,expires_at")
    .in("organization_id", organizationIds)
    .eq("status", "ACTIVE")
    .gt("expires_at", new Date().toISOString());

  if (subscriptionError) throw subscriptionError;

  const active = memberships
    .map(membership => {
      const subscription = (subscriptions ?? [])
        .filter(item => item.organization_id === membership.organization_id)
        .sort((a, b) => {
          const aPro = a.plan_id === "PRO" ? 1 : 0;
          const bPro = b.plan_id === "PRO" ? 1 : 0;
          return bPro - aPro;
        })[0];
      return { membership, subscription };
    })
    .filter(item => Boolean(item.subscription))
    .sort((a, b) => {
      const aPro = a.subscription?.plan_id === "PRO" ? 1 : 0;
      const bPro = b.subscription?.plan_id === "PRO" ? 1 : 0;
      if (aPro !== bPro) return bPro - aPro;
      return new Date(a.membership.created_at).getTime() - new Date(b.membership.created_at).getTime();
    })[0];

  if (!active) {
    const membership = memberships[0];
    return {
      organizationId: membership.organization_id,
      role: membership.role as "OWNER" | "OPERATOR",
      planId: null,
      subscriptionStatus: null,
      subscriptionExpiresAt: null,
    };
  }

  return {
    organizationId: active.membership.organization_id,
    role: active.membership.role as "OWNER" | "OPERATOR",
    planId: active.subscription?.plan_id ?? null,
    subscriptionStatus: active.subscription?.status ?? null,
    subscriptionExpiresAt: active.subscription?.expires_at ?? null,
  };
}
