import { Router } from "express";
import { NpcController } from "../controllers/NpcController";
import multer from "multer";

// 配置multer存储
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制文件大小为5MB
  },
  fileFilter: (req, file, cb) => {
    // 只接受图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null as any, false); // 使用类型断言绕过类型检查
    }
  }
});

const router = Router();

// 获取所有NPC
router.get("/", NpcController.getAllNpcs);

// 获取单个NPC
router.get("/:id", NpcController.getNpcById);

// 创建NPC
router.post("/", NpcController.createNpc);

// 更新NPC
router.put("/:id", NpcController.updateNpc);

// 删除NPC
router.delete("/:id", NpcController.deleteNpc);

// 上传NPC头像
router.post("/:id/avatar", upload.single("avatar"), NpcController.uploadAvatar);

export default router;
