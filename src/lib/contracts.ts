// Typed data contracts for future backend integration (Part 2+).
// No production data exists yet — services return empty collections.

export type ID = string;
export type ISODate = string;

export type CaseStatus =
  | "draft"
  | "under_review"
  | "awaiting_approval"
  | "submitted"
  | "platform_responded"
  | "appealed"
  | "closed";
export type Priority = "low" | "medium" | "high" | "critical";
export type Platform = "google" | "yelp" | "trustpilot" | "facebook" | "web" | "other";

export interface Review {
  id: ID;
  businessId: ID;
  platform: Platform;
  author: string;
  rating: number;
  body: string;
  url: string;
  postedAt: ISODate;
  flagged: boolean;
}

export interface ContentFinding {
  id: ID;
  url: string;
  platform: Platform;
  category: string;
  discoveredAt: ISODate;
  riskScore: number | null;
}

export interface AiAssessment {
  verdict: "likely_policy_violation" | "uncertain" | "unlikely_violation";
  confidence: number;
  rationale: string;
  policyReferences: string[];
}

export interface Evidence {
  id: ID;
  caseId: ID | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: ISODate;
}

export interface CaseEvent {
  id: ID;
  at: ISODate;
  actor: string;
  type: "note" | "status" | "approval" | "submission" | "platform_response" | "appeal" | "audit";
  visibility: "internal" | "client";
  message: string;
}

export interface Case {
  id: ID;
  reference: string;
  platform: Platform;
  targetUrl: string;
  status: CaseStatus;
  priority: Priority;
  category: string;
  ownerName: string | null;
  team: string | null;
  followUpAt: ISODate | null;
  assessment: AiAssessment | null;
  evidence: Evidence[];
  events: CaseEvent[];
  createdAt: ISODate;
}

export interface Submission {
  id: ID;
  caseId: ID;
  platform: Platform;
  submittedAt: ISODate;
  outcome: "pending" | "accepted" | "rejected" | "unverified";
}

export interface Business {
  id: ID;
  name: string;
  locations: number;
  createdAt: ISODate;
}

export interface TeamMember {
  id: ID;
  name: string;
  email: string;
  role: "owner" | "admin" | "analyst" | "viewer";
}

export interface Integration {
  key: string;
  name: string;
  description: string;
  status: "not_connected" | "not_available" | "connected" | "error";
}

export interface Tenant {
  id: ID;
  name: string;
  plan: string;
  users: number;
  createdAt: ISODate;
}

export interface AuditLog {
  id: ID;
  at: ISODate;
  actor: string;
  action: string;
  target: string;
}

export interface ServiceResult<T> {
  data: T;
  connected: boolean;
}
