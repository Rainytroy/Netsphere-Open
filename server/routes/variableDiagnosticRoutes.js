/**
 * 变量诊断系统路由
 * 提供诊断和测试API端点
 */
const express = require('express');
const router = express.Router();
const variableDiagnosticController = require('../controllers/variableDiagnosticController');

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

module.exports = router;
