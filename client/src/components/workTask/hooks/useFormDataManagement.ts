import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import workTaskService, { WorkTask } from '../../../services/workTaskService';
import { useTestExecution } from './useTestExecution';
import { VariableView } from './useWorkTaskEffect';
import createLogger from '../../../utils/logger';

const logger = createLogger('useFormDataManagement');

interface UseFormDataManagementProps {
  form: ReturnType<typeof Form.useForm>[0];
  initialTaskId?: string;
  isEdit?: boolean;
  onSaveSuccess?: (task: WorkTask) => void;
}

/**
 * 用于管理工作任务表单数据的自定义Hook
 */
export const useFormDataManagement = ({
  form,
  initialTaskId,
  isEdit = false,
  onSaveSuccess
}: UseFormDataManagementProps) => {
  const navigate = useNavigate();
  
  // 保存状态
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(initialTaskId ? true : false);
  
  // 初始化测试执行hook
  const { testExecute, testResult, testError, executing, clearTestResult } = useTestExecution({
    initialTaskId,
    getFormValues: () => form.getFieldsValue(true)
  });
  
  // 获取表单所有值，包括富文本内容
  const getFormValues = useCallback(() => {
    // 获取表单基本值
    const formValues = form.getFieldsValue(true);
    
    // 这里可以添加其他需要的处理，例如富文本内容处理等
    
    return formValues;
  }, [form]);
  
  // 初始化表单数据
  const initializeFormData = useCallback(async () => {
    if (!initialTaskId || !isEdit) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await workTaskService.getWorkTaskById(initialTaskId);
      if (response) {
        // 填充表单数据
        form.setFieldsValue({
          name: response.name,
          input: response.input,
          npcId: response.npcId,
          npcName: response.npcName,
          aiServiceId: response.aiServiceId,
          aiServiceName: response.aiServiceName,
          npcPromptTemplate: response.npcPromptTemplate,
          // 处理富文本内容
          ...(response.richInput ? { richInput: response.richInput } : {})
        });
        
        logger.debug('初始化表单数据成功:', response);
      }
    } catch (error) {
      logger.error('初始化表单数据失败:', error);
      message.error('加载任务数据失败');
    } finally {
      setLoading(false);
    }
  }, [initialTaskId, isEdit, form]);
  
  // 提交表单
  const handleSubmit = useCallback(async () => {
    try {
      // 表单验证
      await form.validateFields();
      
      // 获取表单值
      const values = getFormValues();
      
      // 开始保存
      setSaving(true);
      
      let response;
      if (isEdit && initialTaskId) {
        // 更新现有任务
        response = await workTaskService.updateWorkTask(initialTaskId, values);
        message.success('任务更新成功');
      } else {
        // 创建新任务
        response = await workTaskService.createWorkTask(values);
        message.success('任务创建成功');
      }
      
      // 调用保存成功回调
      if (onSaveSuccess && response) {
        onSaveSuccess(response);
      }
      
      // 导航到列表页
      navigate('/task');
      
      return response;
    } catch (error) {
      logger.error('提交表单失败:', error);
      
      if (error instanceof Error) {
        message.error(`保存失败: ${error.message}`);
      } else {
        message.error('保存失败，请检查表单');
      }
      
      return null;
    } finally {
      setSaving(false);
    }
  }, [form, getFormValues, isEdit, initialTaskId, navigate, onSaveSuccess]);
  
  // 取消编辑
  const handleCancel = useCallback(() => {
    navigate('/task');
  }, [navigate]);
  
  // 运行测试
  const handleTest = useCallback(async () => {
    // 先清除之前的测试结果
    clearTestResult();
    
    try {
      // 表单验证
      await form.validateFields(['input', 'npcId', 'aiServiceId']);
      
      // 执行测试
      await testExecute({ debug: true });
    } catch (error) {
      logger.error('测试执行失败:', error);
      message.error('表单验证失败，请检查必填字段');
    }
  }, [form, testExecute, clearTestResult]);
  
  // 检查变量是否在表单中使用
  const isVariableInForm = useCallback((variable: VariableView): boolean => {
    const formValues = form.getFieldsValue(true);
    
    // 检查input字段
    if (formValues.input && formValues.input.includes(variable.identifier)) {
      return true;
    }
    
    // 检查npcPromptTemplate字段
    if (formValues.npcPromptTemplate?.template && 
        formValues.npcPromptTemplate.template.includes(variable.identifier)) {
      return true;
    }
    
    return false;
  }, [form]);
  
  return {
    saving,
    loading,
    testResult,
    testError,
    executing,
    initializeFormData,
    handleSubmit,
    handleCancel,
    handleTest,
    getFormValues,
    isVariableInForm
  };
};
