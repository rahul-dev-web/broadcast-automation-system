import { createClient } from "jsr:@supabase/supabase-js@2";

interface RequestBody {
  matchId: string;
  imageBase64: string;
  expectedTeams: Array<{ teamNumber: number; teamName: string }>;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseResult(text: string, expectedTeams: RequestBody["expectedTeams"]) {
  return text.split(/\r?\n/).map(normalize).filter(Boolean).flatMap((line) => {
    const numbers = (line.match(/\d+/g) ?? []).map(Number);
    const team = expectedTeams.find((item) =>
      line.toLowerCase().includes(item.teamName.toLowerCase()),
    );
    if (!team || numbers.length < 2) return [];
    return [{
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      placement: numbers.find((value) => value >= 1 && value <= 12) ?? null,
      kills: numbers[numbers.length - 1] ?? null,
      rawText: line,
    }];
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405, headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as RequestBody;
    if (!body.matchId || !body.imageBase64 || !body.expectedTeams?.length) {
      return new Response(JSON.stringify({ error: "matchId, imageBase64 and expectedTeams are required" }), {
        status: 400, headers: { "content-type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_VISION_API_KEY is not configured" }), {
        status: 503, headers: { "content-type": "application/json" },
      });
    }

    const image = body.imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: [{ image: { content: image }, features: [{ type: "TEXT_DETECTION" }] }],
        }),
      },
    );

    if (!visionResponse.ok) {
      throw new Error(`Vision API failed: ${visionResponse.status} ${await visionResponse.text()}`);
    }

    const vision = await visionResponse.json();
    const annotation = vision.responses?.[0];
    const rawText = annotation?.fullTextAnnotation?.text
      ?? annotation?.textAnnotations?.[0]?.description
      ?? "";
    const proposed = parseResult(rawText, body.expectedTeams);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.from("ocr_results").insert({
      match_id: body.matchId,
      source_type: "FINAL_STANDING",
      raw_ocr_data: vision,
      parsed_data: { results: proposed },
      confidence: null,
      status: "PROPOSED",
    }).select("id, match_id, parsed_data, status, created_at").single();

    if (error) throw error;

    return new Response(JSON.stringify({
      ocrResultId: data.id,
      status: data.status,
      rawText,
      proposed: data.parsed_data.results,
    }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "OCR processing failed",
    }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
});