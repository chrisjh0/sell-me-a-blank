import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const { data, error } = await supabase
    .from("project_pitches")
    .select(
      "id, transcript, words_per_minute, filler_words, " +
      "content_score, content_strengths, content_improvements, " +
      "clarity_score, clarity_strengths, clarity_improvements, " +
      "persuasiveness_score, persuasiveness_strengths, persuasiveness_improvements, " +
      "pacing_score, pacing_strengths, pacing_improvements, " +
      "confidence_score, confidence_strengths, confidence_improvements, " +
      "overall_score, overall_summary, created_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
