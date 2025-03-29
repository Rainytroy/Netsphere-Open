import { variableService } from '../services/variableService';

// 从VariableEditor提取的变量类型
export interface VariableView {
  id: string;
  name: string;
  identifier: string;
  type: string;
  sourceId: string;
  sourceName: string;
  value: string;
}

export interface ResolveOptions {
  cacheVariables?: boolean;  // 是否缓存变量数据
  logProcess?: boolean;      // 是否输出解析过程日志
  strictMatching?: boolean;  // 是否使用严格匹配模式
}

/**
 * 解析标识符，获取组成部分
 * @param identifier 标识符，如 @云透.name#1234 或新格式 @gv_abc123
 */
export const parseIdentifier = (identifier: string): { 
  sourceName: string, 
  field: string,
  sourceId: string | null,
  isNewFormat: boolean 
} => {
  // 默认值
  const result = {
    sourceName: '',
    field: '',
    sourceId: null as string | null,
    isNewFormat: false
  };
  
  // 检查是否是新格式的全局变量标识符 @gv_UUID
  const newFormatRegex = /^@gv_([a-zA-Z0-9-]+)$/;
  const newFormatMatch = identifier.match(newFormatRegex);
  
  if (newFormatMatch) {
    // 如果是新格式，设置sourceId，标记为新格式
    result.sourceId = newFormatMatch[1];
    result.isNewFormat = true;
    return result;
  }
  
  // 解析标识符 - 使用更精确的模式匹配
  // #后面是4位字符（新的显示格式规范）
  const regex = /^@([^.]+)\.([^#]+)(?:#([a-zA-Z0-9]{4}))?$/;
  const match = identifier.match(regex);
  
  if (match) {
    result.sourceName = match[1];
    result.field = match[2].trim();
    result.sourceId = match[3] || null;
  }
  
  return result;
};

// 缓存变量数据，避免重复请求
let cachedVariables: VariableView[] | null = null;

/**
 * 解析文本中的变量引用 (@source.field)
 */
export const resolveVariableReferences = async (
  text: string, 
  options: ResolveOptions = {}
): Promise<string> => {
  const { cacheVariables = true, logProcess = false, strictMatching = false } = options;
  
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  if (logProcess) console.log('[VariableResolver] 开始解析变量引用:', text);
  
// 匹配变量引用:
  // 1. 旧格式: @来源.字段 或 @来源.字段#ID 
  // 2. 新格式: @gv_UUID
  const variablePattern = /(?:@([a-zA-Z0-9_\u4e00-\u9fa5]+)\.([a-zA-Z0-9_]+)(?:#([a-zA-Z0-9]{4}))?|@gv_([a-zA-Z0-9-]+))/g;
  
  // 查找所有变量引用
  const matches = Array.from(text.matchAll(variablePattern));
  if (matches.length === 0) {
    if (logProcess) console.log('[VariableResolver] 未找到变量引用');
    return text; // 没有变量引用，直接返回原文本
  }
  
  if (logProcess) console.log('[VariableResolver] 找到变量引用:', matches.length, '个');
  
  // 获取所有变量数据 (只请求一次)
  let variables: VariableView[] = [];
  
  if (cacheVariables && cachedVariables) {
    variables = cachedVariables;
    if (logProcess) console.log('[VariableResolver] 使用缓存的变量数据:', variables.length, '个');
  } else {
    try {
      const response = await variableService.getVariables();
      if (logProcess) console.log('[VariableResolver] 原始API响应:', response);
      
      // 尝试处理各种可能的响应格式
      if (Array.isArray(response)) {
        variables = response;
      } else if (response && typeof response === 'object') {
        // 使用类型断言处理不确定的响应结构
        const responseObj = response as any;
        if (responseObj.data && Array.isArray(responseObj.data)) {
          variables = responseObj.data;
        } else if (responseObj.data?.data && Array.isArray(responseObj.data.data)) {
          variables = responseObj.data.data;
        }
      }
      
      // 转换为VariableView格式
      variables = variables.map((v: any) => ({
        id: v.id || '',
        name: v.name || '',
        identifier: v.identifier || '',
        type: v.type || '',
        sourceId: v.source?.id || '',
        sourceName: v.source?.name || v.name,
        value: v.value || ''
      }));
      
      if (cacheVariables) {
        cachedVariables = variables;
      }
      
      if (logProcess) console.log('[VariableResolver] 处理后的变量数据:', variables);
    } catch (error) {
      console.error('[VariableResolver] 获取变量数据失败:', error);
      // 出错时返回原文本
      return text;
    }
  }
  
    // 替换所有变量引用
  let resolvedText = text;
  
  for (const match of matches) {
    const [fullMatch, source, field, id = ''] = match;
    if (logProcess) console.log('[VariableResolver] 处理变量引用:', fullMatch, '源:', source, '字段:', field, 'ID:', id);
    
    // 查找匹配的变量
    let variable: VariableView | undefined;
    
    // 构建完整标识符和不带ID的标识符用于匹配
    const fullIdentifier = id ? `@${source}.${field}#${id}` : `@${source}.${field}`;
    const baseIdentifier = `@${source}.${field}`;
    
    if (logProcess) console.log('[VariableResolver] 尝试匹配标识符:', fullIdentifier, '或', baseIdentifier);
    
    if (strictMatching) {
      // 严格匹配模式 (完全匹配identifier或名称)
      variable = variables.find(v => 
        v.identifier === fullIdentifier || 
        v.identifier === baseIdentifier || 
        (v.sourceName === source && v.name === field)
      );
    } else {
      // 宽松匹配模式 (尝试各种可能的匹配)
      variable = variables.find(v => {
        // 直接匹配完整标识符（包括ID部分）
        if (v.identifier === fullIdentifier) return true;
        
        // 匹配基础标识符（不带ID部分）
        if (v.identifier === baseIdentifier) return true;
        
        // 匹配源名称和字段名称
        if (v.sourceName === source && v.name === field) return true;
        
        // 不区分大小写匹配
        if (v.sourceName.toLowerCase() === source.toLowerCase() && 
            v.name.toLowerCase() === field.toLowerCase()) return true;
            
        // 不区分大小写匹配标识符
        const lowerIdentifier = v.identifier.toLowerCase();
        const lowerFullMatch = fullIdentifier.toLowerCase();
        const lowerBaseMatch = baseIdentifier.toLowerCase();
        
        if (lowerIdentifier === lowerFullMatch || lowerIdentifier === lowerBaseMatch) return true;
        
        // ID匹配逻辑 - 解析两个标识符，比较ID部分
        if (id) {
          // 如果引用中包含ID部分，尝试使用ID进行匹配
          const parsedVar = parseIdentifier(v.identifier);
          if (parsedVar.sourceId && parsedVar.sourceId === id) {
            if (logProcess) console.log('[VariableResolver] 通过ID部分匹配成功:', id);
            return true;
          }
        }
        
        return false;
      });
    }
    
    if (variable) {
      if (logProcess) console.log('[VariableResolver] 找到匹配变量:', variable);
      // 替换变量引用为实际值
      resolvedText = resolvedText.replace(fullMatch, variable.value || '');
    } else {
      if (logProcess) console.log('[VariableResolver] 未找到匹配变量');
      // 如果没找到匹配变量，保持原始文本不变
    }
  }
  
  if (logProcess) console.log('[VariableResolver] 解析后的文本:', resolvedText);
  return resolvedText;
};

// 清除变量缓存
export const clearVariableCache = () => {
  cachedVariables = null;
};

/**
 * 获取变量数据
 * 内部工具函数，复用getVariables逻辑，确保数据一致性
 */
const getVariablesData = async (): Promise<VariableView[]> => {
  if (cachedVariables) {
    return cachedVariables;
  }
  
  try {
    const response = await variableService.getVariables();
    let variables = [];
    
    // 尝试处理各种可能的响应格式
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
    
    // 转换为VariableView格式
    const result = variables.map((v: any) => ({
      id: v.id || '',
      name: v.name || '',
      identifier: v.identifier || '',
      type: v.type || '',
      sourceId: v.source?.id || '',
      sourceName: v.source?.name || v.name,
      value: v.value || ''
    }));
    
    // 缓存结果
    cachedVariables = result;
    return result;
  } catch (error) {
    console.error('[VariableResolver] 获取变量数据失败:', error);
    return [];
  }
};

/**
 * 更新文本中的变量标识符，使其与当前最新命名保持一致
 * 该函数主要用于编辑器显示内容前调用，更新旧标识符的显示样式
 * @param text 原始文本
 * @returns 更新后的文本
 */
export const updateVariableIdentifiers = async (text: string): Promise<string> => {
  if (!text) return text;
  
  console.log('[VariableResolver] 开始更新变量标识符:', text);
  
  // 获取所有变量数据
  const variables = await getVariablesData();
  console.log('[VariableResolver] 获取到变量数据:', variables.length, '个');
  
  // 用于快速查找变量，id部分作为key
  const idMap = new Map<string, VariableView>();
  const sourceFieldMap = new Map<string, VariableView[]>();
  
    // 构建ID映射和源字段映射(用于无ID时回退)
    variables.forEach(v => {
      const parsed = parseIdentifier(v.identifier);
      
      // ID映射 - 处理新旧格式
      if (parsed.sourceId) {
        idMap.set(parsed.sourceId, v);
        
        // 如果是新格式，也需要将完整的UUID存储在映射中
        if (parsed.isNewFormat) {
          // 从标识符中提取UUID (去掉@gv_前缀)
          const uuid = v.identifier.substring(4);
          idMap.set(uuid, v);
        }
      }
      
      // 源字段映射 - 仅适用于旧格式或显示格式
      if (!parsed.isNewFormat && parsed.sourceName && parsed.field) {
        const sourceFieldKey = `${parsed.sourceName}.${parsed.field}`.toLowerCase();
        if (!sourceFieldMap.has(sourceFieldKey)) {
          sourceFieldMap.set(sourceFieldKey, []);
        }
        sourceFieldMap.get(sourceFieldKey)?.push(v);
      }
    });
  
  console.log('[VariableResolver] ID映射大小:', idMap.size);
  console.log('[VariableResolver] 源字段映射大小:', sourceFieldMap.size);
  
  // 使用更严格的正则表达式，添加词边界检查，避免误匹配
  // 支持新旧两种格式:
  // 1. 旧/显示格式: @源名称.字段#ID
  // 2. 新格式: @gv_UUID
  const enhancedPattern = /(?<!\w)(?:@([a-zA-Z0-9_\u4e00-\u9fa5]+)\.([a-zA-Z0-9_]+)(?:#([a-zA-Z0-9-]{4}))?|@gv_([a-zA-Z0-9-]+))(?!\w)/g;
  
  // 处理重复的变量标识符 - 例如连续重复的同一标识符
  // 先尝试去除明显的重复格式
  let cleanedText = text;
  const duplicatePattern = /(@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(?:#[a-zA-Z0-9-]+)?)(\1+)/g;
  cleanedText = cleanedText.replace(duplicatePattern, '$1');
  
  // 使用Set跟踪已处理的标识符，避免重复处理
  const processedIdentifiers = new Set();
  
  // 获取所有匹配
  const matches = Array.from(cleanedText.matchAll(enhancedPattern));
  console.log('[VariableResolver] 找到变量标识符:', matches.length, '个');
  
  // 遍历所有匹配并处理
  let resultText = cleanedText;
  for (const match of matches) {
    // 提取匹配部分 - 兼容新旧两种格式
    let fullMatch, source, field, id, newFormatId;
    
    // match[0] 总是完整匹配
    fullMatch = match[0];
    
    // 检查是否是新格式 (@gv_UUID)
    if (fullMatch.startsWith('@gv_')) {
      [fullMatch, source, field, id, newFormatId] = match;
    } else {
      [fullMatch, source, field, id = ''] = match;
      newFormatId = undefined;
    }
    
    // 跳过已处理的标识符
    if (processedIdentifiers.has(fullMatch)) {
      console.log('[VariableResolver] 跳过已处理的标识符:', fullMatch);
      continue;
    }
    
    // 标记为已处理
    processedIdentifiers.add(fullMatch);
    
    // 检查是否是新格式标识符
    if (newFormatId) {
      console.log('[VariableResolver] 处理新格式变量:', fullMatch, 'UUID:', newFormatId);
      
      // 查找对应的变量
      const variable = idMap.get(newFormatId);
      if (variable && variable.source && variable.source.name) {
        // 获取变量的源和字段信息
        const displayIdentifier = `@${variable.source.name}.${variable.name}#${newFormatId.substring(0, 4)}`;
        
        // 如果支持显示格式，则更新为显示格式
        console.log('[VariableResolver] 转换为显示格式:', fullMatch, '->', displayIdentifier);
        const safeReplacePattern = new RegExp(escapeRegExp(fullMatch), 'g');
        resultText = resultText.replace(safeReplacePattern, displayIdentifier);
      }
      continue;
    }
    
    console.log('[VariableResolver] 处理旧格式变量:', fullMatch, '源:', source, '字段:', field, 'ID:', id);
    
    // 如果有ID部分，尝试精确更新
    if (id) {
      // 特殊处理 - 检查是否是自定义变量ID
      if (id === 'cust' || id === '1529') {
        // 对于自定义变量，保留原始源名称
        console.log('[VariableResolver] 检测到自定义变量ID:', id, '保留原始源名称:', source);
        continue; // 不做任何改变，保留用户输入的源名称
      }
      
      // 对于其他ID，查找精确匹配
      const variable = idMap.get(id);
      if (variable) {
        // 源名称没有变化，不需要更新
        if (variable.sourceName === source) {
          console.log('[VariableResolver] 源名称相同，无需更新:', source);
          continue;
        }
        
        // 增加安全检查 - 确保不是自定义变量类型
        if (variable.type === 'custom') {
          console.log('[VariableResolver] 检测到自定义变量类型，保留原始源名称:', source);
          continue;
        }
        
        console.log('[VariableResolver] 更新源名称:', source, '->', variable.sourceName);
        // 使用安全的字符串替换方法
        const safeReplacePattern = new RegExp(escapeRegExp(fullMatch), 'g');
        resultText = resultText.replace(safeReplacePattern, `@${variable.sourceName}.${field}#${id}`);
      }
      continue;
    }
    
    // 没有ID或ID不匹配，尝试使用源和字段匹配
    const sourceFieldKey = `${source}.${field}`.toLowerCase();
    const matchingVars = sourceFieldMap.get(sourceFieldKey);
    
    if (matchingVars && matchingVars.length > 0) {
      // 如果有多个匹配，使用第一个
      const variable = matchingVars[0];
      
      // 不需要更新
      if (variable.sourceName === source) {
        continue;
      }
      
      console.log('[VariableResolver] 通过源字段更新:', source, '->', variable.sourceName);
      // 使用安全的字符串替换方法
      const safeReplacePattern = new RegExp(escapeRegExp(fullMatch), 'g');
      const newIdentifier = id 
        ? `@${variable.sourceName}.${field}#${id}` 
        : `@${variable.sourceName}.${field}`;
      resultText = resultText.replace(safeReplacePattern, newIdentifier);
    }
  }
  
  console.log('[VariableResolver] 更新结果:', resultText !== text ? '有变化' : '无变化');
  return resultText;
};

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
