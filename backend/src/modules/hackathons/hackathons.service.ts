import { PrismaClient, HackathonStatus } from '@prisma/client';
import { processArray } from '../../utils/arrayHelper';

const prisma = new PrismaClient();

export const hackathonService = {
  async getAll(userId: string, status?: HackathonStatus) {
    const where: any = { userId };
    if (status) where.status = status;

    return prisma.hackathon.findMany({
      where,
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  },

  async getOne(id: string, userId: string) {
    return prisma.hackathon.findFirst({
      where: { id, userId }
    });
  },

  async create(userId: string, data: any) {
    const {
      name,
      idea,
      deadline,
      status,
      prize,
      prizePool,
      registrationLink,
      submissionLink,
      githubUrl,
      demoUrl,
      teamStatus,
      learnings,
      notes,
      teamMembers,
      techStack,
      tags,
    } = data;
    return prisma.hackathon.create({
      data: {
        userId,
        name: name ? String(name).trim() : '',
        idea: idea ? String(idea).trim() : null,
        deadline: deadline ? new Date(deadline) : null,
        status: status || 'REGISTERED',
        prize: prize ? String(prize).trim() : null,
        prizePool: prizePool ? String(prizePool).trim() : null,
        registrationLink: registrationLink ? String(registrationLink).trim() : null,
        submissionLink: submissionLink ? String(submissionLink).trim() : null,
        githubUrl: githubUrl ? String(githubUrl).trim() : null,
        demoUrl: demoUrl ? String(demoUrl).trim() : null,
        teamStatus: teamStatus ? String(teamStatus).trim() : null,
        learnings: learnings ? String(learnings).trim() : null,
        notes: notes ? String(notes).trim() : null,
        teamMembers: processArray(teamMembers),
        techStack: processArray(techStack),
        tags: processArray(tags),
      }
    });
  },

  async update(id: string, userId: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.idea !== undefined) updateData.idea = data.idea ? String(data.idea).trim() : null;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.prize !== undefined) updateData.prize = data.prize ? String(data.prize).trim() : null;
    if (data.prizePool !== undefined) updateData.prizePool = data.prizePool ? String(data.prizePool).trim() : null;
    if (data.registrationLink !== undefined) updateData.registrationLink = data.registrationLink ? String(data.registrationLink).trim() : null;
    if (data.submissionLink !== undefined) updateData.submissionLink = data.submissionLink ? String(data.submissionLink).trim() : null;
    if (data.githubUrl !== undefined) updateData.githubUrl = data.githubUrl ? String(data.githubUrl).trim() : null;
    if (data.demoUrl !== undefined) updateData.demoUrl = data.demoUrl ? String(data.demoUrl).trim() : null;
    if (data.teamStatus !== undefined) updateData.teamStatus = data.teamStatus ? String(data.teamStatus).trim() : null;
    if (data.learnings !== undefined) updateData.learnings = data.learnings ? String(data.learnings).trim() : null;
    if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes).trim() : null;
    if (data.teamMembers !== undefined) updateData.teamMembers = processArray(data.teamMembers);
    if (data.techStack !== undefined) updateData.techStack = processArray(data.techStack);
    if (data.tags !== undefined) updateData.tags = processArray(data.tags);

    return prisma.hackathon.update({
      where: { id, userId },
      data: updateData
    });
  },

  async delete(id: string, userId: string) {
    return prisma.hackathon.delete({
      where: { id, userId }
    });
  },

  async getUpcoming(userId: string) {
    return prisma.hackathon.findMany({
      where: {
        userId,
        status: { in: ['REGISTERED', 'BUILDING'] },
        deadline: { gte: new Date() }
      },
      orderBy: { deadline: 'asc' }
    });
  },

  async getStats(userId: string) {
    const [total, registered, building, submitted, won] = await Promise.all([
      prisma.hackathon.count({ where: { userId } }),
      prisma.hackathon.count({ where: { userId, status: 'REGISTERED' } }),
      prisma.hackathon.count({ where: { userId, status: 'BUILDING' } }),
      prisma.hackathon.count({ where: { userId, status: 'SUBMITTED' } }),
      prisma.hackathon.count({ where: { userId, status: 'WON' } })
    ]);

    return { total, registered, building, submitted, won };
  }
};
