Deno.serve((request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST,OPTIONS",
      },
    });
  }

  return new Response(
    JSON.stringify({
      error: "This OCR endpoint is deprecated. Use cloud-final-standing-ocr.",
    }),
    {
      status: 410,
      headers: { "content-type": "application/json" },
    },
  );
});
