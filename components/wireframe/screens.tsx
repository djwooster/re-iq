"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ForceLight } from "@/components/theme/theme-provider";
import { useToast } from "@/components/ui/toast";
import { PRODUCT_NAME } from "@/lib/labels";
import { Box, Breadcrumb, ChartBox, ExpectBox, TableBox, WfButton, WfTabs } from "./blocks";
import { WfPage } from "./shell";

/** Low-fidelity screens for interviews: the flow, not the details. */

const DASH = { label: "Dashboard", href: "/wireframe/dashboard" };
const PROPERTY = { label: "Property", href: "/wireframe/property" };
const UNIT = { label: "Unit", href: "/wireframe/unit" };

export function LoginScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <ForceLight />
      <div className="flex w-full max-w-[320px] flex-col gap-3">
        <Link href="/" className="num mb-2 text-center text-[15px] font-semibold tracking-[0.06em] text-fg hover:opacity-70">
          {PRODUCT_NAME}
        </Link>
        <Box label="Email" className="min-h-10" />
        <Box label="Password" className="min-h-10" />
        <WfButton href="/wireframe/upload">Sign in</WfButton>
      </div>
    </div>
  );
}

export function UploadScreen() {
  const router = useRouter();
  const [files, setFiles] = useState(0);
  // Upload adds the files, then moves on to processing on its own.
  const upload = () => {
    setFiles((n) => n + 3);
    window.setTimeout(() => router.push("/wireframe/processing"), 900);
  };
  return (
    <WfPage title="Upload">
      <Box label="Drop reports here" className="flex min-h-48 flex-col items-center justify-center gap-3">
        <WfButton onClick={upload}>+ Upload</WfButton>
      </Box>
      <Box label="Uploaded files" className="min-h-28">
        {files > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {Array.from({ length: files }, (_, i) => (
              <li key={i} className="flex items-center gap-3 rounded border border-fg/15 bg-bg px-3 py-2 text-[11px] text-fg-2">
                File {i + 1}
                <span className="h-2 flex-1 rounded-sm bg-fg/[0.08]" />
              </li>
            ))}
          </ul>
        )}
      </Box>
      <ExpectBox />
    </WfPage>
  );
}

export function ProcessingScreen() {
  const router = useRouter();
  useEffect(() => {
    const t = window.setTimeout(() => router.replace("/wireframe/dashboard"), 1_600);
    return () => window.clearTimeout(t);
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <ForceLight />
      <div className="w-full max-w-[360px]">
        <Box label="Reading your reports" className="flex min-h-32 flex-col justify-between">
          <div className="mt-6 h-1 overflow-hidden rounded-full bg-fg/10">
            <motion.div className="h-1 rounded-full bg-fg/40" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5, ease: "easeOut" }} />
          </div>
        </Box>
      </div>
    </div>
  );
}

export function DashboardScreen() {
  return (
    <WfPage title="Dashboard">
      <Box label="Portfolio summary" className="min-h-28" />
      <ChartBox />
      <TableBox label="Property list" rowLabel="Property" rowHref="/wireframe/property" />
      <ExpectBox />
    </WfPage>
  );
}

export function PropertiesScreen() {
  return (
    <WfPage title="Properties">
      <TableBox label="Property list" rowLabel="Property" rows={6} rowHref="/wireframe/property" />
      <ExpectBox />
    </WfPage>
  );
}

type Tab = "t12" | "bva" | "rent_roll" | "ar" | "work_orders";

export function PropertyScreen() {
  const [tab, setTab] = useState<Tab>("t12");
  return (
    <WfPage title="Property">
      <div>
        <Breadcrumb items={[DASH, { label: "Property" }]} />
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Box label="Property name" />
          <Box label="Property summary" />
        </div>
      </div>
      <WfTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "t12", label: "T12 / income statement" },
          { id: "bva", label: "Budget vs. actual" },
          { id: "rent_roll", label: "Rent roll" },
          { id: "ar", label: "AR aging" },
          { id: "work_orders", label: "Work orders" },
        ]}
      />
      {tab === "t12" && (
        <>
          <TableBox label="Income statement" rows={6} />
          <ChartBox />
        </>
      )}
      {tab === "bva" && (
        <>
          <TableBox label="Budget vs. actual" rows={6} />
          <ChartBox />
        </>
      )}
      {tab === "rent_roll" && <TableBox label="Unit list" rowLabel="Unit" rows={6} rowHref="/wireframe/unit" />}
      {tab === "ar" && (
        <>
          <Box label="Aging buckets" className="min-h-28" />
          <TableBox label="Balances" rowLabel="Unit" rowHref="/wireframe/unit" />
        </>
      )}
      {tab === "work_orders" && <TableBox label="Work order list" rowLabel="Unit" rows={6} rowHref="/wireframe/unit" />}
      <ExpectBox />
    </WfPage>
  );
}

export function UnitScreen() {
  return (
    <WfPage title="Unit">
      <Breadcrumb items={[DASH, PROPERTY, { label: "Unit" }]} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Box label="Unit summary" />
        <Box label="Current lease" />
        <Box label="Current tenant" href="/wireframe/tenant" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Box label="Rent history" className="min-h-28" />
        <Box label="Balance" className="min-h-28" />
      </div>
      <TableBox label="Work orders" rows={4} />
      <ExpectBox />
    </WfPage>
  );
}

export function TenantScreen() {
  return (
    <WfPage title="Tenant">
      <Breadcrumb items={[DASH, PROPERTY, UNIT, { label: "Tenant" }]} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Box label="Tenant summary" />
        <Box label="Lease details" />
        <Box label="Balance" />
      </div>
      <TableBox label="Payment history" rows={5} />
      <Box label="Notes" className="min-h-24" />
      <ExpectBox />
    </WfPage>
  );
}

export function ReportStatusScreen() {
  return (
    <WfPage title="Report status">
      <TableBox label="This month's reports" rowLabel="Property" columns={6} rows={6} />
      <Box label="Missing or late" className="min-h-28" />
      <ExpectBox />
    </WfPage>
  );
}

export const REPORTS: { id: string; label: string }[] = [
  { id: "owner", label: "Owner update" },
  { id: "lp", label: "LP update" },
  { id: "lender", label: "Lender report" },
];

export function ReportsScreen() {
  return (
    <WfPage title="Reports">
      <div className="grid gap-3 sm:grid-cols-3">
        {REPORTS.map((r) => (
          <Box key={r.id} label={r.label} href={`/wireframe/reports/${r.id}`} className="min-h-32" />
        ))}
      </div>
      <ExpectBox />
    </WfPage>
  );
}

export function ReportScreen({ id }: { id: string }) {
  const toast = useToast();
  const report = REPORTS.find((r) => r.id === id) ?? REPORTS[0];
  return (
    <WfPage title={report.label}>
      <Breadcrumb items={[{ label: "Reports", href: "/wireframe/reports" }, { label: report.label }]} />
      <div className="flex items-start justify-between gap-3">
        <Box label="Report title" className="min-h-12 flex-1" />
        <WfButton onClick={() => toast("Export isn't part of the wireframe")}>Export</WfButton>
      </div>
      <Box label="Section" />
      <Box label="Section" />
      <Box label="Section" />
      <ChartBox />
      <ExpectBox />
    </WfPage>
  );
}
