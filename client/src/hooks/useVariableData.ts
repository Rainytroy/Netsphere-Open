import { useState, useEffect, useCallback, useRef } from 'react';
import { variableService, Variable, VariableType } from '../services/variableService';
import VariableEventService from '../services/VariableEventService';

/**
 * 通用变量数据获取Hook - 简化版
 * 直接从API获取最新变量数据并映射到表格所需的格式
 * 支持实时更新，当变量发生变更时自动刷新
 */
export const useVariableData = (options?: {
  filterTypes?: VariableType[] | string[];  // 按类型过滤
  excludeSourceName?: string;               // 排除指定来源
  currentTaskName?: string;                 // 当前任务名称，用于排除当前任务变量
}) => {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  
  // 防抖动控制 - 防止短时间内多次请求API
  const lastApiCallTime = useRef<number>(0);
  const minApiCallInterval = 1000; // 最小API调用间隔(毫秒)
  
  // API调用是否在进行中
  const isFetchingRef = useRef<boolean>(false);

  // 将API返回的Variable转换为编辑器使用的VariableData格式
  const adaptVariableToEditorFormat = (apiVar: Variable): any => {
    // console.log('[useVariableData] 变量适配：', apiVar);
    
    // 处理类型，确保与v3.0标识符格式一致
    const varType = apiVar.type?.toString().toLowerCase() || 'custom';
    
    // 返回支持编辑器VariableData接口的对象
    return {
      ...apiVar,
      // 确保这些必要的属性存在
      id: apiVar.entityId || apiVar.id || '',
      field: apiVar.fieldname || extractFieldName(apiVar.id) || '',
      sourceName: apiVar.source?.name || apiVar.name || 'Unknown',
      sourceType: varType,
      value: apiVar.value || '',
      displayIdentifier: apiVar.displayIdentifier || '', 
      // 兼容v3.0格式，为type属性提供值
      get type() {
        return varType;
      },
      // 生成v3.0格式标识符
      get identifier() {
        return `@gv_${varType}_${this.id}_${this.field}-=`;
      }
    };
  };

  // 获取并处理变量数据的函数
  const fetchVariables = useCallback(async (showLoading = true, forceRefresh = false) => {
    // 防抖动：如果距离上次API调用时间不足最小间隔，则跳过本次调用
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
      // 使用变量服务API获取变量列表
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
      
      console.log('[useVariableData] 原始API数据:', responseData);

      // 直接将API数据映射到Variable类型，简化处理逻辑
      const processedVariables = responseData.map(apiVar => {
        const processedVar: Variable = {
          // 使用原始ID
          id: apiVar.id || '',
          
          // 使用原始名称作为来源
          name: apiVar.name || '',
          
          // 从ID中提取字段名部分
          fieldname: extractFieldName(apiVar.id) || '',
          
          // 使用原始类型
          type: (apiVar.type as VariableType) || VariableType.CUSTOM,
          
          // 保留源对象信息
          source: apiVar.source || { id: '', name: '', type: '' },
          
          // 直接使用API提供的标识符
          identifier: apiVar.identifier || '',
          
          // 直接使用API提供的显示标识符
          displayIdentifier: apiVar.displayIdentifier || '',
          
          // 保留原始值
          value: apiVar.value || '',
          
          // 时间戳
          createdAt: apiVar.createdAt ? new Date(apiVar.createdAt) : new Date(),
          updatedAt: apiVar.updatedAt ? new Date(apiVar.updatedAt) : new Date(),
          
          // 可选字段
          entityId: apiVar.entityId || extractEntityId(apiVar.id),
          isValid: apiVar.isValid || true
        };
        
        return processedVar;
      });
      
      // 去重 - 使用identifier作为唯一键
      const uniqueMap = new Map<string, Variable>();
      
      processedVariables.forEach(variable => {
        if (variable.identifier) {
          uniqueMap.set(variable.identifier, variable);
        }
      });
      
      // 从Map中获取所有唯一变量
      let uniqueVariables = Array.from(uniqueMap.values());
      
      // 应用过滤条件
      if (options) {
        // 按类型过滤
        if (options.filterTypes && options.filterTypes.length > 0) {
          uniqueVariables = uniqueVariables.filter(v => 
            options.filterTypes?.includes(v.type as any)
          );
        }
        
        // 排除指定来源
        if (options.excludeSourceName) {
          uniqueVariables = uniqueVariables.filter(v => 
            v.name !== options.excludeSourceName
          );
        }
        
        // 排除当前任务
        if (options.currentTaskName) {
          uniqueVariables = uniqueVariables.filter(v => 
            v.name !== options.currentTaskName
          );
        }
      }
      
      console.log(`[useVariableData] 获取到 ${uniqueVariables.length} 个变量 (已过滤和去重)`, uniqueVariables);
      
      // 将API格式变量转换为编辑器格式
      const adaptedVariables = uniqueVariables.map(adaptVariableToEditorFormat);
      console.log(`[useVariableData] 转换后的变量数量: ${adaptedVariables.length}`);
      
      // 设置适配后的变量
      setVariables(adaptedVariables);
      setError(null);
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
    fetchVariables(true, true);
  }, [fetchVariables]);
  
  // 订阅变量变更事件
  useEffect(() => {
    console.log('[useVariableData] 订阅变量变更事件');
    
    const unsubscribe = VariableEventService.subscribe(() => {
      console.log('[useVariableData] 收到变量变更通知，强制刷新数据');
      fetchVariables(false, true); 
    });
    
    return () => {
      console.log('[useVariableData] 取消订阅变量变更事件');
      unsubscribe();
    };
  }, [fetchVariables]);

  // 根据标识符查找变量
  const getVariableByIdentifier = useCallback((identifier: string): Variable | null => {
    // 处理可能带@前缀的情况
    const normalizedIdentifier = identifier.startsWith('@') ? identifier.substring(1) : identifier;
    
    // 尝试直接匹配
    let variable = variables.find(v => 
      v.identifier === normalizedIdentifier || 
      v.identifier === identifier
    );
    
    if (variable) return variable;
    
    return null;
  }, [variables]);

  // 手动刷新数据的方法
  const refreshVariables = useCallback(() => {
    console.log('[useVariableData] 手动刷新变量数据');
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
 * 从变量ID中提取字段名部分
 * 例如：从 "custom_95e20eef-eda9-47a5-9dfb-febc69b13637_value" 提取 "value"
 */
function extractFieldName(id: string): string | null {
  if (!id) return null;
  
  const parts = id.split('_');
  
  // 如果ID包含至少两个下划线分隔的部分，最后一部分可能是字段名
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  
  return null;
}

/**
 * 从变量ID中提取实体ID部分
 * 例如：从 "custom_95e20eef-eda9-47a5-9dfb-febc69b13637_value" 提取 "95e20eef-eda9-47a5-9dfb-febc69b13637"
 */
function extractEntityId(id: string): string | null {
  if (!id) return null;
  
  const parts = id.split('_');
  
  // 如果ID包含至少三个部分，中间部分可能是实体ID
  if (parts.length >= 3) {
    return parts[1];
  } else if (parts.length === 2) {
    // 处理可能只有类型前缀和ID的情况，无字段名后缀
    return parts[1];
  }
  
  return null;
}

export default useVariableData;
