import express from "express";
import { AiServiceController } from "../controllers/AiServiceController";

const router = express.Router();
const aiServiceController = new AiServiceController();

/**
 * AI服务路由配置
 */

// 获取所有AI服务
router.get("/", aiServiceController.getAllServices.bind(aiServiceController));

// 获取默认AI服务
router.get("/default", aiServiceController.getDefaultService.bind(aiServiceController));

// 获取单个AI服务
router.get("/:id", aiServiceController.getServiceById.bind(aiServiceController));

// 创建AI服务
router.post("/", aiServiceController.createService.bind(aiServiceController));

// 更新AI服务
router.put("/:id", aiServiceController.updateService.bind(aiServiceController));

// 删除AI服务
router.delete("/:id", aiServiceController.deleteService.bind(aiServiceController));

// 设置默认AI服务
router.put("/:id/default", aiServiceController.setDefaultService.bind(aiServiceController));

// 测试AI服务连接（已存在的服务）
router.post("/:id/test", aiServiceController.testConnection.bind(aiServiceController));

// 测试AI服务连接（新配置）
router.post("/test", aiServiceController.testConnection.bind(aiServiceController));

export default router;
