import { Router } from 'express';
import { VariableController } from '../controllers/VariableController';

const router = Router();
const variableController = new VariableController();

/**
 * 变量管理路由
 * 
 * GET /api/variables - 获取变量列表
 * GET /api/variables/:id - 获取单个变量
 * POST /api/variables - 创建自定义变量
 * PUT /api/variables/:id - 更新自定义变量
 * DELETE /api/variables/:id - 删除自定义变量
 */

// 获取变量列表
router.get('/', variableController.getVariables);

// 获取单个变量
router.get('/:id', variableController.getVariableById);

// 创建自定义变量
router.post('/', variableController.createVariable);

// 更新自定义变量
router.put('/:id', variableController.updateVariable);

// 删除自定义变量
router.delete('/:id', variableController.deleteVariable);

export default router;
