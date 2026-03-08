import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

const FILLER_WORDS = [
  "um", "uh", "like", "basically", "literally", "actually",
  "so", "right", "you know", "kind of", "sort of",
];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File;
  const prompt = formData.get("prompt") as string;
  const userId = formData.get("userId") as string;

  // 1. Transcribe with Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  const transcript = transcription.text.trim();
  const duration = (transcription as { duration?: number }).duration ?? 60;

  // 2. Compute metrics
  const words = transcript.split(/\s+/).filter(Boolean);
  const wpm = Math.round((words.length / duration) * 60);
  const fillerCount = words.filter((w) =>
    FILLER_WORDS.includes(w.toLowerCase().replace(/[^a-z ]/g, "").trim())
  ).length;

  // 3. GPT scoring
  const gptRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert pitch coach. Score the following sales pitch transcript and return a JSON object with exactly this structure:
{
  "content":        { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "clarity":        { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "persuasiveness": { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "pacing":         { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "confidence":     { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "overall_score":  <average of the 5 scores>,
  "overall_summary": "<2-3 sentences summarizing the pitch's main strengths and areas to improve>"
}

Scoring context:
- Words per minute: ${wpm} (ideal is 120–160 wpm)
- Filler words detected: ${fillerCount}
Keep strengths and improvements concise (1-2 sentences each).`,
      },
      {
        role: "user",
        content: `Pitch topic: "${prompt}"\n\nTranscript:\n${transcript}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(gptRes.choices[0].message.content ?? "{}");

  // 4. Save to Supabase
  const { data: pitch, error: dbError } = await supabase
    .from("pitches")
    .insert({
      user_id: userId,
      prompt,
      transcript,
      words_per_minute: wpm,
      filler_words: fillerCount,
      content_score: analysis.content?.score,
      content_strengths: analysis.content?.strengths,
      content_improvements: analysis.content?.improvements,
      clarity_score: analysis.clarity?.score,
      clarity_strengths: analysis.clarity?.strengths,
      clarity_improvements: analysis.clarity?.improvements,
      persuasiveness_score: analysis.persuasiveness?.score,
      persuasiveness_strengths: analysis.persuasiveness?.strengths,
      persuasiveness_improvements: analysis.persuasiveness?.improvements,
      pacing_score: analysis.pacing?.score,
      pacing_strengths: analysis.pacing?.strengths,
      pacing_improvements: analysis.pacing?.improvements,
      confidence_score: analysis.confidence?.score,
      confidence_strengths: analysis.confidence?.strengths,
      confidence_improvements: analysis.confidence?.improvements,
      overall_score: analysis.overall_score,
      overall_summary: analysis.overall_summary,
    })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // 5. Update streak
  await updateStreak(userId);

  return NextResponse.json({
    pitchId: pitch.id,
    transcript,
    wpm,
    fillerCount,
    ...analysis,
  });
}

async function updateStreak(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: user } = await supabase
    .from("users")
    .select("streak, last_pitch_date")
    .eq("id", userId)
    .single();

  if (!user) return;

  const last = user.last_pitch_date as string | null;
  let newStreak = 1;

  if (last === today) {
    newStreak = user.streak as number; // already pitched today, no change
  } else if (last) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    newStreak = last === yesterdayStr ? (user.streak as number) + 1 : 1;
  }

  await supabase
    .from("users")
    .update({ streak: newStreak, last_pitch_date: today })
    .eq("id", userId);
}
