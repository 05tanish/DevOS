import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { uploadFile, deleteFile, resolveFileUrl } from '../../services/storage.service';

export const listResumes = async (userId: string) => {
  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  // Resolve provider-tagged URLs (e.g. cloudinary:<id>||<url>) before returning
  return resumes.map((r) => ({ ...r, fileUrl: resolveFileUrl(r.fileUrl) }));
};

export const uploadResume = async (userId: string, file: Express.Multer.File, body: any) => {
  const fileUrl = await uploadFile(file, 'resumes', true);

  // If setting as default, unset all others first
  if (body.isDefault === 'true' || body.isDefault === true) {
    await prisma.resume.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  return prisma.resume.create({
    data: {
      userId,
      name: body.name || file.originalname,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      notes: body.notes || null,
      isDefault: body.isDefault === 'true' || body.isDefault === true,
    },
  });
};

export const updateResume = async (userId: string, id: string, data: any) => {
  const resume = await prisma.resume.findFirst({ where: { id, userId } });
  if (!resume) throw new AppError('Resume not found.', 404);

  if (data.isDefault) {
    await prisma.resume.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  return prisma.resume.update({ where: { id }, data });
};

export const deleteResume = async (userId: string, id: string) => {
  const resume = await prisma.resume.findFirst({ where: { id, userId } });
  if (!resume) throw new AppError('Resume not found.', 404);

  // Detach resume from all linked jobs
  await prisma.job.updateMany({
    where: { userId, resumeId: id },
    data: { resumeId: null },
  });

  await deleteFile(resume.fileUrl);
  await prisma.resume.delete({ where: { id } });
};

export const attachResumeToJob = async (userId: string, jobId: string, resumeId: string | null) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new AppError('Job not found.', 404);

  if (resumeId) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new AppError('Resume not found.', 404);
  }

  return prisma.job.update({ where: { id: jobId }, data: { resumeId } });
};
