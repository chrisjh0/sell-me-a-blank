import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File;
  const prompt = formData.get("prompt") as string;
  const userId = formData.get("userId") as string;

  // Transcribe with Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  const transcript = transcription.text;
  const duration = (transcription as { duration?: number }).duration ?? 60;

  // Compute metrics
  const words = transcript.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wpm = Math.round((wordCount / duration) * 60);

  const fillerWordList = [
    "um", "uh", "like", "basically", "literally", "actually", "so", "right",
  ];
  const fillerCount = words.filter((w) =>
    fillerWordList.includes(w.toLowerCase().replace(/[^a-z]/g, ""))
  ).length;

  // GPT scoring
  const gptResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional pitch coach. Analyze the pitch transcript and return a JSON object with this exact structure:
{
  "content": { "score": 0-100, "strengths": "string", "improvements": "string" },
  "clarity": { "score": 0-100, "strengths": "string", "improvements": "string" },
  "persuasiveness": { "score": 0-100, "strengths": "string", "improvements": "string" },
  "pacing": { "score": 0-100, "strengths": "string", "improvements": "string" },
  "confidence": { "score": 0-100, "strengths": "string", "improvements": "string" },
  "overall_score": number,
  "overall_summary": "2-3 sentence summary of strengths and weaknesses"
}
The overall_score should be the average of all 5 category scores.
Context: words per minute was ${wpm} (ideal range is 120-160 wpm), filler words detected: ${fillerCount}.`,
      },
      {
        role: "user",
        content: `Pitch topic: "${prompt}"\n\nTranscript:\n${transcript}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(
    gptResponse.choices[0].message.content ?? "{}"
  );

  // Save pitch to Supabase
  const { data: pitch, error } = await supabase
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
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update streak
  await updateStreak(userId);

  return NextResponse.json({
    ...analysis,
    pitchId: pitch.id,
    wpm,
    fillerCount,
    transcript,
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

  const lastDate = user.last_pitch_date as string | null;
  let newStreak = 1;

  if (lastDate) {
    if (lastDate === today) {
      newStreak = user.streak as number;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      newStreak = lastDate === yesterdayStr ? (user.streak as number) + 1 : 1;
    }
  }

  await supabase
    .from("users")
    .update({ streak: newStreak, last_pitch_date: today })
    .eq("id", userId);
}
