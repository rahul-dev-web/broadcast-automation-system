import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFinalStandingBoxes } from "../_shared/final-standing-parser.ts";

interface RequestBody {
  matchId: string;
  imageBase64: string;
  expectedTeams: Array<{ teamNumber: number; teamName: string }>;
  requestId?: string;
}

const jsonHeaders = { "content-type": "application/json" };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "POST required" }, 405);

  try {
    const body = (await request.json()) as RequestBody;

    if (!body.matchId || !body.imageBase64 || !body.expectedTeams?.length) {
      return response(
        { error: "matchId, imageBase64 and expectedTeams are required" },
        400,
      );
    }

    if (body.expectedTeams.length > 12) {
      return response({ error: "At most 12 teams are supported." }, 400);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return response({ error: "Authentication required" }, 401);
    }

    const visionApiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!visionApiKey) {
      return response(
        { error: "Cloud OCR is not configured." },
        503,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return response({ error: "Supabase function configuration is incomplete." }, 503);
    }

    // Service-role client is used only for server-side data lookup/write.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Resolve the workspace from the match instead of trusting a client-supplied
    // organization id. The quota RPC then verifies the caller's membership.
    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("id, tournament_id, tournaments!inner(id, organization_id)")
      .eq("id", body.matchId)
      .single();

    if (matchError || !match) {
      return response({ error: "Match not found." }, 404);
    }

    const tournament = Array.isArray(match.tournaments)
      ? match.tournaments[0]
      : match.tournaments;

    if (!tournament?.organization_id) {
      return response({ error: "Match workspace could not be resolved." }, 400);
    }

    // This client keeps the caller's JWT so auth.uid() inside the SECURITY
    // DEFINER quota RPC is the actual signed-in operator.
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });

    const requestId = body.requestId?.trim() || crypto.randomUUID();

    // One cloud final-standing request consumes one Cloud OCR Unit.
    // Quota is checked and consumed atomically before the external provider call.
    const { data: usage, error: usageError } = await userClient.rpc(
      "consume_ocr_units",
      {
        p_organization_id: tournament.organization_id,
        p_units: 1,
        p_source_type: "FINAL_STANDING",
        p_tournament_id: tournament.id,
        p_match_id: body.matchId,
        p_provider: "GOOGLE_VISION",
        p_request_id: requestId,
        p_metadata: {
          feature: "final-standing-ocr",
          requested_team_count: body.expectedTeams.length,
        },
      },
    );

    if (usageError) {
      const message = usageError.message || "OCR quota request failed";
      const status =
        message.includes("Authentication required") ? 401 :
        message.includes("not available") || message.includes("Pro feature") ? 403 :
        message.includes("quota exceeded") ? 402 :
        400;
      return response({ error: message }, status);
    }

    const image = body.imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(visionApiKey)}`,
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

    const { data, error } = await admin
      .from("ocr_results")
      .insert({
        match_id: body.matchId,
        source_type: "FINAL_STANDING",
        raw_ocr_data: {
          fullText: rawText,
          textAnnotations: annotation?.textAnnotations ?? [],
          boxCount: boxes.length,
          cloudUsage: usage,
        },
        parsed_data: { results: proposed },
        confidence: null,
        status: "PROPOSED",
      })
      .select("id, match_id, parsed_data, status, created_at")
      .single();

    if (error) throw error;

    return response({
      ocrResultId: data.id,
      status: data.status,
      rawText,
      detectedBoxCount: boxes.length,
      proposed: data.parsed_data.results,
      usage,
    });
  } catch (error) {
    return response({
      error: error instanceof Error ? error.message : "OCR processing failed",
    }, 500);
  }
});
