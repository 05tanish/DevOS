import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { importJob } from './job-import.service';
import { sendCreated, sendError } from '../../utils/response';
import { logActivity } from '../../services/activity-log.service';

/**
 * POST /api/jobs/import
 * Receives job data + optional screenshot from the Chrome Extension.
 * Expects multipart/form-data with:
 *   - jobData (JSON string): { job, metadata }
 *   - screenshot (file, optional): PNG screenshot
 */
export const importJobHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    let parsed: any;

    // Support both JSON body and multipart/form-data
    if (req.body.job && req.body.metadata) {
      // JSON body format (from extension service worker)
      parsed = { 
        job: req.body.job, 
        metadata: req.body.metadata,
        status: req.body.status,
        contactId: req.body.contactId,
      };
    } else if (req.body.jobData) {
      // Legacy multipart/form-data format
      const rawData = req.body.jobData;
      try {
        parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      } catch {
        return sendError(res, 'Invalid jobData JSON', 400);
      }
    } else {
      return sendError(res, 'Missing job data', 400);
    }

    if (!parsed.job || !parsed.metadata) {
      return sendError(res, 'jobData must contain job and metadata fields', 400);
    }

    // Validate metadata
    if (!parsed.metadata.sourceUrl) {
      return sendError(res, 'metadata.sourceUrl is required', 400);
    }

    // Sanitize extracted content (prevent XSS)
    if (parsed.job.title) parsed.job.title = sanitize(parsed.job.title);
    if (parsed.job.company) parsed.job.company = sanitize(parsed.job.company);
    if (parsed.job.location) parsed.job.location = sanitize(parsed.job.location);
    if (parsed.job.description) {
      parsed.job.description = parsed.job.description.slice(0, 10000); // Cap description length
    }

    // Get screenshot: either from multer (file upload) or from JSON body (base64)
    const screenshotFile = req.file;
    const screenshotBase64 = req.body.screenshot; // base64 data URL from JSON

    // Validate screenshot file if present (multipart upload)
    if (screenshotFile) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(screenshotFile.mimetype)) {
        return sendError(res, 'Invalid screenshot format. Allowed: PNG, JPEG, WebP', 400);
      }
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (screenshotFile.size > maxSize) {
        return sendError(res, 'Screenshot too large. Max 10MB', 400);
      }
    }

    const result = await importJob(userId, parsed, screenshotFile, screenshotBase64);

    logActivity({
      userId,
      action: result.isDuplicate ? 'job.import_duplicate' : 'job.import',
      entity: 'job',
      entityId: (result as any).id,
      metadata: {
        source: parsed.metadata.source,
        sourceUrl: parsed.metadata.sourceUrl,
        extractionMethod: parsed.metadata.extractionMethod,
      },
    });

    return sendCreated(res, result, result.isDuplicate ? 'Job already exists' : 'Job captured');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/jobs/extract-from-image
 * Drag-and-drop image upload endpoint.
 * Extracts job info using AI and returns structured data for manual review.
 */
export const extractFromImageHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const screenshotFile = req.file;

    if (!screenshotFile) {
      return sendError(res, 'No image file provided', 400);
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(screenshotFile.mimetype)) {
      return sendError(res, 'Invalid image format. Allowed: PNG, JPEG, WebP', 400);
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (screenshotFile.size > maxSize) {
      return sendError(res, 'Image too large. Max 10MB', 400);
    }

    // Extract info from screenshot using Vision AI
    const { extractJobFromScreenshot } = require('../../services/vision-ai.service');
    const aiResult = await extractJobFromScreenshot(
      screenshotFile.buffer,
      screenshotFile.mimetype
    );

    if (!aiResult.success) {
      return sendError(res, aiResult.error || 'Failed to extract job information', 500);
    }

    // Format salary if available
    const formatSalary = (min: number | null, max: number | null): string | null => {
      if (!min && !max) return null;
      if (min && max) return `${min} - ${max}`;
      if (min) return `${min}+`;
      return `Up to ${max}`;
    };

    // Return extracted data for user to review and save
    const extractedData = {
      company: aiResult.data.company || '',
      role: aiResult.data.title || '',
      location: aiResult.data.location || '',
      description: aiResult.data.description || '',
      salary: formatSalary(aiResult.data.salaryMin, aiResult.data.salaryMax) || '',
      employmentType: aiResult.data.employmentType || '',
      skills: aiResult.data.skills || [],
      education: aiResult.data.education || [],
      experienceMin: aiResult.data.experienceMin,
      experienceMax: aiResult.data.experienceMax,
      salaryMin: aiResult.data.salaryMin,
      salaryMax: aiResult.data.salaryMax,
      postedDate: aiResult.data.postedDate,
    };

    logActivity({
      userId,
      action: 'job.extract_from_image',
      entity: 'job',
      metadata: {
        extractionMethod: 'drag_drop_ai',
        hasCompany: !!extractedData.company,
        hasRole: !!extractedData.role,
      },
    });

    return res.status(200).json({
      success: true,
      data: extractedData,
      message: 'Job information extracted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/** Basic HTML/script sanitization */
function sanitize(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 500);
}
