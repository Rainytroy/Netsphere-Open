const express = require('express');
const router = express.Router();
const workTaskController = require('../controllers/workTaskController');
const auth = require('../middleware/auth');

// 工作任务基本CRUD操作
router.get('/', auth, workTaskController.getAllWorkTasks);
router.get('/:id', auth, workTaskController.getWorkTaskById);
router.post('/', auth, workTaskController.createWorkTask);
router.put('/:id', auth, workTaskController.updateWorkTask);
router.delete('/:id', auth, workTaskController.deleteWorkTask);

// 工作任务执行相关
router.post('/:id/execute', auth, workTaskController.executeWorkTask);
router.post('/test-execute', auth, workTaskController.testExecuteWorkTask);

// 新增: NPC提示词模板相关端点
router.get('/:id/templates', auth, workTaskController.getTaskTemplates);
router.put('/:id/templates', auth, workTaskController.updateTaskTemplates);

module.exports = router;
