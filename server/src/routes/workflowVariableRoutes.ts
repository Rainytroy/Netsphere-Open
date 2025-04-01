import { Router } from 'express';
import { workflowVariableController } from '../controllers/WorkflowVariableController';

const router = Router();

/**
 * 工作流变量相关路由
 * 提供工作流变量的增删改查API
 */

// 获取工作流变量
router.get('/:workflowId/variables', workflowVariableController.getWorkflowVariables);

// 创建或更新工作流变量
router.post('/:workflowId/variables', workflowVariableController.createOrUpdateWorkflowVariable);

// 删除工作流变量
router.delete('/:workflowId/variables', workflowVariableController.deleteWorkflowVariables);

// 创建或更新工作流输出变量
router.post('/:workflowId/output-variables', workflowVariableController.createOrUpdateOutputVariable);

// 删除工作流输出变量
router.delete('/:workflowId/output-variables', workflowVariableController.deleteOutputVariable);

// 初始化工作流基本变量
router.post('/init-variables', workflowVariableController.initWorkflowBaseVariables);

export default router;
