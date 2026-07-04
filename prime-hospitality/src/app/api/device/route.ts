import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegramId, performanceClass } = body;

    if (!telegramId || !performanceClass) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase admin credentials");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the device performance metric silently
    // This requires the device_performance column to be created in the DB!
    const { error } = await supabase
      .from("users")
      .update({ device_performance: performanceClass })
      .eq("telegram_id", telegramId.toString());

    if (error) {
      // If the column doesn't exist, it might fail, we catch and log but don't break the client
      console.error("[Device Sync Error]", error.message);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Device Sync Route Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
