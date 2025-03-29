/**
 * 变量服务
 * 提供系统变量的解析和处理功能
 */
const { Op } = require('sequelize');

// 临时强制设置为最高日志级别进行调试
process.env.VARIABLE_SERVICE_LOG_LEVEL = 'debug';

// 从环境变量或配置中获取日志级别
const LOG_LEVEL = process.env.VARIABLE_SERVICE_LOG_LEVEL || 'info';

// 临时函数：强制记录日志，忽略日志级别设置
const forceLog = (...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[强制日志][${timestamp}]`, ...args);
};

// 查找两个字符串的第一个不同点
function findFirstDifference(str1, str2) {
  const minLength = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLength; i++) {
    if (str1[i] !== str2[i]) {
      return {
        position: i,
        char1: str1[i],
        char2: str2[i],
        context1: str1.substring(Math.max(0, i - 10), Math.min(str1.length, i + 10)),
        context2: str2.substring(Math.max(0, i - 10), Math.min(str2.length, i + 10))
      };
    }
  }
  
  if (str1.length !== str2.length) {
    return {
      position: minLength,
      reason: str1.length > str2.length ? '第一个字符串更长' : '第二个字符串更长',
      extraContent: str1.length > str2.length 
        ? str1.substring(minLength, Math.min(str1.length, minLength + 20))
        : str2.substring(minLength, Math.min(str2.length, minLength + 20))
    };
  }
  
  return null; // 完全相同
}

// 日志级别枚举
const LogLevels = {
  NONE: 0,    // 不输出日志
  ERROR: 1,   // 只输出错误
  WARN: 2,    // 输出警告和错误
  INFO: 3,    // 输出基本信息、警告和错误
  DEBUG: 4    // 输出所有日志
};

// 获取当前日志级别
const getCurrentLogLevel = () => {
  switch (LOG_LEVEL.toLowerCase()) {
    case 'none': return LogLevels.NONE;
    case 'error': return LogLevels.ERROR;
    case 'warn': return LogLevels.WARN;
    case 'info': return LogLevels.INFO;
    case 'debug': return LogLevels.DEBUG;
    default: return LogLevels.INFO; // 默认日志级别
  }
};

// 日志工具函数
const logger = {
  error: (...args) => {
    if (getCurrentLogLevel() >= LogLevels.ERROR) {
      console.error('[VariableService] [ERROR]', ...args);
    }
  },
  warn: (...args) => {
    if (getCurrentLogLevel() >= LogLevels.WARN) {
      console.warn('[VariableService] [WARN]', ...args);
    }
  },
  info: (...args) => {
    if (getCurrentLogLevel() >= LogLevels.INFO) {
      console.log('[VariableService] [INFO]', ...args);
    }
  },
  debug: (...args) => {
    if (getCurrentLogLevel() >= LogLevels.DEBUG) {
      console.log('[VariableService] [DEBUG]', ...args);
    }
  }
};

/**
 * 解析文本中的变量标识符，替换为实际值
 * 服务端变量解析实现，参考VEX前端实现
 * 
 * @param {string} text - 包含变量标识符的文本
 * @param {Object} options - 可选配置项
 * @param {boolean} options.debug - 是否启用额外调试日志
 * @returns {Promise<string>} - 解析后的文本
 */
exports.resolveVariables = async (text, options = {}) => {
  const { debug = true } = options; // 强制启用调试
  const logLevel = debug ? LogLevels.DEBUG : getCurrentLogLevel();
  const startTime = Date.now();
  const variableResolutionDetails = {
    originalText: text,
    matches: [],
    variables: [],
    replacements: [],
    errors: []
  };
  
  // 强制输出原始文本
  forceLog('开始解析变量，原始文本:', {
    text: text && text.length > 100 ? text.substring(0, 100) + '...' : text,
    length: text ? text.length : 0,
    containsGvFormat: text && text.includes('@gv_')
  });
  
  // 检查输入是否有效
  if (!text) {
    forceLog('输入为空，直接返回');
    logger.debug('输入为空，直接返回');
    return '';
  }
  
  // 使用正则表达式匹配所有变量标识符 @gv_UUID_field
  const variablePattern = /@gv_([0-9a-f-]+)_([a-zA-Z0-9_]+)/g;
  const matches = Array.from(text.matchAll(variablePattern));
  
  // 如果没有找到匹配项，直接返回原文本
  if (matches.length === 0) {
    forceLog('未找到变量标识符，返回原文本');
    logger.debug('未找到变量标识符，返回原文本');
    return text;
  }
  
  // 记录匹配结果
  const matchDetails = matches.map(m => ({
    fullMatch: m[0], 
    uuid: m[1], 
    field: m[2]
  }));
  variableResolutionDetails.matches = matchDetails;
  
  forceLog(`找到${matches.length}个变量标识符:`, matchDetails);
  logger.debug(`找到${matches.length}个变量标识符:`, matches.map(m => m[0]));
  
  try {
    // 从匹配项中提取唯一的变量ID集合
    const variableIds = Array.from(new Set(matches.map(match => match[1])));
    forceLog('需要查询的变量ID:', variableIds);
    logger.debug('需要查询的变量ID:', variableIds);
    
    // 获取变量数据 - 使用更安全的导入方式
    let Variable;
    try {
      // 尝试动态导入模型
      const models = require('../models');
      Variable = models.Variable;
      
      if (!Variable) {
        throw new Error('Variable模型不存在');
      }
      
      forceLog('成功获取Variable模型');
      logger.debug('成功获取Variable模型');
    } catch (importError) {
      forceLog('导入Variable模型失败:', importError);
      logger.error('导入Variable模型失败:', importError);
      // 出错时返回原始文本，确保系统不会中断
      variableResolutionDetails.errors.push({
        type: 'MODEL_IMPORT_ERROR',
        message: importError.message
      });
      logger.warn('无法解析变量，返回原始文本');
      return {
        resolvedText: text,
        details: variableResolutionDetails
      };
    }
    
    // 检查数据库连接状态
    try {
      await Variable.findOne(); // 简单查询测试连接
      forceLog('数据库连接正常');
    } catch (dbError) {
      forceLog('数据库连接异常:', dbError);
      variableResolutionDetails.errors.push({
        type: 'DATABASE_CONNECTION_ERROR',
        message: dbError.message
      });
    }
    
    // 查询数据库获取这些变量
    forceLog(`尝试从数据库查询变量，查询条件: id IN (${variableIds.join(', ')})`);
    logger.debug(`尝试从数据库查询变量，查询条件: id IN (${variableIds.join(', ')})`);
    const variables = await Variable.findAll({
      where: {
        id: {
          [Op.in]: variableIds
        }
      }
    });
    
    // 记录找到的变量情况
    const variableDetails = variables.map(v => ({
      id: v.id,
      name: v.name || '未命名',
      hasValue: v.value !== undefined && v.value !== null,
      valuePreview: v.value ? (typeof v.value === 'string' && v.value.length > 30 ? v.value.substring(0, 30) + '...' : v.value) : '(空)'
    }));
    variableResolutionDetails.variables = variableDetails;
    
    forceLog(`数据库返回${variables.length}个变量:`, variableDetails);
    logger.info(`数据库返回${variables.length}个变量`);
    
    // 创建变量ID到变量对象的映射，方便快速查找
    const variableMap = {};
    variables.forEach(variable => {
      variableMap[variable.id] = variable;
      logger.debug(`变量映射: ID=${variable.id}, 名称=${variable.name || '未命名'}, 值=${variable.value || '(空)'}`);
    });
    
    // 替换所有变量标识符为其实际值
    let resolvedText = text;
    let totalReplacements = 0;
    for (const match of matches) {
      const [fullMatch, variableId, field] = match;
      const variable = variableMap[variableId];
      
      const replacementDetail = {
        identifier: fullMatch,
        variableId,
        field,
        found: !!variable,
        value: null,
        replaced: false
      };
      
      forceLog(`处理标识符: ${fullMatch}, ID=${variableId}, 字段=${field}, 找到变量: ${!!variable}`);
      logger.debug(`处理标识符: ${fullMatch}, ID=${variableId}, 字段=${field}`);
      
      if (variable) {
        // 根据字段名获取变量值
        let value = null;
        
        if (field === 'value') {
          value = variable.value;
          replacementDetail.fieldType = 'value';
        } else if (field === 'name') {
          value = variable.name;
          replacementDetail.fieldType = 'name';
        } else if (variable[field] !== undefined) {
          value = variable[field];
          replacementDetail.fieldType = 'custom';
        }
        
        replacementDetail.value = value;
        
        // 只有在值非null或undefined时才替换
        if (value !== null && value !== undefined) {
          forceLog(`找到变量值: ${value}`);
          logger.debug(`找到变量值: ${value}`);
          
          // 保存替换前的文本用于对比
          const before = resolvedText;
          
          // 使用字符串替换，替换所有出现的标识符
          const regex = new RegExp(escapeRegExp(fullMatch), 'g');
          resolvedText = resolvedText.replace(regex, value);
          
          // 计算替换次数
          const replacementCount = (before.match(regex) || []).length;
          totalReplacements += replacementCount;
          
          // 检查替换是否成功
          const replaced = before !== resolvedText;
          replacementDetail.replaced = replaced;
          replacementDetail.replacementCount = replacementCount;
          
          if (replaced) {
            const difference = findFirstDifference(before, resolvedText);
            replacementDetail.firstDifference = difference;
          }
          
          forceLog(`替换标识符 ${fullMatch} -> ${value} (${replacementCount}处), 成功: ${replaced}`);
          logger.debug(`替换标识符 ${fullMatch} -> ${value} (${replacementCount}处)`);
        } else {
          forceLog(`变量ID=${variableId}的${field}字段值为空，不进行替换`);
          logger.warn(`变量ID=${variableId}的${field}字段值为空，不进行替换`);
          replacementDetail.error = 'EMPTY_VALUE';
        }
      } else {
        forceLog(`未找到ID为${variableId}的变量`);
        logger.warn(`未找到ID为${variableId}的变量`);
        replacementDetail.error = 'VARIABLE_NOT_FOUND';
      }
      
      variableResolutionDetails.replacements.push(replacementDetail);
    }
    
    // 生成最终解析报告
    variableResolutionDetails.resolvedText = resolvedText;
    variableResolutionDetails.totalReplacements = totalReplacements;
    variableResolutionDetails.executionTimeMs = Date.now() - startTime;
    variableResolutionDetails.success = totalReplacements > 0;
    variableResolutionDetails.changed = text !== resolvedText;
    
    if (text !== resolvedText) {
      variableResolutionDetails.firstDifference = findFirstDifference(text, resolvedText);
    }
    
    forceLog(`变量解析完成，共替换了${totalReplacements}处变量引用`);
    logger.info(`变量解析完成，共替换了${totalReplacements}处变量引用`);
    forceLog('最终解析结果对比:', {
      原始文本: text.length > 50 ? text.substring(0, 50) + '...' : text,
      解析后文本: resolvedText.length > 50 ? resolvedText.substring(0, 50) + '...' : resolvedText,
      是否有变化: text !== resolvedText
    });
    logger.debug('最终解析结果:', resolvedText);
    return {
      resolvedText,
      details: variableResolutionDetails
    };
  } catch (error) {
    logger.error('解析变量时出错:', error);
    // 出错时返回原始文本，确保系统不会中断
    return text;
  }
}

/**
 * 查询变量列表
 * 
 * @param {Object} filters - 过滤条件
 * @returns {Promise<Array>} - 变量列表
 */
exports.getVariables = async (filters = {}) => {
  logger.debug('查询变量列表，过滤条件:', filters);
  
  try {
    // 获取模型
    const models = require('../models');
    const Variable = models.Variable;
    
    if (!Variable) {
      logger.error('Variable模型不存在');
      return [];
    }
    
    // 构建查询条件
    const whereClause = {};
    
    if (filters.type) {
      whereClause.type = filters.type;
    }
    
    if (filters.sourceId) {
      whereClause.sourceId = filters.sourceId;
    }
    
    // 执行查询
    logger.debug('执行查询，条件:', whereClause);
    const variables = await Variable.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']]
    });
    
    logger.info(`查询到${variables.length}个变量`);
    return variables;
  } catch (error) {
    logger.error('查询变量列表失败:', error);
    throw error;
  }
};

/**
 * 获取单个变量
 * 
 * @param {string} id - 变量ID
 * @returns {Promise<Object>} - 变量对象
 */
exports.getVariable = async (id) => {
  logger.debug(`尝试获取变量，ID=${id}`);
  
  try {
    // 获取模型
    const models = require('../models');
    const Variable = models.Variable;
    
    if (!Variable) {
      logger.error('Variable模型不存在');
      return null;
    }
    
    const variable = await Variable.findByPk(id);
    
    if (variable) {
      logger.info(`成功获取变量，ID=${id}`);
    } else {
      logger.warn(`未找到变量，ID=${id}`);
    }
    
    return variable;
  } catch (error) {
    logger.error(`获取变量失败 ID=${id}:`, error);
    throw error;
  }
};

/**
 * 辅助函数：转义正则表达式特殊字符
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 诊断函数：检查变量解析系统状态
 * 输出可供诊断的系统状态信息
 * 
 * @returns {Promise<Object>} 诊断信息
 */
exports.diagnoseVariableSystem = async () => {
  logger.info('开始诊断变量系统');
  
  const diagnosticInfo = {
    timestamp: new Date().toISOString(),
    logLevel: LOG_LEVEL,
    nodeVersion: process.version,
    models: {
      variableModelLoaded: false,
      errorMessage: null
    },
    database: {
      connectionStatus: 'unknown',
      variableCount: 0,
      errorMessage: null
    }
  };
  
  // 检查模型加载状态
  try {
    const models = require('../models');
    diagnosticInfo.models.variableModelLoaded = !!models.Variable;
    
    // 检查数据库连接和变量数量
    if (diagnosticInfo.models.variableModelLoaded) {
      try {
        const count = await models.Variable.count();
        diagnosticInfo.database.connectionStatus = 'connected';
        diagnosticInfo.database.variableCount = count;
      } catch (dbError) {
        diagnosticInfo.database.connectionStatus = 'error';
        diagnosticInfo.database.errorMessage = dbError.message;
      }
    }
  } catch (modelError) {
    diagnosticInfo.models.errorMessage = modelError.message;
  }
  
  logger.info('诊断完成', diagnosticInfo);
  return diagnosticInfo;
};
