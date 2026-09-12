import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json(
      { error: "Username parameter is required" },
      { status: 400 },
    );
  }

  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          reputation
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
      recentAcSubmissionList(username: $username, limit: 15) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `LeetCode API responded with status ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const matchedUser = data?.data?.matchedUser;

    if (!matchedUser) {
      return NextResponse.json(
        { error: `LeetCode user '${username}' not found` },
        { status: 404 },
      );
    }

    const acCounts: Record<string, number> = {};
    matchedUser.submitStats?.acSubmissionNum?.forEach(
      (item: { difficulty: string; count: number }) => {
        acCounts[item.difficulty] = item.count;
      },
    );

    const ranking = matchedUser.profile?.ranking;
    const recentSubs = data?.data?.recentAcSubmissionList || [];

    return NextResponse.json({
      platform: "LeetCode",
      handle: username,
      total_solved: acCounts["All"] || 0,
      easy_solved: acCounts["Easy"] || 0,
      medium_solved: acCounts["Medium"] || 0,
      hard_solved: acCounts["Hard"] || 0,
      rank: ranking ? `Rank #${ranking.toLocaleString()}` : null,
      recent_submissions: recentSubs.map(
        (sub: { title: string; titleSlug: string; timestamp: string }) => ({
          title: sub.title,
          slug: sub.titleSlug,
          timestamp: parseInt(sub.timestamp, 10),
          url: `https://leetcode.com/problems/${sub.titleSlug}`,
        }),
      ),
      message: `Synced LeetCode profile for ${username}. Total solved: ${acCounts["All"] || 0}`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: `Failed to connect to LeetCode: ${errorMsg}` },
      { status: 500 },
    );
  }
}

