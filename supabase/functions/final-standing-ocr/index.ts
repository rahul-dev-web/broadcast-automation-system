import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFinalStandingBoxes } from "../_shared/final-standing-parser.ts";

interface RequestBody {
  matchId: string;
  imageBase64: string;
  expectedTeams: Array<{ teamNumber: number; teamName: string }>;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as RequestBody;
    if (!body.matchId || !body.imageBase64 || !body.expectedTeams?.length) {
      return new Response(
        JSON.stringify({ error: "matchId, imageBase64 and expectedTeams are required" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    if (body.expectedTeams.length > 12) {
      return new Response(JSON.stringify({ error: "At most 12 teams are supported." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GOOGLE_VISION_API_KEY is not configured. Final OCR is a future-phase integration until Vision billing/API setup is enabled.",
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }

    const image = body.imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [{ type: "TEXT_DETECTION" }],
          }],
        }),
      },
    );

    if (!visionResponse.ok) {
      throw new Error(
        `Vision API failed: ${visionResponse.status} ${await visionResponse.text()}`,
      );
    }

    const vision = await visionResponse.json();
    const annotation = vision.responses?.[0];
    const rawText =
      annotation?.fullTextAnnotation?.text ??
      annotation?.textAnnotations?.[0]?.description ??
      "";

    const boxes = (annotation?.textAnnotations ?? [])
      .slice(1)
      .map((item: any) => {
        const vertices = item.boundingPoly?.vertices ?? [];
        const xs = vertices.map((vertex: any) => Number(vertex.x ?? 0));
        const ys = vertices.map((vertex: any) => Number(vertex.y ?? 0));
        const minX = xs.length ? Math.min(...xs) : 0;
        const maxX = xs.length ? Math.max(...xs) : minX;
        const minY = ys.length ? Math.min(...ys) : 0;
        const maxY = ys.length ? Math.max(...ys) : minY;
        return {
          text: String(item.description ?? ""),
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
          confidence: null,
        };
      });

    const proposed = parseFinalStandingBoxes(boxes, body.expectedTeams);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase
      .from("ocr_results")
      .insert({
        match_id: body.matchId,
        source_type: "FINAL_STANDING",
        raw_ocr_data: {
          fullText: rawText,
          textAnnotations: annotation?.textAnnotations ?? [],
          boxCount: boxes.length,
        },
        parsed_data: { results: proposed },
        confidence: null,
        status: "PROPOSED",
      })
      .select("id, match_id, parsed_data, status, created_at")
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        ocrResultId: data.id,
        status: data.status,
        rawText,
        detectedBoxCount: boxes.length,
        proposed: data.parsed_data.results,
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "OCR processing failed",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});
