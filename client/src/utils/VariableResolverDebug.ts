import { clearVariableCache, resolveVariableReferences } from "./VariableResolver";
import { variableService } from "../services/variableService";

/**
 * 获取变量列表
 * 内部工具函数，用于获取变量列表
 */
export const getVariables = async () => {
  try {
    const response = await variableService.getVariables();
    
    // 处理各种可能的响应格式
    let variables = [];
    if (Array.isArray(response)) {
      variables = response;
    } else if (response && typeof response === 'object') {
      const responseObj = response as any;
      if (responseObj.data && Array.isArray(responseObj.data)) {
        variables = responseObj.data;
      } else if (responseObj.data?.data && Array.isArray(responseObj.data.data)) {
        variables = responseObj.data.data;
      }
    }
    
    return variables;
  } catch (error) {
    console.error('获取变量列表失败:', error);
    return [];
  }
};

/**
 * 变量解析函数
 * @param text 要解析的文本
 * @param forceClearCache 是否强制清除缓存
 */
export const resolveVariables = async (text: string, forceClearCache: boolean = true): Promise<string> => {
  if (forceClearCache) {
    clearVariableCache();
  }
  
  // 使用标准变量解析器
  return await resolveVariableReferences(text, {
    cacheVariables: false,  // 不使用缓存
    strictMatching: false   // 使用宽松匹配
  });
};
