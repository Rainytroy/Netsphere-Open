import { useState, useEffect, useCallback } from 'react';
import { variableService } from '../../../../services/variableService';
import VariableEventService from '../../../../services/VariableEventService';
import VariableAdapter from '../../utils/VariableAdapter';
import { parseFullId } from '../../utils/VariableUtils';

/**
 * 变量操作结果接口
 */
export interface VariableOperationResult {
  success: boolean;
  value?: string;
  error?: string;
}

/**
 * 执行环境变量Hook
 * 用于在工作流执行过程中读取和写入变量
 */
export const useExecutionVariable = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [variableCache, setVariableCache] = useState<Record<string, { value: string, timestamp: number }>>({});

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 变量变更事件订阅
  useEffect(() => {
    const unsubscribe = VariableEventService.subscribe(() => {
      // 变量发生变化时，清空缓存以确保下次获取最新值
      setVariableCache({});
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * 通过完整ID获取变量值
   * @param fullId 变量完整ID (如 "workflow_123_name")
   * @param forceRefresh 是否强制刷新（不使用缓存）
   */
  const getVariableValue = useCallback(async (
    fullId: string,
    forceRefresh = false
  ): Promise<VariableOperationResult> => {
    if (!fullId) {
      return { success: false, error: '变量ID不能为空' };
    }

    try {
      // 检查缓存
      const now = Date.now();
      const cacheEntry = variableCache[fullId];
      const cacheTimeout = 5000; // 缓存有效期（毫秒）
      
      if (!forceRefresh && cacheEntry && (now - cacheEntry.timestamp < cacheTimeout)) {
        console.log(`[useExecutionVariable] 使用缓存值: ${fullId}`, cacheEntry.value);
        return { success: true, value: cacheEntry.value };
      }

      setLoading(true);
      setError(null);

      console.log(`[useExecutionVariable] 获取变量值: ${fullId}`);

      // 使用VariableAdapter获取变量值，支持所有变量类型
      const result = await VariableAdapter.getVariableValueById(fullId);
      
      if (result.success && result.value !== undefined) {
        // 更新缓存
        setVariableCache(prev => ({
          ...prev,
          [fullId]: { value: result.value!, timestamp: now }
        }));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[useExecutionVariable] 获取变量失败: ${fullId}`, errorMessage);
      setError(`获取变量失败: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [variableCache]);

  /**
   * 通过系统标识符获取变量值
   * @param systemId 系统标识符 (如 "@gv_workflow_123_name-=")
   */
  const getVariableValueBySystemId = useCallback(async (
    systemId: string
  ): Promise<VariableOperationResult> => {
    if (!systemId) {
      return { success: false, error: '系统标识符不能为空' };
    }
    
    try {
      setLoading(true);
      setError(null);

      console.log(`[useExecutionVariable] 通过系统标识符获取变量值: ${systemId}`);
      
      // 使用VariableAdapter获取变量值
      const result = await VariableAdapter.getVariableValueBySystemId(systemId);
      
      if (result.success && result.value !== undefined) {
        // 获取完整ID用于缓存
        const fullId = extractFullIdFromSystemId(systemId);
        if (fullId) {
          // 更新缓存
          setVariableCache(prev => ({
            ...prev,
            [fullId]: { value: result.value!, timestamp: Date.now() }
          }));
        }
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[useExecutionVariable] 通过系统标识符获取变量失败: ${systemId}`, errorMessage);
      setError(`获取变量失败: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [variableCache]);

  /**
   * 更新变量值
   * @param fullId 变量完整ID
   * @param value 新的变量值
   */
  const updateVariableValue = useCallback(async (
    fullId: string,
    value: string
  ): Promise<VariableOperationResult> => {
    if (!fullId) {
      return { success: false, error: '变量ID不能为空' };
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[useExecutionVariable] 更新变量值: ${fullId}`, value);
      
      // 使用VariableAdapter更新变量值，支持所有变量类型
      const result = await VariableAdapter.updateVariableValue(fullId, value);
      
      // 更新缓存
      setVariableCache(prev => ({
        ...prev,
        [fullId]: { value, timestamp: Date.now() }
      }));
      
      // 触发变量变更事件
      VariableEventService.notifyVariableChange();
      
      return { success: true, value };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[useExecutionVariable] 更新变量失败: ${fullId}`, errorMessage);
      setError(`更新变量失败: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 从系统标识符中提取完整ID
   * 例如：从 "@gv_workflow_123_name-=" 提取 "workflow_123_name"
   */
  const extractFullIdFromSystemId = (systemId: string): string | null => {
    if (!systemId) return null;
    
    // 格式: @gv_type_id_field-=
    const match = systemId.match(/@gv_([a-z]+)_([a-z0-9-]+)_([a-z]+)-=/i);
    if (!match) return null;
    
    const type = match[1];
    const id = match[2];
    const field = match[3];
    
    return `${type}_${id}_${field}`;
  };

  return {
    loading,
    error,
    clearError,
    getVariableValue,
    getVariableValueBySystemId,
    updateVariableValue
  };
};

export default useExecutionVariable;
