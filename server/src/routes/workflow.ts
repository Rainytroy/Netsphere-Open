import express from "express";
import { WorkflowController } from "../controllers/WorkflowController";
import { WorkflowNodeController } from "../controllers/WorkflowNodeController";
import { WorkflowConnectionController } from "../controllers/WorkflowConnectionController";
import { workflowVariableController } from "../controllers/WorkflowVariableController";

const router = express.Router();
const workflowController = new WorkflowController();
const nodeController = new WorkflowNodeController();
const connectionController = new WorkflowConnectionController();

/**
 * @route   GET /api/workflows
 * @desc    获取工作流列表
 * @access  Public
 */
router.get("/", workflowController.getWorkflows);

/**
 * @route   GET /api/workflows/:id
 * @desc    获取工作流详情
 * @access  Public
 */
router.get("/:id", workflowController.getWorkflowById);

/**
 * @route   GET /api/workflows/:id/structure
 * @desc    获取工作流完整结构（含节点和连接）
 * @access  Public
 */
router.get("/:id/structure", workflowController.getWorkflowStructure);

/**
 * @route   POST /api/workflows
 * @desc    创建工作流
 * @access  Public
 */
router.post("/", workflowController.createWorkflow);

/**
 * @route   PUT /api/workflows/:id
 * @desc    更新工作流
 * @access  Public
 */
router.put("/:id", workflowController.updateWorkflow);

/**
 * @route   DELETE /api/workflows/:id
 * @desc    删除工作流
 * @access  Public
 */
router.delete("/:id", workflowController.deleteWorkflow);

/**
 * @route   POST /api/workflows/:id/copy
 * @desc    复制工作流
 * @access  Public
 */
router.post("/:id/copy", workflowController.copyWorkflow);

/**
 * @route   POST /api/workflows/:id/execute
 * @desc    执行工作流
 * @access  Public
 */
router.post("/:id/execute", workflowController.executeWorkflow);

/**
 * @route   GET /api/workflows/executions/:executionId
 * @desc    获取执行记录
 * @access  Public
 */
router.get("/executions/:executionId", workflowController.getExecution);

/**
 * 工作流节点相关路由
 */

// 兼容测试脚本的路由（直接在workflow根路径下的节点操作）
router.post("/nodes", nodeController.createNode);

// 标准嵌套路由（按照API规范）
router.get("/:workflowId/nodes", nodeController.getNodes);
router.post("/:workflowId/nodes", nodeController.createNode);
router.get("/:workflowId/nodes/:nodeId", nodeController.getNodeById);
router.put("/:workflowId/nodes/:nodeId", nodeController.updateNode);
router.delete("/:workflowId/nodes/:nodeId", nodeController.deleteNode);

/**
 * 工作流连接相关路由
 */
router.get("/:workflowId/connections", connectionController.getConnections);
router.post("/:workflowId/connections", connectionController.createConnection);
router.get("/:workflowId/connections/:connectionId", connectionController.getConnectionById);
router.put("/:workflowId/connections/:connectionId", connectionController.updateConnection);
router.delete("/:workflowId/connections/:connectionId", connectionController.deleteConnection);

/**
 * 工作流变量相关路由
 */
router.get("/:workflowId/variables", workflowVariableController.getWorkflowVariables);
router.post("/:workflowId/variables", workflowVariableController.createOrUpdateWorkflowVariable);
router.delete("/:workflowId/variables", workflowVariableController.deleteWorkflowVariables);
router.post("/init-variables", workflowVariableController.initWorkflowBaseVariables);

export default router;
