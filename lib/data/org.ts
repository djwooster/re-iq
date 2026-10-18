import type { Member, Organization, Role, Session } from "@/lib/types";
import { delay } from "./core";
import { CURRENT_MEMBER_ID, ORG_ID, members, organization } from "./mock/catalog";
import { readOverlay, resetOverlay, writeOverlay } from "./store";

export const SESSION_COOKIE = "reiq_session";

/** Mock session: the demo always signs in as the same member of the same org. */
export function getSession(): Session {
  return { member_id: CURRENT_MEMBER_ID, org_id: ORG_ID };
}

export async function getOrganization(orgId: string): Promise<Organization & { logo: string | null }> {
  await delay();
  const patch = readOverlay().organization;
  return { ...organization, logo: null, ...patch, id: orgId };
}

export async function updateOrganization(orgId: string, patch: { name?: string; logo?: string | null }) {
  await delay(400);
  writeOverlay((d) => {
    d.organization = { ...d.organization, ...patch };
  });
}

export async function listMembers(orgId: string): Promise<Member[]> {
  await delay();
  return [...members, ...readOverlay().members].filter((m) => m.org_id === orgId);
}

export async function getCurrentMember(): Promise<Member> {
  await delay();
  return members.find((m) => m.id === CURRENT_MEMBER_ID)!;
}

export async function inviteMember(orgId: string, input: { email: string; role: Member["role"] }) {
  await delay(600);
  const local = input.email.split("@")[0];
  const name = local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
  const member: Member = {
    id: `mem_inv_${Date.now()}`,
    org_id: orgId,
    name: name || input.email,
    email: input.email,
    title: "Invited",
    role: input.role,
    status: "invited",
    initials: (name || input.email).split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase(),
  };
  writeOverlay((d) => {
    d.members.push(member);
  });
  return member;
}

/** Internal role preview, used by the dev-only switcher. */
export function getRole(): Role {
  return readOverlay().role;
}

export function setRole(role: Role) {
  writeOverlay((d) => {
    d.role = role;
  });
}

export function resetDemoData() {
  resetOverlay();
}
