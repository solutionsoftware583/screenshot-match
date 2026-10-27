// Service layer. The backend is NOT connected yet (planned for later parts),
// so every reader returns an empty collection with connected: false.
// UI components must never fabricate records.
import type {
  AuditLog,
  Business,
  Case,
  ContentFinding,
  Evidence,
  Integration,
  Review,
  ServiceResult,
  Submission,
  TeamMember,
  Tenant,
} from "@/lib/contracts";

export const BACKEND_CONNECTED = false;

function empty<T>(): ServiceResult<T[]> {
  return { data: [], connected: BACKEND_CONNECTED };
}

export const services = {
  reviews: { list: async () => empty<Review>(), get: async (_id: string) => null as Review | null },
  findings: { list: async () => empty<ContentFinding>() },
  cases: { list: async () => empty<Case>(), get: async (_id: string) => null as Case | null },
  evidence: { list: async () => empty<Evidence>() },
  submissions: { list: async () => empty<Submission>() },
  businesses: { list: async () => empty<Business>() },
  team: { list: async () => empty<TeamMember>() },
  tenants: { list: async () => empty<Tenant>() },
  audit: { list: async () => empty<AuditLog>() },
};

// Catalogue of integrations we plan to support. Status reflects reality: none are built.
export const INTEGRATION_CATALOGUE: Integration[] = [
  { key: "google", name: "Google Business Profile", description: "Read reviews and file flagging requests.", status: "not_available" },
  { key: "yelp", name: "Yelp", description: "Monitor reviews for listed locations.", status: "not_available" },
  { key: "trustpilot", name: "Trustpilot", description: "Monitor and report reviews.", status: "not_available" },
  { key: "facebook", name: "Facebook Pages", description: "Monitor page recommendations.", status: "not_available" },
  { key: "web", name: "Web search monitoring", description: "Discover mentions across the open web.", status: "not_available" },
  { key: "slack", name: "Slack", description: "Send case alerts to channels.", status: "not_available" },
];
