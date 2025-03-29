import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Form, message } from 'antd';
import workTaskService, { WorkTask } from '../../../services/workTaskService';
import { aiServiceService } from '../../../services/aiServiceService';
import { npcService, Npc } from '../../../services/npcService';
import { variableService, Variable } from '../../../services/variableService';
import { useVariableCollection } from './useVariableCollection';
import createLogger from '../../../utils/logger';

const logger = createLogger('useWorkTaskEffect');

// 定义VariableView接口 - 用于前端显示和处理的变量数据结构
interface VariableView {
  id: string;
  name: string;
  identifier: string;
  displayIdentifier: string;
  type: string;
  sourceId: string;
  sourceName: string;
  value: string;
}

interface UseWorkTaskEffectProps {
  form: ReturnType<typeof Form.useForm>[0];
  initialTaskId?: string;
  isEdit?: boolean;
  variableCollectionProps: {
    setVariables: (variables: VariableView[]) => void;
    collectUsedVariables: () => void;
    handleEditorContentChange: () => void;
  };
}

/**
 * 用于管理工作任务生命周期和副作用的自定义Hook
 */
export const useWorkTaskEffect = ({
  form,
  initialTaskId,
  isEdit,
  variableCollectionProps
}: UseWorkTaskEffectProps) => {
  // 数据加载状态
  const [loadingNpcs, setLoadingNpcs] = useState<boolean>(false);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [loadingVariables, setLoadingVariables] = useState<boolean>(false);
  
  // 主要数据
  const [npcs, setNpcs] = useState<Npc[]>([]);
  
  // 变量相关方法从props中解构
  const { 
    setVariables, 
    collectUsedVariables, 
    handleEditorContentChange 
  } = variableCollectionProps;
  
  // 用于确保初始化只执行一次
  const initialized = useRef<boolean>(false);
  
  // 轮询变量的间隔ID
  const variablePollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 加载NPCs
  const loadNpcs = useCallback(async () => {
    try {
      setLoadingNpcs(true);
      const response = await npcService.getNpcs();
      if (response && response.data) {
        setNpcs(response.data);
      }
    } catch (error) {
      logger.error('加载NPCs失败:', error);
      message.error('无法加载NPCs列表');
    } finally {
      setLoadingNpcs(false);
    }
  }, []);
  
  // 加载AI服务
  const loadAiServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const response = await aiServiceService.getServices();
      if (response && response.data && response.data.length > 0) {
        // 如果未在表单中选择AI服务，默认选择第一个
        const currentAiServiceId = form.getFieldValue('aiServiceId');
        if (!currentAiServiceId) {
          form.setFieldsValue({
            aiServiceId: response.data[0].id,
            aiServiceName: response.data[0].name
          });
        }
      }
    } catch (error) {
      logger.error('加载AI服务失败:', error);
      message.error('无法加载AI服务列表');
    } finally {
      setLoadingServices(false);
    }
  }, [form]);
  
  // 加载变量
  const loadVariables = useCallback(async () => {
    try {
      setLoadingVariables(true);
      const response = await variableService.getVariables();
      if (response && response.data) {
        // 将原始变量数据转换为VariableView格式
        const variables = response.data;
        // 确保变量数据是数组
        const variablesArray = Array.isArray(variables) ? variables : [];
        
        const variableViews: VariableView[] = variablesArray.map((variable: Variable) => ({
          id: variable.id,
          name: variable.name,
          identifier: variable.identifier,
          displayIdentifier: variable.displayIdentifier || variable.identifier,
          type: variable.type,
          sourceId: variable.source?.id || '',
          sourceName: variable.source?.name || '',
          value: variable.value || ''
        }));
        
        setVariables(variableViews);
        logger.debug('成功加载变量:', { count: variableViews.length });
      }
    } catch (error) {
      logger.error('加载变量失败:', error);
      message.error('无法加载变量列表');
    } finally {
      setLoadingVariables(false);
    }
  }, [setVariables]);
  
  // 开始变量轮询
  const startVariablePolling = useCallback(() => {
    // 清除任何现有轮询
    if (variablePollingIntervalRef.current) {
      clearInterval(variablePollingIntervalRef.current);
    }
    
    // 设置轮询间隔（每30秒更新一次）
    variablePollingIntervalRef.current = setInterval(() => {
      loadVariables();
    }, 30000);
  }, [loadVariables]);
  
  // 停止变量轮询
  const stopVariablePolling = useCallback(() => {
    if (variablePollingIntervalRef.current) {
      clearInterval(variablePollingIntervalRef.current);
      variablePollingIntervalRef.current = null;
    }
  }, []);
  
  // 处理NPC选择器值变更
  const handleNpcSelectorChange = useCallback((value: string, option: any) => {
    if (option) {
      form.setFieldsValue({
        npcId: value,
        npcName: option.label || option.name || ''
      });
    } else {
      form.setFieldsValue({
        npcId: '',
        npcName: ''
      });
    }
  }, [form]);
  
  // 处理AI服务选择器变更
  const handleAiServiceChange = useCallback((value: string, option: any) => {
    if (option) {
      form.setFieldsValue({
        aiServiceId: value,
        aiServiceName: option.label || option.name || ''
      });
    } else {
      form.setFieldsValue({
        aiServiceId: '',
        aiServiceName: ''
      });
    }
  }, [form]);
  
  // 监听表单值变更
  const formValueChangeHandler = useCallback(() => {
    // 编辑器内容更改时触发变量收集
    handleEditorContentChange();
  }, [handleEditorContentChange]);
  
  // 初始化加载
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      
      // 加载基本数据
      loadNpcs();
      loadAiServices();
      loadVariables();
      
      // 初始化变量轮询
      startVariablePolling();
      
      // 首次初始化时收集已使用变量
      collectUsedVariables();
    }
    
    // 清理函数
    return () => {
      stopVariablePolling();
    };
  }, [
    loadNpcs, 
    loadAiServices, 
    loadVariables, 
    startVariablePolling,
    stopVariablePolling,
    collectUsedVariables
  ]);
  
  // 将所有loading状态合并为一个值
  const loading = useMemo(() => {
    return loadingNpcs || loadingServices || loadingVariables;
  }, [loadingNpcs, loadingServices, loadingVariables]);
  
  return {
    loading,
    npcs,
    handleNpcSelectorChange,
    handleAiServiceChange,
    formValueChangeHandler,
    loadNpcs,
    loadAiServices,
    loadVariables
  };
};

// 导出VariableView类型供其他组件使用
export type { VariableView };
