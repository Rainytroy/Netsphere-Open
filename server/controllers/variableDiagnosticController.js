/**
 * 变量诊断控制器
 * 提供对变量解析系统的诊断接口
 */
const variableService = require('../services/variableService');

/**
 * 执行诊断并返回结果
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
exports.diagnoseSystem = async (req, res) => {
  try {
    // 执行系统诊断
    const diagnosticInfo = await variableService.diagnoseVariableSystem();
    
    // 添加请求信息
    diagnosticInfo.request = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl
    };
    
    res.json({
      success: true,
      data: diagnosticInfo
    });
  } catch (error) {
    console.error('诊断系统出错:', error);
    res.status(500).json({
      success: false,
      error: error.message || '诊断过程中出现未知错误'
    });
  }
};

/**
 * 测试变量解析功能
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
exports.testVariableResolution = async (req, res) => {
  try {
    const { text, debug } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的文本参数'
      });
    }
    
    // 执行变量解析
    const options = { debug: debug === true };
    const originalText = text;
    const resolvedText = await variableService.resolveVariables(text, options);
    
    res.json({
      success: true,
      data: {
        original: originalText,
        resolved: resolvedText,
        changed: originalText !== resolvedText,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('测试变量解析出错:', error);
    res.status(500).json({
      success: false,
      error: error.message || '解析过程中出现未知错误'
    });
  }
};
