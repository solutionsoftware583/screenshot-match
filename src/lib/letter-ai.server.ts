// Server-only: drafts a removal-request letter through Lovable AI Gateway.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const LETTER_MODEL = "openai/gpt-6-astra";

const INSTRUCTIONS = `You draft formal, factual content-removal requests that an organization sends to a review platform.
Rules:
- Use only the facts provided. Never invent dates, names, policy numbers, or evidence.
- Reference the platform's content policy in general terms unless a specific policy is given.
- Never threaten, never claim removal is guaranteed, never give legal advice.
- Mark anything the sender must fill in as [PLACEHOLDER].
- Plain text only: subject line, greeting, body, list of attached evidence, polite closing with [SENDER NAME] and organization.`;

export async function draftLetterText(input: {
  orgName: string;
  title: string;
  platform: string;
  reviewUrl: string | null;
  reason: string;
  extra: string;
  evidence: { title: string; kind: string; notes: string | null; sha256: string | null; captured_at: string }[];
}) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI drafting is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const facts = [
    `Organization: ${input.orgName}`,
    `Platform: ${input.platform}`,
    `Case title: ${input.title}`,
    `Review link: ${input.reviewUrl ?? "[REVIEW LINK]"}`,
    `Why it should be removed: ${input.reason}`,
    input.extra ? `Additional details from the admin: ${input.extra}` : "",
    "Evidence on file:",
    ...input.evidence.map(
      (e, i) =>
        `${i + 1}. ${e.title} (${e.kind}, recorded ${e.captured_at.slice(0, 10)})${e.notes ? ` – ${e.notes}` : ""}${e.sha256 ? ` [SHA-256 ${e.sha256.slice(0, 16)}…]` : ""}`,
    ),
  ]
    .filter(Boolean)
    .join("\n");

  let result;
  try {
    result = streamText({
      model: provider.responses(LETTER_MODEL),
      system: INSTRUCTIONS,
      messages: [{ role: "user", content: `Draft the removal request letter.\n\n${facts}` }],
      maxRetries: 0,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = (await result.text).trim();
    if (!text) throw new Error("The AI returned no draft. Please try again later.");
    return text;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 402) throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
    if (status === 429) throw new Error("The AI is busy right now. Please wait a minute and try again.");
    if (status === 403) throw new Error("AI drafting is blocked for this workspace.");
    throw e instanceof Error ? e : new Error("Drafting failed");
  }
}
