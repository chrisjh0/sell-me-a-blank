import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

const DOMAINS = [
  "home appliances", "B2B SaaS", "wearable tech", "food & beverage",
  "personal finance", "mental health", "fitness & sports", "travel & hospitality",
  "pet care", "education & e-learning", "automotive", "fashion & apparel",
  "real estate tech", "cybersecurity", "agriculture tech", "kids & parenting",
  "senior care", "music & entertainment", "legal tech", "sustainability & green tech",
  "space & aerospace", "dating & relationships",
];

export async function POST() {
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 1.3,
    messages: [
      {
        role: "system",
        content:
          "Generate a creative, original product for a sales pitch trainer. Return ONLY a product name followed by ' – ' and a one-sentence description. No quotes, no extra explanation.",
      },
      {
        role: "user",
        content: `Give me a quirky, specific product from the ${domain} space that I've never heard of before.`,
      },
    ],
    max_tokens: 60,
  });

  const raw =
    completion.choices[0].message.content?.trim() ??
    "AquaLoop – a self-cleaning reusable water bottle that purifies as you drink";

  const dashIndex = raw.indexOf(" – ");
  const name = dashIndex !== -1 ? raw.slice(0, dashIndex).trim() : raw;
  const description = dashIndex !== -1 ? raw.slice(dashIndex + 3).trim() : "";

  return NextResponse.json({ name, description });
}
