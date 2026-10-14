// AI service abstraction.
// - If OPENAI_API_KEY is configured, descriptions are generated via OpenAI.
// - Otherwise a rule-based offline generator produces polished copy so the
//   feature degrades gracefully. The app is fully usable without AI.

import { z } from "zod";

export interface DescribeProductInput {
  name: string;
  category?: string;
  businessName?: string;
  tone?: "professional" | "friendly" | "luxury";
}

export interface GeneratedDescription {
  text: string;
  source: "ai" | "offline";
}

const TONE_ADJECTIVES: Record<string, string[]> = {
  professional: ["premium", "reliable", "expertly crafted", "high-quality", "dependable"],
  friendly: ["much-loved", "hand-picked", "everyday favourite", "ready for you", "crowd-pleaser"],
  luxury: ["exquisite", "opulent", "refined", "statement", "couture-grade"],
};

const CATEGORY_HOOKS: Record<string, string> = {
  FASHION: "Designed to complete your look",
  BEAUTY: "Crafted for effortless glamour",
  FOOD: "Made fresh with care",
  ELECTRONICS: "Built for everyday performance",
  RESTAURANT: "Prepared to order",
  SERVICES: "Delivered with attention to detail",
  RETAIL: "Quality you can feel",
  HEALTH_WELLNESS: "Made for your wellbeing",
  HOME_FURNITURE: "Made to transform your space",
  AUTOMOTIVE: "Keeps you moving confidently",
  PROFESSIONAL_SERVICES: "Professional results, every time",
  OTHER: "Carefully made for you",
};

function offlineDescribe(input: DescribeProductInput): GeneratedDescription {
  const adjectives = TONE_ADJECTIVES[input.tone ?? "professional"];
  const adj = adjectives[hashString(input.name) % adjectives.length];
  const hook = CATEGORY_HOOKS[input.category ?? "OTHER"] ?? CATEGORY_HOOKS.OTHER;
  const seller = input.businessName ? ` from ${input.businessName}` : "";
  const text =
    `${input.name} — ${hook}. ${capitalize(input.name)} is an ${adj} choice${seller}, ` +
    `offering dependable quality and great value. Order confidently via WhatsApp; ` +
    `we confirm availability and delivery details with every order.`;
  return { text, source: "offline" };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const openaiResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

async function openaiDescribe(input: DescribeProductInput): Promise<GeneratedDescription | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "Write a concise, polished two-to-three sentence product description for a Nigerian online price list. Warm, professional tone. No pricing, no hashtags, no quotes.",
          },
          {
            role: "user",
            content: `Product: ${input.name}${input.category ? ` (category: ${input.category})` : ""}${input.businessName ? ` (business: ${input.businessName})` : ""}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const parsed = openaiResponseSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    const text = parsed.data.choices[0].message.content.trim();
    if (!text) return null;
    return { text, source: "ai" };
  } catch {
    return null;
  }
}

export async function describeProduct(input: DescribeProductInput): Promise<GeneratedDescription> {
  const ai = await openaiDescribe(input);
  if (ai) return ai;
  return offlineDescribe(input);
}
