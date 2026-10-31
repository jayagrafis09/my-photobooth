
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({
        success: true,
        app: "MY PHOTOBOOTH API",
        status: "active",
      }, {
        headers: corsHeaders,
      });
    }

    // Upload endpoint
    if (url.pathname === "/api/upload" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.image) {
          return Response.json({
            success: false,
            message: "Data foto tidak ditemukan",
          }, {
            status: 400,
            headers: corsHeaders,
          });
        }

        if (!env.GAS_URL || !env.API_SECRET) {
          throw new Error("Konfigurasi backend belum lengkap");
        }

        const response = await fetch(env.GAS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret: env.API_SECRET,
            image: body.image,
            mode: body.mode || "single",
          }),
          redirect: "follow",
        });

        const result = await response.json();

        return Response.json(result, {
          status: response.ok ? 200 : 502,
          headers: corsHeaders,
        });

      } catch (error) {
        return Response.json({
          success: false,
          message: error.message || "Upload gagal",
        }, {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return Response.json({
      success: false,
      message: "Endpoint tidak ditemukan",
    }, {
      status: 404,
      headers: corsHeaders,
    });
  },
};
