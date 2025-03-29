const { WorkTask, Npc, AiService } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { executeAiRequest } = require('../services/aiService');
const { resolveVariables } = require('../services/variableService');

// 获取所有工作任务
exports.getAllWorkTasks = async (req, res) => {
  try {
    const tasks = await WorkTask.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: Npc, as: 'npc' },
        { model: AiService, as: 'aiService' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('获取工作任务列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 根据ID获取工作任务
exports.getWorkTaskById = async (req, res) => {
  try {
    const task = await WorkTask.findByPk(req.params.id, {
      include: [
        { model: Npc, as: 'npc' },
        { model: AiService, as: 'aiService' }
      ]
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '工作任务不存在'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('获取工作任务详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 创建工作任务
exports.createWorkTask = async (req, res) => {
  try {
    // 生成UUID
    const taskId = uuidv4();
    
    // 提取NPC模板（如果有）
    const { npcTemplates, ...taskData } = req.body;
    
    // 创建任务
    const task = await WorkTask.create({
      id: taskId,
      ...taskData,
      npc_templates: npcTemplates || {}
    });
    
    return res.status(201).json({
      success: true,
      message: '工作任务创建成功',
      data: task,
      id: task.id
    });
  } catch (error) {
    console.error('创建工作任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 更新工作任务
exports.updateWorkTask = async (req, res) => {
  try {
    const task = await WorkTask.findByPk(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '工作任务不存在'
      });
    }
    
    // 提取NPC模板（如果有）
    const { npcTemplates, ...updateData } = req.body;
    
    // 如果提供了npcTemplates，更新npc_templates字段
    if (npcTemplates) {
      updateData.npc_templates = npcTemplates;
    }
    
    await task.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: '工作任务更新成功',
      data: task
    });
  } catch (error) {
    console.error('更新工作任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 删除工作任务
exports.deleteWorkTask = async (req, res) => {
  try {
    const task = await WorkTask.findByPk(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '工作任务不存在'
      });
    }
    
    await task.destroy();
    
    return res.status(200).json({
      success: true,
      message: '工作任务删除成功'
    });
  } catch (error) {
    console.error('删除工作任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 执行工作任务
exports.executeWorkTask = async (req, res) => {
  try {
    const task = await WorkTask.findByPk(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '工作任务不存在'
      });
    }
    
    // 标记为正在执行
    await task.update({
      executionStatus: 'running'
    });
    
    try {
      // 解析输入和提示词模板中的变量
      const [resolvedInput, resolvedTemplate] = await Promise.all([
        resolveVariables(task.input),
        resolveVariables(task.npcPromptTemplate.template)
      ]);
      
      // 构建完整提示词
      const fullPrompt = resolvedTemplate + '\n\n输入: ' + resolvedInput;
      
      // 调用AI服务
      const aiResponse = await executeAiRequest(task.aiServiceId, fullPrompt);
      
      // 更新任务
      await task.update({
        output: aiResponse,
        lastRunAt: new Date(),
        executionStatus: 'completed'
      });
      
      // 【新增】更新任务对应的变量
      const { updateTaskOutputVariable } = require('../services/taskVariableService');
      updateTaskOutputVariable(task.id, aiResponse, false)
        .then(success => {
          console.info(`变量同步${success ? '成功' : '失败'}, taskId=${task.id}`);
        })
        .catch(error => {
          console.error('变量同步过程出错:', error);
        });
      
      return res.status(200).json({
        success: true,
        message: '工作任务执行成功',
        data: {
          output: aiResponse,
          taskId: task.id
        }
      });
    } catch (execError) {
      // 执行失败
      await task.update({
        executionStatus: 'failed'
      });
      
      throw execError;
    }
  } catch (error) {
    console.error('执行工作任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '执行工作任务失败',
      error: error.message
    });
  }
};

// 测试执行工作任务（不保存结果）
exports.testExecuteWorkTask = async (req, res) => {
  try {
    const { input, npcId, aiServiceId, npcPromptTemplate, debug = false, taskId } = req.body;
    
    if (!input || !aiServiceId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    try {
      // 解析输入和提示词模板中的变量
      const [inputResult, templateResult] = await Promise.all([
        resolveVariables(input),
        resolveVariables(npcPromptTemplate?.template || '')
      ]);
      
      // 提取解析后的文本和解析详情
      const resolvedInput = inputResult.resolvedText || inputResult; // 兼容旧版本返回值
      const resolvedTemplate = templateResult.resolvedText || templateResult; // 兼容旧版本返回值
      const inputDetails = inputResult.details || null;
      const templateDetails = templateResult.details || null;
      
      // 构建完整提示词
      const fullPrompt = resolvedTemplate + '\n\n输入: ' + resolvedInput;
      
      // 调用AI服务
      const aiResponse = await executeAiRequest(aiServiceId, fullPrompt);
      
      // 【新增】如果提供了taskId，则更新对应的变量
      if (taskId) {
        const { updateTaskOutputVariable } = require('../services/taskVariableService');
        updateTaskOutputVariable(taskId, aiResponse, true)
          .then(success => {
            console.info(`测试执行变量同步${success ? '成功' : '失败'}, taskId=${taskId}`);
          })
          .catch(error => {
            console.error('测试执行变量同步过程出错:', error);
          });
      }
      
      // 处理返回结果
      const result = {
        output: aiResponse
      };
      
      // 如果请求了调试信息，添加变量解析的详情
      if (debug) {
        result.debug = {
          originalInput: input,
          resolvedInput,
          originalTemplate: npcPromptTemplate?.template || '',
          resolvedTemplate,
          fullPrompt,
          // 添加变量解析详情
          variableResolution: {
            input: inputDetails,
            template: templateDetails
          }
        };
      }
      
      return res.status(200).json({
        success: true,
        message: '测试执行成功',
        data: result
      });
    } catch (execError) {
      throw execError;
    }
  } catch (error) {
    console.error('测试执行工作任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '测试执行失败',
      error: error.message
    });
  }
};

// 获取任务的NPC模板
exports.getTaskTemplates = async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // 从数据库获取工作任务
    const task = await WorkTask.findByPk(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '工作任务不存在'
      });
    }
    
    // 获取npc_templates字段，如果为空则返回空对象
    const templates = task.npc_templates || {};
    
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('获取任务模板失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// 更新任务的NPC模板
exports.updateTaskTemplates = async (req, res) => {
  try {
    const taskId = req.params.id;
    const templates = req.body;
    
    if (!templates || typeof templates !== 'object') {
      return res.status(400).json({
        success: false,
        message: '模板数据必须是有效的对象'
      });
    }
    
    // 从数据库获取工作任务
    const task = await WorkTask.findByPk(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '工作任务不存在'
      });
    }
    
    // 更新npc_templates字段
    await task.update({ npc_templates: templates });
    
    return res.status(200).json({
      success: true,
      message: '模板更新成功',
      data: templates
    });
  } catch (error) {
    console.error('更新任务模板失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};
