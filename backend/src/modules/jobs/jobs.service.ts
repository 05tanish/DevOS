import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { uploadFile, deleteFile, resolveFileUrl } from '../../services/storage.service';


export const create = async (userId: string, data: any) =>
  prisma.job.create({ data: { ...data, userId } });

export const list = async (userId: string, q: any) => {
  const where: any = { userId };
  if (q.status) where.status = q.status;
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ 
      where, 
      orderBy: { appliedDate: 'desc' }, 
      skip: (Number(q.page || 1) - 1) * Number(q.limit || 100), 
      take: Number(q.limit || 100),
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            company: true,
            relation: true,
          },
        },
        resume: true,
      },
    }),
    prisma.job.count({ where }),
  ]);

  // Resolve provider-tagged URLs before returning to client
  const resolvedJobs = jobs.map((job) => ({
    ...job,
    resumePath: job.resumePath ? resolveFileUrl(job.resumePath) : null,
    resume: job.resume
      ? { ...job.resume, fileUrl: resolveFileUrl(job.resume.fileUrl) }
      : null,
  }));

  return { jobs: resolvedJobs, total };
};


export const getOne = async (userId: string, id: string) => {
  const job = await prisma.job.findFirst({ 
    where: { id, userId },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          linkedinUrl: true,
          whatsappNumber: true,
          role: true,
          company: true,
          relation: true,
        },
      },
      resume: true,
    },
  });
  if (!job) throw new AppError('Job application not found.', 404);
  return {
    ...job,
    resumePath: job.resumePath ? resolveFileUrl(job.resumePath) : null,
    resume: job.resume
      ? { ...job.resume, fileUrl: resolveFileUrl(job.resume.fileUrl) }
      : null,
  };
};


export const update = async (userId: string, id: string, data: any) => {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw new AppError('Job not found.', 404);
  return prisma.job.update({ where: { id }, data });
};

export const remove = async (userId: string, id: string) => {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw new AppError('Job not found.', 404);

  // Transactional storage cleanup: Delete associated resume file if it exists
  if (job.resumePath) {
    try {
      await deleteFile(job.resumePath);
    } catch (err) {
      console.error('Failed to clean up resume file on job deletion:', err);
    }
  }

  await prisma.job.delete({ where: { id } });
};

export const uploadJobResume = async (userId: string, jobId: string, file: Express.Multer.File) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new AppError('Job application not found.', 404);

  // Validation: Only PDF files allowed
  if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
    throw new AppError('Only PDF files are allowed for resumes.', 400);
  }

  // Validation: Maximum size 5MB
  const maxSizeBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new AppError('Resume file size cannot exceed 5MB.', 400);
  }

  // If previous resume exists, delete old resume file from storage
  if (job.resumePath) {
    try {
      await deleteFile(job.resumePath);
    } catch (err) {
      console.error('Failed to delete old resume file:', err);
    }
  }

  // Upload new resume file
  const resumePath = await uploadFile(file, 'job-resumes');

  // Update job record
  return prisma.job.update({
    where: { id: jobId },
    data: {
      resumeFileName: file.originalname,
      resumePath,          // raw tagged value stored in DB
      resumeSize: file.size,
      resumeUploadedAt: new Date(),
    },
  });
};


export const deleteJobResume = async (userId: string, jobId: string) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new AppError('Job application not found.', 404);

  if (job.resumePath) {
    await deleteFile(job.resumePath);
  }

  return prisma.job.update({
    where: { id: jobId },
    data: {
      resumeFileName: null,
      resumePath: null,
      resumeSize: null,
      resumeUploadedAt: null,
    },
  });
};
