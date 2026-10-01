"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id: string;
  name: string;
  owner_id: string;
  owner_email?: string;
  plan?: string;
  status?: string;
  expires_at?: string | null;
  included?: number;
  addons?: number;
  used: number;
  ocrIncluded?: number;
  ocrAddon?: number;
  ocrUsed?: number;
  activations?: number;
};

export function PlatformAdmin() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login/?next=/admin/";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_role")
      .eq("id", user.id)
      .maybeSingle();

    const allowed = Boolean(
      profile?.platform_role === "PLATFORM_ADMIN" &&
      (user.email ?? "").toLowerCase() === "jarahul989@gmail.com",
    );
    setAuthorized(allowed);
    if (!allowed) {
      setLoading(false);
      return;
    }

    const [{ data: profiles }, { data: orgs, error: orgError }, { data: subs }, { data: planRows }, { data: tournaments }] =
      await Promise.all([
        supabase.from("profiles").select("id,email"),
        supabase.from("organizations").select("id,name,owner_id").order("created_at", { ascending: true }),
        supabase.from("subscriptions").select(
          "organization_id,plan_id,status,expires_at,included_tournaments,addon_tournaments,included_ocr_units,addon_ocr_units,ocr_units_used,activation_count",
        ),
        supabase.from("subscription_plans").select(
          "id,name,price_inr,initial_tournaments,renewal_tournaments,addon_price_inr,addon_tournaments,included_ocr_units,addon_ocr_units,enabled,coming_soon",
        ),
        supabase.from("tournaments").select("id,organization_id,quota_exempt"),
      ]);

    if (orgError) {
      setError(orgError.message);
      setLoading(false);
      return;
    }

    const built = (orgs ?? []).map((o: any) => {
      const s = (subs ?? []).find((x: any) => x.organization_id === o.id);
      const p = (planRows ?? []).find((x: any) => x.id === s?.plan_id);
      const owner = (profiles ?? []).find((x: any) => x.id === o.owner_id);
      const used = (tournaments ?? []).filter(
        (t: any) => t.organization_id === o.id && !t.quota_exempt,
      ).length;

      return {
        id: o.id,
        name: o.name,
        owner_id: o.owner_id,
        owner_email: owner?.email,
        plan: p?.name,
        status: s?.status,
        expires_at: s?.expires_at,
        included: s?.included_tournaments ?? 0,
        addons: s?.addon_tournaments ?? 0,
        used,
        ocrIncluded: s?.included_ocr_units ?? 0,
        ocrAddon: s?.addon_ocr_units ?? 0,
        ocrUsed: s?.ocr_units_used ?? 0,
        activations: s?.activation_count ?? 0,
      };
    });

    setRows(built);
    setPlans(planRows ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  if (authorized === null) {
    return <main className="saas-shell"><div className="saas-wrap"><div className="saas-card">Checking platform access…</div></div></main>;
  }

  if (!authorized) {
    return <main className="saas-shell"><div className="saas-wrap"><div className="saas-card">
      <p className="eyebrow">PLATFORM CONTROL</p>
      <h1 className="saas-title">Access denied</h1>
      <p className="saas-muted">Platform Admin is restricted to the designated platform administrator account.</p>
    </div></div></main>;
  }

  async function activate(id: string, plan: string) {
    setError("");
    setMessage("");
    const { error: e } = await supabase.rpc("platform_activate_subscription", {
      p_organization_id: id,
      p_plan_id: plan,
      p_days: 30,
    });
    if (e) setError(e.message);
    else {
      setMessage(`Membership activated / renewed as ${plan}.`);
      void load();
    }
  }

  async function addCredits(id: string, plan?: string) {
    setError("");
    const { error: e } = await supabase.rpc("platform_add_tournament_credits", {
      p_organization_id: id,
      p_credits: 2,
    });
    if (e) setError(e.message);
    else {
      setMessage(plan === "Broadcast Automation"
        ? "Added 2 tournaments + 1,000 Cloud OCR Units."
        : "Added 2 tournament credits.");
      void load();
    }
  }

  async function setStatus(id: string, status: string) {
    const { error: e } = await supabase.rpc("platform_set_subscription_status", {
      p_organization_id: id,
      p_status: status,
    });
    if (e) setError(e.message);
    else void load();
  }

  return <main className="saas-shell"><div className="saas-wrap">
    <div className="saas-nav">
      <div>
        <p className="eyebrow">PLATFORM CONTROL</p>
        <h1 className="saas-title">Customer memberships</h1>
        <p className="saas-muted">Manual billing phase · Starter and Pro are active · Agency remains gated until released.</p>
      </div>
      <button className="saas-button" onClick={() => void load()}>{loading ? "Refreshing…" : "Refresh"}</button>
    </div>

    {message && <div className="success-banner" style={{ marginBottom: 12 }}>{message}</div>}
    {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

    <section className="saas-grid">
      {plans.map((p: any) => <article className="saas-card" key={p.id}>
        <p className="eyebrow">{p.id}</p>
        <h2>{p.name}</h2>
        <div className="saas-kpi">{p.price_inr ? "₹" + p.price_inr : "Custom"}</div>
        <p className="saas-muted">
          {p.coming_soon ? "Coming Soon" : p.enabled ? "Available" : "Disabled"} · {p.initial_tournaments} tournaments / month
        </p>
        <p className="saas-muted">
          Add-on: +{p.addon_tournaments} tournaments for ₹{p.addon_price_inr}
          {p.addon_ocr_units ? ` + ${p.addon_ocr_units.toLocaleString("en-IN")} OCR Units` : ""}
        </p>
        {p.included_ocr_units > 0 && <p className="saas-muted">Cloud OCR: {p.included_ocr_units.toLocaleString("en-IN")} units / month</p>}
      </article>)}
    </section>

    <section className="saas-card" style={{ marginTop: 14 }}>
      <h2>Customers</h2>
      {rows.length === 0 ? <p className="saas-muted">No customer workspace yet.</p> : <div style={{ overflowX: "auto" }}>
        <table className="saas-table">
          <thead><tr><th>Workspace</th><th>Owner</th><th>Plan</th><th>Tournaments</th><th>Cloud OCR</th><th>Expiry</th><th>Actions</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}>
            <td><strong>{r.name}</strong><div className="saas-muted">{r.id}</div></td>
            <td>{r.owner_email}</td>
            <td>{r.plan ?? "None"}<div className="saas-muted">{r.status ?? "NOT ACTIVE"} · {r.activations ?? 0} activation(s)</div></td>
            <td>{r.used} / {(r.included ?? 0) + (r.addons ?? 0)}<div className="saas-muted">included {r.included ?? 0} + add-on {r.addons ?? 0}</div></td>
            <td>{(r.ocrUsed ?? 0).toLocaleString("en-IN")} / {((r.ocrIncluded ?? 0) + (r.ocrAddon ?? 0)).toLocaleString("en-IN")}<div className="saas-muted">included {r.ocrIncluded ?? 0} + add-on {r.ocrAddon ?? 0}</div></td>
            <td>{r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-IN") : "—"}</td>
            <td><div className="saas-actions">
              <button className="saas-button primary" onClick={() => void activate(r.id, "STARTER")}>{r.plan === "Manual Scoring" ? "Renew Starter" : "Activate Starter"}</button>
              <button className="saas-button primary" onClick={() => void activate(r.id, "PRO")}>{r.plan === "Broadcast Automation" ? "Renew Pro" : "Activate Pro"}</button>
              {r.plan && <button className="saas-button" onClick={() => void addCredits(r.id, r.plan)}>+2 tournaments{r.plan === "Broadcast Automation" ? " +1k OCR" : ""}</button>}
              <button className="saas-button" onClick={() => void setStatus(r.id, "PAUSED")}>Pause</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div></main>;
}
