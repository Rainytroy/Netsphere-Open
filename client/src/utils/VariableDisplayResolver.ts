import { parseIdentifier } from './VariableResolver';
import { variableService } from '../services/variableService';

// 从VariableResolver提取的变量接口
interface VariableView {
  id: string;
  name: string;
  identifier: string;
  type: string;
  sourceId: string;
  sourceName: string;
  value: string;
}

// 用于记录缓存的变量名称和ID映射
let nameByIdCache: Map<string, string> = new Map();
let typeByIdCache: Map<string, string> = new Map();
let fieldByIdCache: Map<string, string> = new Map();

/**
 * 清除变量显示缓存
 */
export const clearDisplayCache = () => {
  nameByIdCache = new Map();
  typeByIdCache = new Map();
  fieldByIdCache = new Map();
};

/**
 * 解析系统变量标识符为友好的显示格式
 * 例如将 @gv_1742290165880_value 转换为 @测试用.value#5880
 * 
 * @param identifier 系统变量标识符（如@gv_UUID_field）
 * @param defaultSourceName 默认源名称（当无法获取真实名称时使用）
 * @returns 友好的显示格式（如@sourceName.field#shortId）
 */
export const resolveDisplayIdentifier = async (
  identifier: string,
  defaultSourceName: string = '变量'
): Promise<string> => {
  if (!identifier) return identifier;
  
  console.log('[VariableDisplayResolver] 开始解析显示标识符:', identifier);
  
  // 检查是否已经是显示格式 @sourceName.field#id
  if (identifier.match(/^@[^.]+\.[^#]+#[a-zA-Z0-9]{4}$/)) {
    console.log('[VariableDisplayResolver] 已经是显示格式，无需转换:', identifier);
    return identifier;
  }
  
  // 解析标识符以获取UUID和字段
  let uuid: string = '';
  let field: string = '';
  
  // 匹配新格式 @gv_UUID_field
  const newFormatRegex = /@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)/;
  const match = identifier.match(newFormatRegex);
  
  if (match) {
    uuid = match[1];
    field = match[2];
    console.log('[VariableDisplayResolver] 解析系统标识符:', identifier, 'UUID:', uuid, '字段:', field);
  } else {
    // 不是标准格式，返回原标识符
    console.log('[VariableDisplayResolver] 非标准格式，返回原始标识符:', identifier);
    return identifier;
  }
  
/**
 * 获取变量数据
 * 用于获取所有变量
 * @returns 变量数组
 */
const getVariablesData = async (): Promise<VariableView[]> => {
  try {
    const response = await variableService.getVariables();
    let variables: VariableView[] = [];
    
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
    return variables.map((v: any) => ({
      id: v.id || '',
      name: v.name || '',
      identifier: v.identifier || '',
      type: v.type || '',
      sourceId: v.source?.id || '',
      sourceName: v.source?.name || v.name || '',
      value: v.value || ''
    }));
  } catch (error) {
    console.error('[VariableDisplayResolver] 获取变量数据失败:', error);
    return [];
  }
};

// 检查缓存中是否有这个UUID对应的源名称
  let sourceName = nameByIdCache.get(uuid);
  let sourceType = typeByIdCache.get(uuid);
  
  // 如果缓存中没有，则从服务器获取
  if (!sourceName) {
    try {
      // 获取所有变量
      const variables = await getVariablesData();
      console.log('[VariableDisplayResolver] 获取变量数据:', variables.length, '个');
      
      // 通过系统标识符前缀@gv_UUID_查找匹配的变量
      const matchPrefix = `@gv_${uuid}_`;
      const matchVariable = variables.find((v: VariableView) => v.identifier && v.identifier.startsWith(matchPrefix));
      
      if (matchVariable) {
        console.log('[VariableDisplayResolver] 找到匹配变量:', matchVariable);
        sourceName = matchVariable.sourceName || matchVariable.name || defaultSourceName;
        sourceType = matchVariable.type;
        
        // 特殊处理自定义变量，使用变量名作为显示名称
        if (matchVariable.type === 'custom') {
          sourceName = matchVariable.name || '自定义变量';
        }
        
        // 缓存结果
        nameByIdCache.set(uuid, sourceName);
        typeByIdCache.set(uuid, sourceType || 'unknown');
      }
    } catch (error) {
      console.error('[VariableDisplayResolver] 获取变量数据失败:', error);
    }
  }
  
  // 如果仍然没有找到源名称，使用默认值
  if (!sourceName) {
    console.log('[VariableDisplayResolver] 未找到源名称，使用默认值:', defaultSourceName);
    sourceName = defaultSourceName;
  }
  
  // 构建显示标识符: @sourceName.field#shortId
  const shortId = uuid.substring(0, 4);
  const displayIdentifier = `@${sourceName}.${field}#${shortId}`;
  
  console.log('[VariableDisplayResolver] 生成显示标识符:', displayIdentifier);
  return displayIdentifier;
};

/**
 * 解析文本中的所有系统变量标识符为友好的显示格式
 * 
 * @param text 包含系统变量标识符的文本
 * @returns 转换后的文本
 */
export const resolveAllDisplayIdentifiers = async (text: string): Promise<string> => {
  if (!text) return text;
  
  // 匹配系统变量标识符 @gv_UUID_field
  const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
  const matches = Array.from(text.matchAll(regex));
  
  if (matches.length === 0) return text;
  
  let result = text;
  for (const match of matches) {
    const identifier = match[0];
    const displayIdentifier = await resolveDisplayIdentifier(identifier);
    // 替换所有出现的该标识符
    result = result.replace(new RegExp(escapeRegExp(identifier), 'g'), displayIdentifier);
  }
  
  return result;
};

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
