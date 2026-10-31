
export async function onRequestOptions({ request, env }) {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGIN;

  if (origin !== allowed) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");

  if (origin !== env.ALLOWED_ORIGIN) {
    return json({ success: false, message: "Origin ditolak." }, 403);
  }

  try {
    const data = await request.json();

    if (!data.image || !data.mode) {
      return json({
        success: false,
        message: "Data foto tidak lengkap."
      }, 400, origin);
    }

    if (!["1", "3", "4"].includes(String(data.mode))) {
      return json({
        success: false,
        message: "Mode foto tidak valid."
      }, 400, origin);
    }

    if (data.image.length > 12 * 1024 * 1024) {
      return json({
        success: false,
        message: "Ukuran foto terlalu besar."
      }, 413, origin);
    }

    const response = await fetch(env.GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: data.image,
        mode: String(data.mode),
        secret: env.API_SECRET
      }),
      redirect: "follow"
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return json({
        success: false,
        message: result.message || "Backend gagal memproses foto."
      }, 502, origin);
    }

    return json(result, 200, origin);

  } catch (error) {
    return json({
      success: false,
      message: error.message || "Terjadi kesalahan server."
    }, 500, origin);
  }
}

function json(data, status = 200, origin = "") {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}
