import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

const FILLER_WORDS = [
  "um", "uh", "like", "basically", "literally", "actually",
  "so", "right", "you know", "kind of", "sort of",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const formData = await req.formData();
  const audio = formData.get("audio") as File;
  const userId = formData.get("userId") as string;

  // Fetch project for context
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, description, notes")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Transcribe with Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  const transcript = transcription.text.trim();
  const duration = (transcription as { duration?: number }).duration ?? 60;

  // Compute metrics
  const words = transcript.split(/\s+/).filter(Boolean);
  const wpm = Math.round((words.length / duration) * 60);
  const fillerCount = words.filter((w) =>
    FILLER_WORDS.includes(w.toLowerCase().replace(/[^a-z ]/g, "").trim())
  ).length;

  // GPT scoring with project context
  const gptRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert pitch coach evaluating a pitch for a specific product. Use the product context below to give targeted, relevant feedback.

Product name: ${project.name}
Product description: ${project.description || "Not provided"}
Speaker's preparation notes: ${project.notes || "None"}

Score the pitch transcript and return a JSON object with exactly this structure:
{
  "content":        { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "clarity":        { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "persuasiveness": { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "pacing":         { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "confidence":     { "score": <0-100>, "strengths": "<string>", "improvements": "<string>" },
  "overall_score":  <average of the 5 scores>,
  "overall_summary": "<2-3 sentences specific to this product and how well the pitch represented it>"
}

Delivery context: ${wpm} words per minute (ideal 120–160), ${fillerCount} filler words detected.
Reference the product name and description in your feedback where relevant.`,
      },
      {
        role: "user",
        content: `Transcript:\n${transcript}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(gptRes.choices[0].message.content ?? "{}");

  // Save to project_pitches
  const { data: pitch, error: dbError } = await supabase
    .from("project_pitches")
    .insert({
      project_id: projectId,
      user_id: userId,
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

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ pitchId: pitch.id, transcript, wpm, fillerCount, ...analysis });
}
