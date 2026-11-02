// Server-only: evidence-grounded approval summary through Lovable AI Gateway.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const REVIEW_MODEL = "openai/gpt-6-astra";

const INSTRUCTIONS = `You help an approver decide whether a review-removal case is ready to submit to a platform.
Rules:
- Use only the case facts and evidence listed. Never invent facts. Cite evidence by its number, e.g. [E2].
- If a claim in the reason has no supporting evidence, say so.
- Never predict or promise that removal will succeed. Do not give legal advice. Do not make the decision.
Output plain text, at most ~200 words, in exactly these sections:
SUMMARY: 2-3 sentences.
EVIDENCE SUPPORT: bullet list of what each relevant evidence item shows.
KEY CONCERNS: bullet list (gaps, weak or missing evidence, policy fit, wording risks). Write "None found" if none.
QUESTIONS FOR THE REQUESTER: bullet list, or "None".`;

export async function reviewSummaryText(input: {
  title: string;
  platform: string;
  reviewUrl: string | null;
  reason: string;
  focus: string;
  evidence: { title: string; kind: string; notes: string | null; sha256: string | null; captured_at: string }[];
}) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI review is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const facts = [
    `Platform: ${input.platform}`,
    `Case title: ${input.title}`,
    `Review link: ${input.reviewUrl ?? "(none given)"}`,
    `Stated reason for removal: ${input.reason}`,
    input.focus ? `Approver wants extra attention on: ${input.focus}` : "",
    input.evidence.length ? "Evidence on file:" : "Evidence on file: NONE",
    ...input.evidence.map(
      (e, i) =>
        `[E${i + 1}] ${e.title} (${e.kind}, recorded ${e.captured_at.slice(0, 10)})${e.notes ? ` – ${e.notes}` : ""}${e.sha256 ? " [file hash recorded]" : ""}`,
    ),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = streamText({
      model: provider.responses(REVIEW_MODEL),
      system: INSTRUCTIONS,
      messages: [{ role: "user", content: `Review this pending case.\n\n${facts}` }],
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
    if (!text) throw new Error("The AI returned no summary. Please try again later.");
    return text;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 402) throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
    if (status === 429) throw new Error("The AI is busy right now. Please wait a minute and try again.");
    if (status === 403) throw new Error("AI review is blocked for this workspace.");
    throw e instanceof Error ? e : new Error("Summary failed");
  }
}
