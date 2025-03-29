/**
 * 变量诊断系统路由 (TypeScript版本)
 * 提供诊断和测试API端点
 */
import express from 'express';
import { Request, Response } from 'express';
import * as variableDiagnosticController from '../controllers/variableDiagnosticController';

const router = express.Router();

/**
 * @route   GET /api/variable-diagnostic/system
 * @desc    执行变量系统诊断
 * @access  Public
 */
router.get('/system', variableDiagnosticController.diagnoseSystem);

/**
 * @route   POST /api/variable-diagnostic/test-resolution
 * @desc    测试变量解析功能
 * @access  Public
 * @body    {text: "包含@gv_UUID_field变量的文本", debug: true}
 */
router.post('/test-resolution', variableDiagnosticController.testVariableResolution);

export default router;
