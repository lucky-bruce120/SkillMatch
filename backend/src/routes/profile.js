import express from 'express';
import multer from 'multer';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadDir = path.join(process.cwd(), 'uploads');

// GET /profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const updateData = req.body;

    let profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      profile = new JobSeekerProfile({ user_id: userId, ...updateData });
    } else {
      Object.assign(profile, updateData);
    }

    await profile.save();
    res.json(profile);
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/remove-picture
router.delete('/remove-picture', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Remove file from disk if it exists
    if (profile.picture) {
      const filepath = path.join(process.cwd(), profile.picture);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    profile.picture = null;
    await profile.save();

    res.json({ message: 'Picture removed successfully' });
  } catch (error) {
    logger.error('Picture remove error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Skills routes
// GET /profile/skills
router.get('/skills', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array since we don't have a separate skills model
    // In a real implementation, you'd have a Skills model
    res.json([]);
  } catch (error) {
    logger.error('Skills fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/skills
router.post('/skills', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const skillData = { ...req.body, user_id: userId };

    // For now, just return the data since we don't have a separate skills model
    // In a real implementation, you'd create a new skill record
    res.status(201).json({ ...skillData, id: Date.now().toString() });
  } catch (error) {
    logger.error('Skill create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile/skills/:id
router.put('/skills/:id', authMiddleware, async (req, res) => {
  try {
    const skillId = req.params.id;
    const updateData = req.body;

    // For now, just return the updated data since we don't have a separate skills model
    res.json({ ...updateData, id: skillId });
  } catch (error) {
    logger.error('Skill update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/skills/:id
router.delete('/skills/:id', authMiddleware, async (req, res) => {
  try {
    const skillId = req.params.id;

    // For now, just return success since we don't have a separate skills model
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    logger.error('Skill delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Education routes
// GET /profile/education
router.get('/education', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array since we don't have a separate education model
    res.json([]);
  } catch (error) {
    logger.error('Education fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/education
router.post('/education', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const educationData = { ...req.body, user_id: userId };

    // For now, just return the data since we don't have a separate education model
    res.status(201).json({ ...educationData, id: Date.now().toString() });
  } catch (error) {
    logger.error('Education create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile/education/:id
router.put('/education/:id', authMiddleware, async (req, res) => {
  try {
    const educationId = req.params.id;
    const updateData = req.body;

    // For now, just return the updated data since we don't have a separate education model
    res.json({ ...updateData, id: educationId });
  } catch (error) {
    logger.error('Education update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/education/:id
router.delete('/education/:id', authMiddleware, async (req, res) => {
  try {
    const educationId = req.params.id;

    // For now, just return success since we don't have a separate education model
    res.json({ message: 'Education deleted successfully' });
  } catch (error) {
    logger.error('Education delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Experience routes
// GET /profile/experience
router.get('/experience', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array since we don't have a separate experience model
    res.json([]);
  } catch (error) {
    logger.error('Experience fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/experience
router.post('/experience', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const experienceData = { ...req.body, user_id: userId };

    // For now, just return the data since we don't have a separate experience model
    res.status(201).json({ ...experienceData, id: Date.now().toString() });
  } catch (error) {
    logger.error('Experience create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile/experience/:id
router.put('/experience/:id', authMiddleware, async (req, res) => {
  try {
    const experienceId = req.params.id;
    const updateData = req.body;

    // For now, just return the updated data since we don't have a separate experience model
    res.json({ ...updateData, id: experienceId });
  } catch (error) {
    logger.error('Experience update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/experience/:id
router.delete('/experience/:id', authMiddleware, async (req, res) => {
  try {
    const experienceId = req.params.id;

    // For now, just return success since we don't have a separate experience model
    res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    logger.error('Experience delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /profile/cv - Download CV file
router.get('/cv', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile || !profile.cv_file) {
      return res.status(404).json({ error: 'CV not found' });
    }

    const filepath = path.join(process.cwd(), profile.cv_file);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'CV file not found on disk' });
    }

    // Set appropriate headers for file download
    const filename = profile.cv_file.split('/').pop();
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('CV download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const updateData = req.body;

    let profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      profile = new JobSeekerProfile({ user_id: userId, ...updateData });
    } else {
      Object.assign(profile, updateData);
    }

    await profile.save();
    res.json(profile);
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/remove-picture
router.delete('/remove-picture', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Remove file from disk if it exists
    if (profile.picture) {
      const filepath = path.join(process.cwd(), profile.picture);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    profile.picture = null;
    await profile.save();

    res.json({ message: 'Picture removed successfully' });
  } catch (error) {
    logger.error('Picture remove error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Skills routes
// GET /profile/skills
router.get('/skills', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array since we don't have a separate skills model
    // In a real implementation, you'd have a Skills model
    res.json([]);
  } catch (error) {
    logger.error('Skills fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/skills
router.post('/skills', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const skillData = { ...req.body, user_id: userId };

    // For now, just return the data since we don't have a separate skills model
    // In a real implementation, you'd create a new skill record
    res.status(201).json({ ...skillData, id: Date.now().toString() });
  } catch (error) {
    logger.error('Skill create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile/skills/:id
router.put('/skills/:id', authMiddleware, async (req, res) => {
  try {
    const skillId = req.params.id;
    const updateData = req.body;

    // For now, just return the updated data since we don't have a separate skills model
    res.json({ ...updateData, id: skillId });
  } catch (error) {
    logger.error('Skill update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/skills/:id
router.delete('/skills/:id', authMiddleware, async (req, res) => {
  try {
    const skillId = req.params.id;

    // For now, just return success since we don't have a separate skills model
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    logger.error('Skill delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Education routes
// GET /profile/education
router.get('/education', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array since we don't have a separate education model
    res.json([]);
  } catch (error) {
    logger.error('Education fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/education
router.post('/education', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const educationData = { ...req.body, user_id: userId };

    // For now, just return the data since we don't have a separate education model
    res.status(201).json({ ...educationData, id: Date.now().toString() });
  } catch (error) {
    logger.error('Education create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile/education/:id
router.put('/education/:id', authMiddleware, async (req, res) => {
  try {
    const educationId = req.params.id;
    const updateData = req.body;

    // For now, just return the updated data since we don't have a separate education model
    res.json({ ...updateData, id: educationId });
  } catch (error) {
    logger.error('Education update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/education/:id
router.delete('/education/:id', authMiddleware, async (req, res) => {
  try {
    const educationId = req.params.id;

    // For now, just return success since we don't have a separate education model
    res.json({ message: 'Education deleted successfully' });
  } catch (error) {
    logger.error('Education delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Experience routes
// GET /profile/experience
router.get('/experience', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array since we don't have a separate experience model
    res.json([]);
  } catch (error) {
    logger.error('Experience fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/experience
router.post('/experience', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const experienceData = { ...req.body, user_id: userId };

    // For now, just return the data since we don't have a separate experience model
    res.status(201).json({ ...experienceData, id: Date.now().toString() });
  } catch (error) {
    logger.error('Experience create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile/experience/:id
router.put('/experience/:id', authMiddleware, async (req, res) => {
  try {
    const experienceId = req.params.id;
    const updateData = req.body;

    // For now, just return the updated data since we don't have a separate experience model
    res.json({ ...updateData, id: experienceId });
  } catch (error) {
    logger.error('Experience update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile/experience/:id
router.delete('/experience/:id', authMiddleware, async (req, res) => {
  try {
    const experienceId = req.params.id;

    // For now, just return success since we don't have a separate experience model
    res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    logger.error('Experience delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /profile/cv - Download CV file
router.get('/cv', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile || !profile.cv_file) {
      return res.status(404).json({ error: 'CV not found' });
    }

    const filepath = path.join(process.cwd(), profile.cv_file);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'CV file not found on disk' });
    }

    // Set appropriate headers for file download
    const filename = profile.cv_file.split('/').pop();
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('CV download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/upload-cv
router.post('/upload-cv', authMiddleware, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CV file is required' });
    }

    const userId = req.userId;

    let profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      profile = new JobSeekerProfile({ user_id: userId });
    }

    // Save file to disk
    const timestamp = Date.now();
    const filename = `${userId}-cv-${timestamp}${path.extname(req.file.originalname)}`;
    const filepath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filepath, req.file.buffer);
    
    profile.cv = `/uploads/${filename}`;
    await profile.save();

    res.json({ fileUrl: profile.cv });
  } catch (error) {
    logger.error('CV upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile/upload-picture
router.post('/upload-picture', authMiddleware, upload.single('picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Picture file is required' });
    }

    const userId = req.userId;

    let profile = await JobSeekerProfile.findOne({ user_id: userId });

    if (!profile) {
      profile = new JobSeekerProfile({ user_id: userId });
    }

    // Save file to disk
    const timestamp = Date.now();
    const filename = `${userId}-picture-${timestamp}${path.extname(req.file.originalname)}`;
    const filepath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filepath, req.file.buffer);
    
    profile.picture = `/uploads/${filename}`;
    await profile.save();

    res.json({ fileUrl: profile.picture });
  } catch (error) {
    logger.error('Picture upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;