import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId, name, description, notes } = await req.json();
  if (!userId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name, description: description ?? "", notes: notes ?? "" })
    .select("id, name, description, notes, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
