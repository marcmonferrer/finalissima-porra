import { createClient } from "npm:@supabase/supabase-js@2";

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;
const FINAL_DATE = "2026-07-19";
const MATCH_START = new Date("2026-07-19T19:00:00Z");
const SYNC_START = new Date(MATCH_START.getTime() - 10 * 60 * 1000);
const SYNC_END = new Date(MATCH_START.getTime() + 3 * 60 * 60 * 1000);
const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

function getSupabaseSecret() {
  const currentKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (currentKeys) return JSON.parse(currentKeys).default;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function normalizeTeam(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isSpain(name) {
  const normalized = normalizeTeam(name);
  return normalized === "spain" || normalized === "espana";
}

function isArgentina(name) {
  return normalizeTeam(name) === "argentina";
}

function containsFinalTeams(fixture) {
  const names = [fixture.teams.home.name, fixture.teams.away.name];
  return names.some(isSpain) && names.some(isArgentina);
}

function mapScore(fixture, section) {
  const homeIsSpain = isSpain(fixture.teams.home.name);
  const score = section === "goals" ? fixture.goals : fixture.score[section];
  return homeIsSpain
    ? { spain: score.home, argentina: score.away }
    : { spain: score.away, argentina: score.home };
}

function mapPhase(status) {
  if (status === "1H") return "first";
  if (status === "HT") return "half";
  if (["2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(status)) return "second";
  if (FINAL_STATUSES.has(status)) return "final";
  return "pre";
}

async function apiFootball(path, apiKey) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey }
  });
  if (!response.ok) throw new Error(`API-Football HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors && Object.keys(payload.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(payload.errors)}`);
  }
  return payload.response;
}

Deno.serve(async request => {
  try {
    const expectedSecret = Deno.env.get("SYNC_SECRET");
    if (!expectedSecret || request.headers.get("x-sync-secret") !== expectedSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecret = getSupabaseSecret();
    if (!apiKey || !supabaseUrl || !supabaseSecret) {
      throw new Error("Missing Edge Function secrets");
    }

    const now = new Date();
    if (now < SYNC_START || now > SYNC_END) {
      return Response.json({ skipped: true, reason: "outside-match-window" });
    }

    const db = createClient(supabaseUrl, supabaseSecret);
    const { data: match, error: matchError } = await db
      .from("partit")
      .select("provider_fixture_id, provider_status")
      .eq("id", 1)
      .single();
    if (matchError) throw matchError;
    if (FINAL_STATUSES.has(match.provider_status)) {
      return Response.json({ skipped: true, reason: "match-finished" });
    }

    let fixtureId = match.provider_fixture_id;
    if (!fixtureId) {
      const fixtures = await apiFootball(
        `/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}&date=${FINAL_DATE}`,
        apiKey
      );
      const final = fixtures.find(containsFinalTeams);
      if (!final) throw new Error("Spain–Argentina final not found in API-Football");
      fixtureId = final.fixture.id;
    }

    const fixtures = await apiFootball(`/fixtures?id=${fixtureId}`, apiKey);
    const live = fixtures[0];
    if (!live || !containsFinalTeams(live)) throw new Error("Unexpected fixture returned");

    const score = mapScore(live, "goals");
    const half = live.score.halftime.home === null || live.score.halftime.away === null
      ? null
      : mapScore(live, "halftime");
    const status = live.fixture.status.short;
    const phase = mapPhase(status);
    const patch = {
      fase: phase,
      minut: live.fixture.status.elapsed ?? 0,
      espanya: score.spain ?? 0,
      argentina: score.argentina ?? 0,
      espanya_mitja: half?.spain ?? null,
      argentina_mitja: half?.argentina ?? null,
      provider_fixture_id: fixtureId,
      provider_status: status,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await db.from("partit").update(patch).eq("id", 1);
    if (updateError) throw updateError;
    return Response.json({ ok: true, fixtureId, status, score });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
