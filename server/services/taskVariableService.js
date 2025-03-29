/**
 * 工作任务变量同步服务
 * 提供工作任务与变量系统同步的功能
 */

/**
 * 更新工作任务对应的变量output字段
 * @param {string} taskId 工作任务ID
 * @param {string} outputContent 输出内容
 * @param {boolean} isTestMode 是否为测试模式
 * @returns {Promise<boolean>} 是否更新成功
 */
const updateTaskOutputVariable = async (taskId, outputContent, isTestMode = false) => {
  const { Variable } = require('../models');
  const logger = console;
  
  try {
    logger.info(`开始更新任务变量, taskId=${taskId}, isTestMode=${isTestMode}`);
    
    // 查找对应的变量
    const variable = await Variable.findOne({
      where: {
        sourceId: taskId,
        type: 'task'
      }
    });
    
    if (!variable) {
      logger.warn(`未找到任务对应的变量, taskId=${taskId}`);
      return false;
    }
    
    // 记录原始内容长度（用于日志）
    const originalLength = variable.value ? variable.value.length : 0;
    
    // 更新变量的值
    await variable.update({
      value: outputContent  // 直接更新value字段，而不是output字段，因为变量的主值存在value中
    });
    
    logger.info(`成功更新任务变量, taskId=${taskId}, 内容长度从${originalLength}更新为${outputContent ? outputContent.length : 0}`);
    return true;
  } catch (error) {
    logger.error(`更新任务变量失败, taskId=${taskId}:`, error);
    return false;
  }
};

// 将函数导出以便在控制器中使用
module.exports = {
  updateTaskOutputVariable
};
