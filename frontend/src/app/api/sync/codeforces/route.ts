import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle")?.trim();

  if (!handle) {
    return NextResponse.json(
      { error: "Handle parameter is required" },
      { status: 400 },
    );
  }

  try {
    // 1. Fetch user info
    const infoRes = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
      { next: { revalidate: 60 } },
    );

    if (!infoRes.ok) {
      return NextResponse.json(
        { error: `Codeforces API returned status ${infoRes.status}` },
        { status: 502 },
      );
    }

    const infoData = await infoRes.json();
    if (infoData.status !== "OK" || !infoData.result?.length) {
      return NextResponse.json(
        { error: `Codeforces handle '${handle}' not found` },
        { status: 404 },
      );
    }

    const user = infoData.result[0];
    const rating = user.rating || 0;
    const rank = user.rank ? `${user.rank} (${rating})` : null;

    // 2. Fetch user status / submissions
    const statusRes = await fetch(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=50`,
      { next: { revalidate: 60 } },
    );

    let easyCount = 0;
    let medCount = 0;
    let hardCount = 0;
    const solvedSet = new Set<string>();
    const recentSubs: Array<{
      title: string;
      difficulty: string;
      timestamp: number;
      url: string;
    }> = [];

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.status === "OK" && Array.isArray(statusData.result)) {
        for (const sub of statusData.result) {
          if (sub.verdict === "OK" && sub.problem) {
            const p = sub.problem;
            const key = `${p.contestId || ""}-${p.index || ""}-${p.name || ""}`;
            if (!solvedSet.has(key)) {
              solvedSet.add(key);

              const probRating = p.rating || 1200;
              let diff = "Medium";
              if (probRating < 1200) {
                diff = "Easy";
                easyCount++;
              } else if (probRating <= 1800) {
                diff = "Medium";
                medCount++;
              } else {
                diff = "Hard";
                hardCount++;
              }

              if (recentSubs.length < 15) {
                const contestId = p.contestId;
                const index = p.index;
                const problemUrl =
                  contestId && index
                    ? `https://codeforces.com/problemset/problem/${contestId}/${index}`
                    : `https://codeforces.com/problemset`;

                recentSubs.push({
                  title: p.name,
                  difficulty: diff,
                  timestamp: sub.creationTimeSeconds || 0,
                  url: problemUrl,
                });
              }
            }
          }
        }
      }
    }

    const totalSolved = solvedSet.size;

    return NextResponse.json({
      platform: "Codeforces",
      handle,
      total_solved: totalSolved,
      easy_solved: easyCount,
      medium_solved: medCount,
      hard_solved: hardCount,
      rank,
      recent_submissions: recentSubs,
      message: `Synced Codeforces handle ${handle}. Total distinct problems: ${totalSolved}`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: `Failed to connect to Codeforces: ${errorMsg}` },
      { status: 500 },
    );
  }
}

