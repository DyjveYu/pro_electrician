const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CustomError } = require('./errorHandler');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 创建子目录
const createSubDirs = () => {
  const subDirs = ['avatars', 'certificates', 'work-images', 'temp'];
  subDirs.forEach(dir => {
    const dirPath = path.join(uploadDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

createSubDirs();

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new CustomError('不支持的文件类型', 400), false);
  }
};

// 生成唯一文件名
const generateFileName = (originalname) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalname);
  return `${timestamp}_${random}${ext}`;
};

// 存储配置
const storage = multer.memoryStorage();

// 基础上传配置
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // 最多5个文件
  }
});

// 头像上传中间件
const uploadAvatar = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new CustomError('头像只支持 JPG、PNG、WEBP 格式', 400), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
}).single('avatar');

// 证书上传中间件
const uploadCertificate = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new CustomError('证书只支持图片或PDF格式', 400), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3 // 最多3个证书文件
  }
}).array('certificates', 3);

// 工作图片上传中间件
const uploadWorkImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new CustomError('工作图片只支持图片格式', 400), false);
    }
  },
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
    files: 9 // 最多9张图片
  }
}).array('images', 9);

// 工单图片上传中间件
const uploadOrderImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new CustomError('工单图片只支持图片格式', 400), false);
    }
  },
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
    files: 10 // 最多10张图片
  }
}).array('images', 10);

// 保存文件到磁盘
const saveFileToDisk = async (file, subDir = 'temp') => {
  try {
    const fileName = generateFileName(file.originalname);
    const filePath = path.join(uploadDir, subDir, fileName);
    
    // 写入文件
    fs.writeFileSync(filePath, file.buffer);
    
    // 返回相对路径
    return path.join('uploads', subDir, fileName).replace(/\\/g, '/');
  } catch (error) {
    throw new CustomError('文件保存失败', 500);
  }
};

// 删除文件
const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
};

// 清理临时文件（超过24小时）
const cleanTempFiles = () => {
  try {
    const tempDir = path.join(uploadDir, 'temp');
    const files = fs.readdirSync(tempDir);
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < oneDayAgo) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ 删除临时文件: ${file}`);
      }
    });
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
};

// 每小时清理一次临时文件
setInterval(cleanTempFiles, 60 * 60 * 1000);

// 文件处理中间件
const handleFileUpload = (uploadMiddleware, subDir = 'temp') => {
  return async (req, res, next) => {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new CustomError('文件大小超出限制', 413));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new CustomError('文件数量超出限制', 400));
        }
        return next(err);
      }

      try {
        // 处理单个文件
        if (req.file) {
          req.file.savedPath = await saveFileToDisk(req.file, subDir);
        }

        // 处理多个文件
        if (req.files && Array.isArray(req.files)) {
          for (const file of req.files) {
            file.savedPath = await saveFileToDisk(file, subDir);
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    });
  };
};

module.exports = {
  upload,
  uploadAvatar: handleFileUpload(uploadAvatar, 'avatars'),
  uploadCertificate: handleFileUpload(uploadCertificate, 'certificates'),
  uploadWorkImages: handleFileUpload(uploadWorkImages, 'work-images'),
  uploadOrderImages: handleFileUpload(uploadOrderImages, 'work-images'),
  saveFileToDisk,
  deleteFile,
  cleanTempFiles
};