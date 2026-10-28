import type { Member, Organization, Role, Session } from "@/lib/types";
import { delay, isNewWorkspace } from "./core";
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

/** The signed-in member, carrying the name and email entered at signup in a new workspace. */
function currentMember(): Member {
  const base = members.find((m) => m.id === CURRENT_MEMBER_ID)!;
  const profile = readOverlay().profile;
  if (!profile) return base;
  return { ...base, name: profile.name, email: profile.email, initials: initialsOf(profile.name) };
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export async function listMembers(orgId: string): Promise<Member[]> {
  await delay();
  const team = isNewWorkspace() ? [currentMember()] : members;
  return [...team, ...readOverlay().members].filter((m) => m.org_id === orgId);
}

export async function getCurrentMember(): Promise<Member> {
  await delay();
  return currentMember();
}

/** Signup: an empty workspace for the company, signed in as the person who created it. */
export function startNewWorkspace(input: { company: string; name: string; email: string }) {
  resetOverlay({
    workspace: "new",
    organization: { name: input.company },
    profile: { name: input.name, email: input.email },
  });
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
    initials: initialsOf(name || input.email),
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
