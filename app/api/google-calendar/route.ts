import { NextRequest, NextResponse } from "next/server";

/**
 * Google Calendar API integration
 * 
 * Setup required:
 * 1. Go to https://console.cloud.google.com
 * 2. Create project → Enable Google Calendar API
 * 3. Create OAuth 2.0 credentials (Web application)
 * 4. Add redirect URI: http://localhost:3000/api/google-calendar/callback
 * 5. Set environment variables in .env.local:
 *    GOOGLE_CLIENT_ID=...
 *    GOOGLE_CLIENT_SECRET=...
 *    GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google-calendar/callback";
const SCOPES = "https://www.googleapis.com/auth/calendar";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "auth-url") {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: "GOOGLE_CLIENT_ID가 설정되지 않았습니다." }, { status: 500 });
    }
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    return NextResponse.json({ url: authUrl.toString() });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, accessToken, events } = body;

    if (action === "add-events") {
      if (!accessToken) return NextResponse.json({ error: "accessToken 필요" }, { status: 401 });
      const results = [];
      for (const ev of events) {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ev),
        });
        const data = await res.json();
        results.push({ id: ev.summary, status: res.ok ? "success" : "error", data });
      }
      return NextResponse.json({ results });
    }

    if (action === "delete-events") {
      if (!accessToken) return NextResponse.json({ error: "accessToken 필요" }, { status: 401 });
      const { eventIds } = body;
      const results = [];
      for (const id of eventIds) {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        results.push({ id, status: res.ok ? "deleted" : "error" });
      }
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
