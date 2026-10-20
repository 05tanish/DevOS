import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { addDays, startOfDay, endOfDay, subDays, differenceInDays } from 'date-fns';
import type { CreateDsaProblemDto, UpdateDsaProblemDto } from './dsa.schema';
import { Prisma } from '@prisma/client';
import * as redis from '../../services/redis.service';

export const invalidateDsaCache = async (userId: string) => {
  try {
    await Promise.all([
      redis.del(`cache:dsa:stats:${userId}`),
      redis.del(`cache:dashboard:stats:${userId}`),
    ]);
  } catch (err) {
    console.error('❌ Failed to invalidate DSA cache:', err);
  }
};

// Spaced repetition intervals: Day 1, 3, 7, 15, 30, 60, 90
const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60, 90];

const createRevisions = async (problemId: string, solvedAt: Date) => {
  const revisionData = REVISION_INTERVALS.map((days) => ({
    problemId,
    dueDate: addDays(solvedAt, days),
    dayInterval: days,
  }));
  await prisma.dsaRevision.createMany({ data: revisionData });
};

export const createProblem = async (userId: string, dto: CreateDsaProblemDto) => {
  const solvedAt = dto.solvedAt ? new Date(dto.solvedAt) : new Date();

  const problem = await prisma.dsaProblem.create({
    data: {
      userId,
      name: dto.name,
      difficulty: dto.difficulty,
      platform: dto.platform,
      problemUrl: dto.problemUrl || null,
      solutionUrl: dto.solutionUrl || null,
      code: dto.code,
      videoLinks: dto.videoLinks,
      notes: dto.notes,
      tags: dto.tags,
      topics: dto.topics,
      personalRating: dto.personalRating,
      timeTaken: dto.timeTaken,
      mistakes: dto.mistakes,
      solvedAt,
    },
    include: { revisions: true },
  });

  await createRevisions(problem.id, solvedAt);
  await invalidateDsaCache(userId);
  return prisma.dsaProblem.findUnique({
    where: { id: problem.id },
    include: { revisions: { orderBy: { dueDate: 'asc' } } },
  });
};

export const getProblems = async (
  userId: string,
  query: {
    difficulty?: string;
    platform?: string;
    topic?: string;
    tag?: string;
    search?: string;
    page: number;
    limit: number;
  }
) => {
  const where: Prisma.DsaProblemWhereInput = { userId };

  if (query.difficulty) where.difficulty = query.difficulty as any;
  if (query.platform) where.platform = query.platform as any;
  if (query.topic) where.topics = { has: query.topic as any };
  if (query.tag) where.tags = { has: query.tag };
  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  const [problems, total] = await Promise.all([
    prisma.dsaProblem.findMany({
      where,
      include: {
        revisions: {
          where: { completedAt: null },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { solvedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.dsaProblem.count({ where }),
  ]);

  return {
    problems,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getProblemById = async (userId: string, id: string) => {
  const problem = await prisma.dsaProblem.findFirst({
    where: { id, userId },
    include: { revisions: { orderBy: { dueDate: 'asc' } } },
  });
  if (!problem) throw new AppError('Problem not found.', 404);
  return problem;
};

export const updateProblem = async (
  userId: string,
  id: string,
  dto: UpdateDsaProblemDto
) => {
  const problem = await prisma.dsaProblem.findFirst({ where: { id, userId } });
  if (!problem) throw new AppError('Problem not found.', 404);

  await invalidateDsaCache(userId);
  return prisma.dsaProblem.update({
    where: { id },
    data: {
      ...(dto.name && { name: dto.name }),
      ...(dto.difficulty && { difficulty: dto.difficulty }),
      ...(dto.platform && { platform: dto.platform }),
      ...(dto.problemUrl !== undefined && { problemUrl: dto.problemUrl || null }),
      ...(dto.solutionUrl !== undefined && { solutionUrl: dto.solutionUrl || null }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.videoLinks && { videoLinks: dto.videoLinks }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.tags && { tags: dto.tags }),
      ...(dto.topics && { topics: dto.topics }),
      ...(dto.personalRating !== undefined && { personalRating: dto.personalRating }),
      ...(dto.timeTaken !== undefined && { timeTaken: dto.timeTaken }),
      ...(dto.mistakes !== undefined && { mistakes: dto.mistakes }),
    },
    include: { revisions: { orderBy: { dueDate: 'asc' } } },
  });
};

export const deleteProblem = async (userId: string, id: string) => {
  const problem = await prisma.dsaProblem.findFirst({ where: { id, userId } });
  if (!problem) throw new AppError('Problem not found.', 404);
  await prisma.dsaProblem.delete({ where: { id } });
  await invalidateDsaCache(userId);
};

export const getDueRevisions = async (userId: string) => {
  const today = new Date();
  return prisma.dsaRevision.findMany({
    where: {
      completedAt: null,
      dueDate: { lte: endOfDay(today) },
      problem: { userId },
    },
    include: {
      problem: {
        select: {
          id: true,
          name: true,
          difficulty: true,
          platform: true,
          topics: true,
          problemUrl: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });
};

export const completeRevision = async (userId: string, revisionId: string) => {
  const revision = await prisma.dsaRevision.findFirst({
    where: { id: revisionId, problem: { userId } },
  });
  if (!revision) throw new AppError('Revision not found.', 404);

  await invalidateDsaCache(userId);
  return prisma.dsaRevision.update({
    where: { id: revisionId },
    data: { completedAt: new Date() },
  });
};

export const getStats = async (userId: string) => {
  const cacheKey = `cache:dsa:stats:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('❌ DSA Stats Cache read error:', err);
  }

  const [total, byDifficulty, byPlatform, revisionStats, completedRevisions] = await Promise.all([
    prisma.dsaProblem.count({ where: { userId } }),
    prisma.dsaProblem.groupBy({
      by: ['difficulty'],
      where: { userId },
      _count: true,
    }),
    prisma.dsaProblem.groupBy({
      by: ['platform'],
      where: { userId },
      _count: true,
    }),
    prisma.dsaRevision.aggregate({
      where: { problem: { userId } },
      _count: { _all: true },
    }),
    prisma.dsaRevision.count({
      where: { problem: { userId }, completedAt: { not: null } },
    }),
  ]);

  // Reshape byDifficulty array into flat counts the frontend expects
  const easy = byDifficulty.find(d => d.difficulty === 'EASY')?._count ?? 0;
  const medium = byDifficulty.find(d => d.difficulty === 'MEDIUM')?._count ?? 0;
  const hard = byDifficulty.find(d => d.difficulty === 'HARD')?._count ?? 0;

  const dueRevisions = await prisma.dsaRevision.count({
    where: { problem: { userId }, completedAt: null, dueDate: { lte: new Date() } },
  });

  const statsResult = {
    total,
    easy,
    medium,
    hard,
    dueRevisions,
    byDifficulty, // keep for any future use
    byPlatform,
    revisions: {
      total: revisionStats._count._all,
      completed: completedRevisions,
      completionRate:
        revisionStats._count._all > 0
          ? Math.round((completedRevisions / revisionStats._count._all) * 100)
          : 0,
    },
  };

  try {
    await redis.set(cacheKey, JSON.stringify(statsResult), 30);
  } catch (err) {
    console.error('❌ DSA Stats Cache write error:', err);
  }

  return statsResult;
};

export const getDsaStreakStats = async (userId: string) => {
  const goals = await prisma.dsaDailyGoal.findMany({
    where: { userId, completed: true },
    orderBy: { date: 'desc' },
  });

  let currentStreak = 0;
  let longestStreak = 0;

  if (goals.length > 0) {
    const today = startOfDay(new Date());
    const latestGoalDate = startOfDay(goals[0].date);
    const diff = differenceInDays(today, latestGoalDate);

    if (diff === 0 || diff === 1) {
      currentStreak = 1;
      for (let i = 0; i < goals.length - 1; i++) {
        const current = startOfDay(goals[i].date);
        const prev = startOfDay(goals[i + 1].date);
        const dayDiff = differenceInDays(current, prev);
        if (dayDiff === 1) {
          currentStreak++;
        } else if (dayDiff > 1) {
          break;
        }
      }
    }

    let tempStreak = 1;
    longestStreak = 1;
    for (let i = 0; i < goals.length - 1; i++) {
      const current = startOfDay(goals[i].date);
      const prev = startOfDay(goals[i + 1].date);
      const dayDiff = differenceInDays(current, prev);
      if (dayDiff === 1) {
        tempStreak++;
      } else if (dayDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return { currentStreak, longestStreak };
};

export const getDailyGoal = async (userId: string) => {
  const today = startOfDay(new Date());

  // Auto-sync solvedCount from DsaProblem
  const solvedTodayCount = await prisma.dsaProblem.count({
    where: { userId, solvedAt: { gte: today } },
  });

  let dailyGoal = await prisma.dsaDailyGoal.findFirst({
    where: { userId, date: today },
  });

  if (solvedTodayCount > 0) {
    if (!dailyGoal) {
      dailyGoal = await prisma.dsaDailyGoal.create({
        data: { userId, date: today, completed: true, solvedCount: solvedTodayCount },
      });
    } else if (!dailyGoal.completed) {
      dailyGoal = await prisma.dsaDailyGoal.update({
        where: { id: dailyGoal.id },
        data: { completed: true, solvedCount: solvedTodayCount },
      });
    }
  }

  const streak = await getDsaStreakStats(userId);

  // Fetch past 14 days history
  const historyStart = startOfDay(subDays(today, 13));
  const history = await prisma.dsaDailyGoal.findMany({
    where: { userId, date: { gte: historyStart } },
    orderBy: { date: 'asc' },
  });

  return {
    todayGoal: dailyGoal || { completed: false, solvedCount: 0, date: today },
    streak,
    history,
  };
};

export const toggleDailyGoal = async (userId: string, completed: boolean) => {
  const today = startOfDay(new Date());
  let dailyGoal = await prisma.dsaDailyGoal.findFirst({
    where: { userId, date: today },
  });

  if (!dailyGoal) {
    dailyGoal = await prisma.dsaDailyGoal.create({
      data: { userId, date: today, completed },
    });
  } else {
    dailyGoal = await prisma.dsaDailyGoal.update({
      where: { id: dailyGoal.id },
      data: { completed },
    });
  }

  await invalidateDsaCache(userId);
  return dailyGoal;
};

export const fetchLeetcodeStats = async (username: string) => {
  if (!username) return null;
  const cleanUser = username.trim();
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: `query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
            profile {
              ranking
              reputation
            }
          }
        }`,
        variables: { username: cleanUser },
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as any;
      const user = json?.data?.matchedUser;
      if (user) {
        const stats = user.submitStats?.acSubmissionNum || [];
        const allItem = stats.find((s: any) => s.difficulty === 'All');
        const easyItem = stats.find((s: any) => s.difficulty === 'Easy');
        const mediumItem = stats.find((s: any) => s.difficulty === 'Medium');
        const hardItem = stats.find((s: any) => s.difficulty === 'Hard');

        return {
          totalSolved: allItem?.count || 0,
          easySolved: easyItem?.count || 0,
          mediumSolved: mediumItem?.count || 0,
          hardSolved: hardItem?.count || 0,
          acceptanceRate: 0,
          ranking: user.profile?.ranking || 0,
        };
      }
    }
  } catch (err) {
    console.error('❌ Direct LeetCode GraphQL fetch failed:', err);
  }
  return null;
};

export const fetchGfgStats = async (username: string) => {
  if (!username) return null;
  const cleanUser = username.trim();
  const cacheKey = `cache:gfg:${cleanUser}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('❌ GFG Cache read error:', err);
  }

  try {
    const headers = { 'accept': '*/*' };
    const [profileRes, statsRes, summaryRes] = await Promise.allSettled([
      fetch(`https://gfg-stats.tashif.codes/${encodeURIComponent(cleanUser)}/profile`, { headers }),
      fetch(`https://gfg-stats.tashif.codes/${encodeURIComponent(cleanUser)}/stats`, { headers }),
      fetch(`https://gfg-stats.tashif.codes/${encodeURIComponent(cleanUser)}`, { headers }),
    ]);

    let profileData: any = null;
    let statsData: any = null;
    let summaryData: any = null;

    if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
      const json = (await profileRes.value.json()) as any;
      profileData = json?.data || json;
    }

    if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
      const json = (await statsRes.value.json()) as any;
      statsData = json?.data || json;
    }

    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      const json = (await summaryRes.value.json()) as any;
      summaryData = json?.data || json;
    }

    if (!profileData && !statsData && !summaryData) {
      // Fallback to basic scrape if third-party API is unreachable
      console.warn('⚠️ GFG API returned no data, falling back to basic scrape');
      const res = await fetch(`https://www.geeksforgeeks.org/user/${encodeURIComponent(cleanUser)}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (res.ok) {
        const html = await res.text();
        const solvedMatch =
          html.match(/"total_problems_solved"\s*:\s*(\d+)/i) ||
          html.match(/"problemsSolved"\s*:\s*(\d+)/i) ||
          html.match(/total-problems-count[^>]*>\s*(\d+)/i);
        if (solvedMatch && solvedMatch[1]) {
          return {
            username: cleanUser,
            displayName: cleanUser,
            avatar: '',
            institution: '',
            totalSolved: parseInt(solvedMatch[1], 10),
            totalActiveDays: 0,
            byDifficulty: { school: 0, basic: 0, easy: 0, medium: 0, hard: 0 },
            topicAnalysis: [],
            profileUrl: `https://www.geeksforgeeks.org/user/${encodeURIComponent(cleanUser)}/`,
          };
        }
      }
      return null;
    }

    const totalSolved = statsData?.totalSolved ?? summaryData?.totalSolved ?? summaryData?.totalProblemsSolved ?? 0;
    const totalActiveDays = summaryData?.totalActiveDays ?? 0;
    const totalContests = summaryData?.totalContests ?? 0;

    const result = {
      username: profileData?.username || cleanUser,
      displayName: profileData?.displayName || cleanUser,
      avatar: profileData?.avatar || '',
      institution: profileData?.institution || '',
      country: profileData?.country || null,
      totalSolved,
      totalActiveDays,
      totalContests,
      byDifficulty: statsData?.byDifficulty || {
        school: 0,
        basic: 0,
        easy: 0,
        medium: 0,
        hard: 0,
      },
      topicAnalysis: statsData?.topicAnalysis || [],
      profileUrl: `https://www.geeksforgeeks.org/user/${encodeURIComponent(cleanUser)}/`,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(result), 300); // 5 minutes cache
    } catch (err) {
      console.error('❌ GFG Cache write error:', err);
    }

    return result;
  } catch (err) {
    console.error('❌ Failed to fetch GFG stats:', err);
  }
  return null;
};

export const getProfileStats = async (userId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });
  if (!profile) throw new AppError('Profile not found', 404);

  const gfgUser = profile.gfgUsername || 'tanishjwaha';

  const [leetcode, gfg] = await Promise.all([
    profile.leetcodeUsername ? fetchLeetcodeStats(profile.leetcodeUsername) : Promise.resolve(null),
    gfgUser ? fetchGfgStats(gfgUser) : Promise.resolve(null),
  ]);

  return { leetcode, gfg };
};
