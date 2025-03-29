import express from "express";
import { WorkTaskController } from "../controllers/WorkTaskController";

const router = express.Router();

/**
 * @route GET /api/work-tasks
 * @desc 获取所有工作任务
 * @access Public
 */
router.get("/", WorkTaskController.getAllWorkTasks);

/**
 * @route GET /api/work-tasks/:id
 * @desc 获取单个工作任务详情
 * @access Public
 */
router.get("/:id", WorkTaskController.getWorkTaskById);

/**
 * @route POST /api/work-tasks
 * @desc 创建新工作任务
 * @access Public
 */
router.post("/", WorkTaskController.createWorkTask);

/**
 * @route PUT /api/work-tasks/:id
 * @desc 更新工作任务
 * @access Public
 */
router.put("/:id", WorkTaskController.updateWorkTask);

/**
 * @route DELETE /api/work-tasks/:id
 * @desc 删除工作任务
 * @access Public
 */
router.delete("/:id", WorkTaskController.deleteWorkTask);

/**
 * @route POST /api/work-tasks/:id/execute
 * @desc 执行工作任务
 * @access Public
 */
router.post("/:id/execute", WorkTaskController.executeWorkTask);

/**
 * @route POST /api/work-tasks/test-execute
 * @desc 测试执行工作任务，不保存结果
 * @access Public
 */
router.post("/test-execute", WorkTaskController.testExecuteWorkTask);

/**
 * @route GET /api/work-tasks/:id/templates
 * @desc 获取工作任务的模板集合
 * @access Public
 */
router.get("/:id/templates", WorkTaskController.getTaskTemplates);

/**
 * @route PUT /api/work-tasks/:id/templates
 * @desc 更新工作任务的模板集合
 * @access Public
 */
router.put("/:id/templates", WorkTaskController.updateTaskTemplates);

export default router;
