import { useState, useEffect, useCallback, useRef } from 'react';
import { variableService, VariableType } from '../services/variableService';
import IdentifierFormatterService from '../services/IdentifierFormatterService';
import VariableEventService from '../services/VariableEventService';
import VariableSchemaService from '../services/VariableSchemaService';

/**
 * 变量数据接口 - 简化版本，可在不同组件间共享
 */
export interface VariableCommonData {
  id: string;
  field: string;
  name?: string;
  sourceName: string;
  sourceType: string;
  value?: string;
  displayIdentifier?: string;
  identifier: string;
  updatedAt?: string;  // 变量更新时间
  // 为了向后兼容添加的可选字段
  source?: { id?: string, name?: string, type?: string };
  type?: string;
}

/**
 * 通用变量数据获取Hook - 改进版
 * 直接从API获取最新变量数据，无缓存，确保数据始终为最新
 * 支持实时更新，当变量发生变更时自动刷新
 */
export const useVariableData = (options?: {
  filterTypes?: VariableType[] | string[];  // 按类型过滤
  excludeSourceName?: string;               // 排除指定来源
  currentTaskName?: string;                 // 当前任务名称，用于排除当前任务变量
}) => {
  const [variables, setVariables] = useState<VariableCommonData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  
  // 防抖动控制 - 防止短时间内多次请求API
  const lastApiCallTime = useRef<number>(0);
  const minApiCallInterval = 1000; // 最小API调用间隔(毫秒)
  
  // API调用是否在进行中
  const isFetchingRef = useRef<boolean>(false);

  // 获取并处理变量数据的函数 - 每次都从API获取最新数据
  const fetchVariables = useCallback(async (showLoading = true, forceRefresh = false) => {
    // 防抖动：如果距离上次API调用时间不足最小间隔，则跳过本次调用
    // 除非设置了forceRefresh强制刷新
    const now = Date.now();
    if (!forceRefresh && now - lastApiCallTime.current < minApiCallInterval) {
      console.log('[useVariableData] 防抖动：跳过此次API调用');
      return;
    }
    
    // 如果已经有一个API调用在进行中，则跳过本次调用
    if (isFetchingRef.current) {
      console.log('[useVariableData] 已有API调用在进行中，跳过此次调用');
      return;
    }
    
    isFetchingRef.current = true;
    lastApiCallTime.current = now;
    setLastRefreshTime(now);
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      console.log('[useVariableData] 直接从API获取最新变量数据');
      // 使用变量服务API获取变量列表 - 无缓存直接获取
      const response = await variableService.getVariables();
      
      // 处理响应数据，确保有一个有效的数组
      let responseData: any[] = [];
      if (response) {
        if (Array.isArray(response)) {
          responseData = response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          const responseObj = response as any;
          if (Array.isArray(responseObj.data)) {
            responseData = responseObj.data;
          } else if (responseObj.data && typeof responseObj.data === 'object' && 'data' in responseObj.data) {
            const dataObj = responseObj.data as any;
            if (Array.isArray(dataObj.data)) {
              responseData = dataObj.data;
            }
          }
        }
      }
      
      if (responseData.length === 0) {
        console.warn('[useVariableData] API返回的变量数据为空');
      }
      
      // 转换为统一的变量数据格式 - 保留已修正的变量组装逻辑
      const processedVariables = responseData.map(convertToCommonFormat);
      
      // 快速去重 - 使用"id_field"组合作为唯一键
      const uniqueMap = new Map<string, VariableCommonData>();
      
      // 遍历所有变量，只保留每个"id_field"组合的最新版本
      processedVariables.forEach(variable => {
        // 使用标识符作为唯一键，更加可靠
        const uniqueKey = variable.identifier;
        const existingVar = uniqueMap.get(uniqueKey);
        
        // 如果此键尚不存在或当前变量更新时间更新，则替换
        if (!existingVar || 
           (variable.updatedAt && existingVar.updatedAt && 
            new Date(variable.updatedAt) > new Date(existingVar.updatedAt))) {
          uniqueMap.set(uniqueKey, variable);
        }
      });
      
      // 从Map中获取所有唯一变量
      let uniqueVariables = Array.from(uniqueMap.values());
      
      // 应用过滤条件
      if (options) {
        // 按类型过滤
        if (options.filterTypes && options.filterTypes.length > 0) {
          uniqueVariables = uniqueVariables.filter(v => 
            options.filterTypes?.includes(v.sourceType as any) || 
            options.filterTypes?.includes(v.type as any)
          );
        }
        
        // 排除指定来源
        if (options.excludeSourceName) {
          uniqueVariables = uniqueVariables.filter(v => 
            v.sourceName !== options.excludeSourceName
          );
        }
        
        // 排除当前任务
        if (options.currentTaskName) {
          uniqueVariables = uniqueVariables.filter(v => 
            v.sourceName !== options.currentTaskName
          );
        }
      }
      
      console.log(`[useVariableData] 获取到 ${uniqueVariables.length} 个变量 (已过滤和去重)`);
      
      // 完全替换现有变量集合，而不是累加
      setVariables(uniqueVariables);
      setError(null); // 清除之前的错误
    } catch (error) {
      console.error('[useVariableData] 获取变量失败:', error);
      setError(error as Error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [options]);
  
  // 组件挂载时获取初始数据
  useEffect(() => {
    console.log('[useVariableData] 组件挂载，初始化加载变量数据');
    // 在组件挂载时，强制刷新变量数据
    fetchVariables(true, true);
  }, [fetchVariables]);
  
  // 订阅变量变更事件 - 当收到通知时自动刷新
  useEffect(() => {
    console.log('[useVariableData] 订阅变量变更事件');
    
    const unsubscribe = VariableEventService.subscribe(() => {
      console.log('[useVariableData] 收到变量变更通知，强制刷新数据');
      // 收到变量变更通知时，强制刷新数据，避免累加
      fetchVariables(false, true); 
    });
    
    return () => {
      console.log('[useVariableData] 取消订阅变量变更事件');
      unsubscribe();
    };
  }, [fetchVariables]);

  // 根据标识符查找变量
  const getVariableByIdentifier = useCallback((identifier: string): VariableCommonData | null => {
    // 处理可能带@前缀的情况
    const normalizedIdentifier = identifier.startsWith('@') ? identifier.substring(1) : identifier;
    
    // 尝试直接匹配
    let variable = variables.find(v => 
      v.identifier === normalizedIdentifier || 
      v.identifier === identifier
    );
    
    if (variable) return variable;
    
    // 尝试解析标识符
    if (normalizedIdentifier.includes('_')) {
      // 解析gv_id_field格式
      const parts = normalizedIdentifier.split('_');
      if (parts.length >= 3 && parts[0] === 'gv') {
        const idPart = parts[1];
        const fieldPart = parts[2];
        
        variable = variables.find(v => 
          v.id === idPart && v.field === fieldPart
        );
        
        if (variable) return variable;
      }
    }
    
    return null;
  }, [variables]);

  // 手动刷新数据的方法 - 添加强制刷新参数
  const refreshVariables = useCallback(() => {
    console.log('[useVariableData] 手动刷新变量数据');
    // 强制刷新，确保获取最新数据并重置变量集合
    return fetchVariables(true, true);
  }, [fetchVariables]);

  return { 
    variables, 
    loading, 
    error,
    getVariableByIdentifier,
    refreshVariables
  };
};

/**
 * 将各种变量数据格式转换为统一的通用格式
 */
function convertToCommonFormat(apiVar: any): VariableCommonData {
  // 从API获取基础字段
  const rawId = apiVar.id || apiVar._id;
  
  // 检查是否存在字段和来源名称混淆问题
  let rawField, rawSourceName, rawName;
  
  // 获取原始类型
  const rawSourceType = apiVar.sourceType || apiVar.source?.type || apiVar.type || 'unknown';
  
  // 预处理原始字段名
  let originalField = apiVar.field;
  
  // 记录详细的原始数据，方便调试
  console.log(`[convertToCommonFormat] 原始变量数据:`, {
    id: apiVar.id || apiVar._id,
    field: originalField,
    type: rawSourceType,
    name: apiVar.name,
    sourceName: apiVar.sourceName || apiVar.source?.name
  });
  
  // 处理字段名是布尔值或其他非字符串类型的情况
  if (originalField === false || originalField === true) {
    console.warn(`[convertToCommonFormat] 字段名是布尔值: ${originalField}, ID: ${apiVar.id || apiVar._id}`);
    originalField = String(originalField); // 转为字符串，稍后会被默认字段名替换
  }

  // 检查NPC类型的行为原则问题 - 中文字段名会有各种变体
  if (
    (rawSourceType.includes('npc') || rawSourceType === 'NPC') && 
    (apiVar.name === '行为原则' || apiVar.name === '行动原则' || 
     (apiVar.name && (apiVar.name.includes('行为') || apiVar.name.includes('原则'))))
  ) {
    console.log(`[convertToCommonFormat] 检测到NPC行为原则: "${apiVar.name}", 确保使用正确字段"act"`);
    originalField = 'act'; // 强制使用"act"字段
  }
  
  // 对于自定义变量类型，field应该是"value"，而不是变量名称
  if ((apiVar.sourceType || apiVar.type || apiVar.source?.type) === 'custom' ||
      String(apiVar.sourceType || apiVar.type || '').toLowerCase().includes('自定义')) {
    // 字段应该是"值"的英文名称"value"
    rawField = 'value';
    // 来源名称应该是变量名
    rawSourceName = apiVar.name || '自定义变量';
    // 保留原始名称
    rawName = apiVar.name;
  } else {
    // 其他类型变量 - 根据类型为空或无效字段名提供默认值
    if (!originalField || originalField === 'false' || originalField === 'true' || typeof originalField !== 'string') {
      // 根据类型提供默认字段名
      if (rawSourceType.includes('workflow')) {
        rawField = 'name'; // 工作流默认字段名
        console.log(`[convertToCommonFormat] 工作流字段名无效: "${originalField}", 使用默认字段: "name"`);
      } else if (rawSourceType.includes('npc')) {
        rawField = 'name'; // NPC默认字段名
        console.log(`[convertToCommonFormat] NPC字段名无效: "${originalField}", 使用默认字段: "name"`);
      } else if (rawSourceType.includes('task')) {
        rawField = 'input'; // 任务默认字段名
        console.log(`[convertToCommonFormat] 任务字段名无效: "${originalField}", 使用默认字段: "input"`);
      } else {
        rawField = 'value'; // 其他类型默认字段
        console.log(`[convertToCommonFormat] 未知类型(${rawSourceType})字段名无效: "${originalField}", 使用默认字段: "value"`);
      }
    } else {
      // 字段名有效，直接使用
      rawField = originalField;
    }
    
    // 来源名称从API数据中获取
    rawSourceName = apiVar.sourceName || apiVar.source?.name || 'Unknown';
    // 保留原始名称
    rawName = apiVar.name;
  }

  // 获取变量值  
  const value = apiVar.value;
  
  // 规范化来源类型
  const normalizedSourceType = VariableSchemaService.normalizeSourceType(rawSourceType, rawField);
  
  // 检查自定义变量的时间戳ID，转换为UUID格式
  let cleanId;
  
  // 检查自定义变量的时间戳ID格式并转换
  if (normalizedSourceType === 'custom' && rawId && /^\d{10,13}$/.test(rawId.toString())) {
    console.log(`[useVariableData] 检测到自定义变量使用时间戳ID: ${rawId}`);
    
    // 使用variableService中的timestampToUUID函数进行转换
    try {
      // 导入转换函数
      const { timestampToUUID } = require('../services/variableService');
      // 将时间戳转换为UUID
      const uuid = timestampToUUID(rawId);
      
      // 记录ID转换
      console.log(`[useVariableData] 将时间戳ID转换为UUID: ${rawId} => ${uuid}`);
      
      // 使用生成的UUID替换原始ID
      cleanId = uuid;
    } catch (error) {
      console.error(`[useVariableData] 时间戳转UUID失败: ${error}`);
      // 如果转换失败，使用原始ID
      cleanId = cleanVariableId(rawId);
    }
  } else {
    // 不是时间戳ID，则使用原来的清理函数
    cleanId = cleanVariableId(rawId);
  }
  
  // 规范化字段名（将中文字段名转为英文）
  const normalizedField = VariableSchemaService.normalizeFieldName(rawField, normalizedSourceType);

  // 检查显示标识符与系统标识符是否一致
  // 提取显示标识符的字段部分，通常格式为 @sourceName.field#id
  const displayIdParts = (apiVar.displayIdentifier || '').match(/@([^.]+)\.([^#]+)#/);
  const displayIdField = displayIdParts ? displayIdParts[2] : null;

  // 检查系统标识符与显示标识符的一致性
  if (displayIdField && displayIdField !== normalizedField) {
    console.warn(`[convertToCommonFormat] 标识符不一致: 显示标识符字段="${displayIdField}", 系统标识符字段="${normalizedField}"`);
    
    // 尝试从显示标识符推断正确的字段
    const inferredField = VariableSchemaService.normalizeFieldName(displayIdField, normalizedSourceType);
    
    if (inferredField && inferredField !== normalizedField) {
      console.log(`[convertToCommonFormat] 从显示标识符推断字段: "${displayIdField}" => "${inferredField}"`);
      
      // 使用显示标识符中的字段名
      return {
        id: cleanId,
        field: inferredField,
        name: rawName,
        sourceName: rawSourceName,
        sourceType: normalizedSourceType,
        value,
        displayIdentifier: apiVar.displayIdentifier || `@${rawSourceName}.${inferredField}#${cleanId.substring(0, 4)}`,
        identifier: `@gv_${cleanId}_${inferredField}`,
        updatedAt: apiVar.updatedAt || new Date().toISOString(),
        source: {
          id: apiVar.source?.id || cleanId,
          name: rawSourceName,
          type: normalizedSourceType
        },
        type: normalizedSourceType
      };
    }
  }
  
  // 特定类型的字段检查和修复
  
  // 1. NPC特定字段检查
  if (normalizedSourceType === 'npc') {
    // 检查行为原则(act)
    if ((rawField === '行为原则' || rawField === '行动原则' || rawField.includes('原则')) && normalizedField !== 'act') {
      console.warn(`[convertToCommonFormat] NPC行为原则映射失败: "${rawField}" => "${normalizedField}", 应为"act"`);
      return createVariableWithField(cleanId, 'act', rawName, rawSourceName, normalizedSourceType, value, apiVar);
    }
    
    // 检查活跃度(actlv)
    if ((rawField === '活跃度' || rawField.includes('活跃') || rawField.includes('主动')) && normalizedField !== 'actlv') {
      console.warn(`[convertToCommonFormat] NPC活跃度映射失败: "${rawField}" => "${normalizedField}", 应为"actlv"`);
      return createVariableWithField(cleanId, 'actlv', rawName, rawSourceName, normalizedSourceType, value, apiVar);
    }
  }
  
  // 2. 工作任务(task)特定字段检查
  else if (normalizedSourceType === 'task') {
    // 检查输入(input)
    if ((rawField === '输入' || rawField.includes('输入')) && normalizedField !== 'input') {
      console.warn(`[convertToCommonFormat] 任务输入映射失败: "${rawField}" => "${normalizedField}", 应为"input"`);
      return createVariableWithField(cleanId, 'input', rawName, rawSourceName, normalizedSourceType, value, apiVar);
    }
    
    // 检查输出(output)
    if ((rawField === '输出' || rawField.includes('输出') || rawField.includes('结果')) && normalizedField !== 'output') {
      console.warn(`[convertToCommonFormat] 任务输出映射失败: "${rawField}" => "${normalizedField}", 应为"output"`);
      return createVariableWithField(cleanId, 'output', rawName, rawSourceName, normalizedSourceType, value, apiVar);
    }
  }
  
  // 3. 工作流(workflow)特定字段检查
  else if (normalizedSourceType === 'workflow') {
    // 数字字段默认为name
    if (/^\d+$/.test(rawField) && normalizedField !== 'name') {
      console.warn(`[convertToCommonFormat] 工作流数字字段映射: "${rawField}" => "${normalizedField}", 应为"name"`);
      return createVariableWithField(cleanId, 'name', rawName, rawSourceName, normalizedSourceType, value, apiVar);
    }
    
    // 如果字段为false，默认为name
    if (rawField === 'false' && normalizedField !== 'name') {
      console.warn(`[convertToCommonFormat] 工作流false字段映射: "${rawField}" => "${normalizedField}", 应为"name"`);
      return createVariableWithField(cleanId, 'name', rawName, rawSourceName, normalizedSourceType, value, apiVar);
    }
  }
  
  // 使用规范化后的字段生成系统标识符
  const identifier = `@gv_${cleanId}_${normalizedField}`;
  
  // 使用统一服务生成显示标识符，或使用已有的
  const displayIdentifier = apiVar.displayIdentifier || 
    IdentifierFormatterService.formatDisplayIdentifier(rawSourceName, normalizedField, cleanId);
  
  return createVariableWithField(cleanId, normalizedField, rawName, rawSourceName, normalizedSourceType, value, apiVar);
}

/**
 * 使用指定字段创建变量对象
 * 辅助函数，用于在需要强制修正字段时创建一致的变量对象
 */
function createVariableWithField(
  id: string, 
  field: string, 
  name: string, 
  sourceName: string, 
  sourceType: string, 
  value: any, 
  apiVar: any
): VariableCommonData {
  return {
    id,
    field,
    name,
    sourceName,
    sourceType,
    value,
    displayIdentifier: apiVar.displayIdentifier || 
      IdentifierFormatterService.formatDisplayIdentifier(sourceName, field, id),
    identifier: `@gv_${id}_${field}`,
    updatedAt: apiVar.updatedAt || new Date().toISOString(),
    source: {
      id: apiVar.source?.id || id,
      name: sourceName,
      type: sourceType
    },
    type: sourceType
  };
}

/**
 * 清理变量ID，移除可能的类型前缀和字段后缀
 * @param id 原始ID，可能含有前缀或后缀
 * @returns 清理后的纯UUID
 */
function cleanVariableId(id: string): string {
  if (!id) return '';
  
  // 移除类型前缀 (如 npc_, task_, workflow_)
  let cleanedId = id;
  const typePrefixes = ['npc_', 'task_', 'workflow_', 'custom_', 'file_', 'system_'];
  typePrefixes.forEach(prefix => {
    if (cleanedId.startsWith(prefix)) {
      cleanedId = cleanedId.substring(prefix.length);
    }
  });
  
  // 如果ID包含下划线且后面跟着字段名，则也需要移除
  const lastUnderscoreIndex = cleanedId.lastIndexOf('_');
  if (lastUnderscoreIndex > 0 && lastUnderscoreIndex < cleanedId.length - 1) {
    const potentialFieldName = cleanedId.substring(lastUnderscoreIndex + 1);
    // 检查是否是常见字段名（如果是则移除）
    const commonFields = ['name', 'input', 'output', 'status', 'description', 'knowledge', 'act', 'actlv', 'value'];
    if (commonFields.includes(potentialFieldName) || 
        commonFields.some(field => potentialFieldName.endsWith(`_${field}`)) ||
        potentialFieldName.startsWith('node_')) {
      cleanedId = cleanedId.substring(0, lastUnderscoreIndex);
    }
  }
  
  return cleanedId;
}

export default useVariableData;
