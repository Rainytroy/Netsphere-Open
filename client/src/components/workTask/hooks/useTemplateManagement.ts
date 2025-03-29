import { useCallback, useState, useRef } from 'react';
import { Form, message } from 'antd';
import { Variable, VariableType } from '../../../services/variableService';
import { useWorkTaskEffect, VariableView } from './useWorkTaskEffect';
import createLogger from '../../../utils/logger';

const logger = createLogger('useTemplateManagement');

interface UseTemplateManagementProps {
  form: ReturnType<typeof Form.useForm>[0];
  initialTaskId?: string;
  isEdit?: boolean;
  npcs?: any[]; // 添加NPC列表参数
}

/**
 * 用于管理NPC模板的自定义Hook
 */
// 定义NPC接口
interface NpcInfo {
  id: string;
  name: string;
  [key: string]: any;
}

export const useTemplateManagement = ({
  form,
  initialTaskId,
  isEdit,
  npcs = [] // 提供默认值
}: UseTemplateManagementProps) => {
  // 状态
  const [customizing, setCustomizing] = useState<boolean>(false);
  const [customizationConfirmed, setCustomizationConfirmed] = useState<boolean>(false);
  const [initialTemplate, setInitialTemplate] = useState<string>('');
  
  // 初始化变量相关状态
  const [variables, setVariables] = useState<VariableView[]>([]);
  const [usedVariables, setUsedVariables] = useState<VariableView[]>([]);
  
  // 收集编辑器中使用的变量
  const collectUsedVariables = useCallback(() => {
    // 简化实现，实际实现应根据编辑器内容提取变量
    // 这里仅示例性地返回一个空数组
    setUsedVariables([]);
  }, []);
  
  // 处理编辑器内容变更
  const handleEditorContentChange = useCallback(() => {
    // 简化实现，实际应调用防抖版本的collectUsedVariables
    collectUsedVariables();
  }, [collectUsedVariables]);
  
  // 创建variableCollectionProps对象，满足useWorkTaskEffect期望的接口
  const variableCollectionProps = {
    setVariables: (vars: VariableView[]) => setVariables(vars),
    collectUsedVariables,
    handleEditorContentChange
  };
  
  // 初始化工作任务副作用
  const workTaskEffect = useWorkTaskEffect({
    form,
    initialTaskId,
    isEdit,
    variableCollectionProps
  });
  
  // 检查当前模板是否已被自定义
  const isTemplateCustomized = useCallback(() => {
    return form.getFieldValue(['npcPromptTemplate', 'isCustomized']) || false;
  }, [form]);
  
  // 检查当前模板是否为空
  const isTemplateEmpty = useCallback(() => {
    const template = form.getFieldValue(['npcPromptTemplate', 'template']);
    return !template || template.trim() === '';
  }, [form]);
  
  // 加载默认模板内容
  const loadDefaultTemplate = useCallback(async (npcId: string) => {
    try {
      if (!npcId) {
        logger.warn('无法加载默认模板：未指定NPC ID');
        return;
      }
      
      // 导入模板工具函数，获取标准模板格式
      const { generateDefaultTemplate } = await import('../../../utils/templateUtils');
      const selectedNpc = npcs.find(npc => npc.id === npcId);
      const npcName = selectedNpc?.name || form.getFieldValue('npcName') || 'NPC';
      
      // 使用标准模板生成函数
      const defaultTemplate = await generateDefaultTemplate(npcName, npcId);
      
      // 将默认模板应用到表单
      form.setFieldsValue({
        npcPromptTemplate: {
          template: defaultTemplate,
          isCustomized: false
        }
      });
      
      // 保存初始模板内容以供重置使用
      setInitialTemplate(defaultTemplate);
      
      // 收集已使用的变量
      collectUsedVariables();
      
      return defaultTemplate;
    } catch (error) {
      logger.error('加载默认模板失败:', error);
      message.error('无法加载默认模板');
      return '';
    }
  }, [form, collectUsedVariables]);
  
  // 开始自定义模板
  const startCustomizing = useCallback(() => {
    // 如果还没自定义且没有确认过自定义，则记录当前模板以便可以恢复
    if (!isTemplateCustomized() && !customizationConfirmed) {
      const currentTemplate = form.getFieldValue(['npcPromptTemplate', 'template']);
      setInitialTemplate(currentTemplate || '');
    }
    
    setCustomizing(true);
  }, [form, isTemplateCustomized, customizationConfirmed]);
  
  // 确认自定义模板
  const confirmCustomizing = useCallback(() => {
    form.setFieldsValue({
      npcPromptTemplate: {
        ...form.getFieldValue('npcPromptTemplate'),
        isCustomized: true
      }
    });
    
    setCustomizing(false);
    setCustomizationConfirmed(true);
    message.success('提示词模板已自定义');
    
    // 收集已使用的变量
    collectUsedVariables();
  }, [form, collectUsedVariables]);
  
  // 取消自定义模板
  const cancelCustomizing = useCallback(() => {
    // 如果已经确认过自定义，只是暂时取消编辑状态
    if (customizationConfirmed) {
      setCustomizing(false);
      return;
    }
    
    // 否则恢复到初始模板
    form.setFieldsValue({
      npcPromptTemplate: {
        template: initialTemplate,
        isCustomized: false
      }
    });
    
    setCustomizing(false);
    
    // 收集已使用的变量
    collectUsedVariables();
  }, [form, initialTemplate, customizationConfirmed, collectUsedVariables]);
  
  // 重置模板到初始状态
  const resetTemplate = useCallback(async () => {
    const npcId = form.getFieldValue('npcId');
    
    if (npcId) {
      await loadDefaultTemplate(npcId);
      
      form.setFieldsValue({
        npcPromptTemplate: {
          ...form.getFieldValue('npcPromptTemplate'),
          isCustomized: false
        }
      });
      
      setCustomizing(false);
      setCustomizationConfirmed(false);
      
      message.success('提示词模板已重置为默认');
    } else {
      message.warning('请先选择NPC');
    }
  }, [form, loadDefaultTemplate]);
  
  // 当NPC变更时，重新加载默认模板（如果当前模板未被自定义）
  const handleNpcChange = useCallback(async (npcId: string) => {
    // 如果模板未被自定义，则加载新NPC的默认模板
    if (!isTemplateCustomized()) {
      await loadDefaultTemplate(npcId);
    }
  }, [isTemplateCustomized, loadDefaultTemplate]);
  
  // 判断每个变量是否正在使用中
  const isVariableInUse = useCallback((variable: VariableView) => {
    return usedVariables.some(v => 
      v.id === variable.id && 
      v.name === variable.name
    );
  }, [usedVariables]);
  
  return {
    ...workTaskEffect,
    customizing,
    customizationConfirmed,
    isTemplateCustomized,
    isTemplateEmpty,
    startCustomizing,
    confirmCustomizing,
    cancelCustomizing,
    resetTemplate,
    handleNpcChange,
    isVariableInUse,
    usedVariables
  };
};
