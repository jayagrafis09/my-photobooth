export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const jsonResponse = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/" && request.method === "GET") {
      return jsonResponse({ success: true, app: "MY PHOTOBOOTH API", status: "active" });
    }

    if (request.method === "POST" && ["/api/upload", "/api/admin/login"].includes(url.pathname)) {
      try {
        let body;
        try { body = await request.json(); }
        catch { return jsonResponse({ success: false, message: "Request bukan JSON yang valid." }, 400); }

        if (!env.GAS_URL || !env.API_SECRET) {
          return jsonResponse({ success: false, message: "Konfigurasi GAS_URL atau API_SECRET belum lengkap di Cloudflare." }, 500);
        }

        if (url.pathname === "/api/upload" && !body.image) {
          return jsonResponse({ success: false, message: "Data foto tidak ditemukan." }, 400);
        }
        if (url.pathname === "/api/admin/login" && !body.pin) {
          return jsonResponse({ success: false, message: "PIN admin wajib diisi." }, 400);
        }

        const payload = url.pathname === "/api/admin/login"
          ? { secret: env.API_SECRET, action: "adminLogin", pin: String(body.pin) }
          : { secret: env.API_SECRET, image: body.image, mode: body.mode || "single" };

        const gasResponse = await fetch(env.GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "follow",
        });
        const responseText = await gasResponse.text();
        let result;
        try { result = JSON.parse(responseText); }
        catch {
          const preview = responseText ? responseText.slice(0, 300).replace(/\\s+/g, " ") : "(respons kosong)";
          return jsonResponse({
            success: false,
            message: "Google Apps Script tidak mengembalikan JSON yang valid. HTTP " + gasResponse.status + ". Respons: " + preview,
          }, 502);
        }
        if (!gasResponse.ok) {
          return jsonResponse({ success: false, message: result.message || ("Google Apps Script merespons HTTP " + gasResponse.status + ".") }, 502);
        }
        return jsonResponse(result, 200);
      } catch (error) {
        return jsonResponse({ success: false, message: error.message || "Terjadi kesalahan pada Cloudflare Worker." }, 500);
      }
    }

    return jsonResponse({ success: false, message: "Endpoint tidak ditemukan." }, 404);
  },
};