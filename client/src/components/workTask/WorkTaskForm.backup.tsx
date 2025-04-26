import * as React from 'react';
import { useRef } from 'react';

// 工具函数: 将显示标识符转换为系统标识符
const convertToSystemIdentifiers = (template: string, npcs: any[]): string => {
  if (!template) return '';
  
  // 如果已经是系统标识符格式，不做处理
  if (template.includes('@gv_') && !template.includes('#')) {
    return template;
  }
  
  // 构建NPC名称到ID的映射
  const npcMap = new Map();
  npcs.forEach(npc => {
    if (npc && npc.name && npc.id) {
      npcMap.set(npc.name, npc.id);
    }
  });
  
  // 替换显示标识符为系统标识符
  return template.replace(/@([^.]+)\.([^#\s]+)(?:#[a-f0-9]+)?/g, 
    (match, npcName, field) => {
      const npcId = npcMap.get(npcName);
      if (npcId) {
        return `@gv_${npcId}_${field}`;
      }
      // 如果找不到对应的NPC ID，保持原样
      return match;
    }
  );
};
import { Form, Input, Select, Button, Spin, Card, Typography, Divider, Row, Col, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { npcService } from '../../services/npcService';
import { Npc } from '../../services/npcService';
import workTaskService, { WorkTask, WorkTaskStatus, ExecutionStatus, TestExecuteDebugInfo, NpcPromptTemplate } from '../../services/workTaskService';
import { aiServiceService } from '../../services/aiServiceService';
import { variableService } from '../../services/variableService';
import outputPersistenceService from '../../services/outputPersistenceService';
import VariableList, { VariableView } from './VariableList';
import VariableEditorXWrapper, { VariableEditorXRef, VariableData } from '../../components/VariableEditorXWrapper';
import { ThunderboltOutlined, LoadingOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
// 导入拆分后的组件
import NpcSelector from './NpcSelector';
import PromptTemplateManager from './PromptTemplateManager';
import DebugInfoPanel from './DebugInfoPanel';
import OutputDisplayPanel from './OutputDisplayPanel';
import ExecutionStatusPanel from './ExecutionStatusPanel';
// 导入新的VexPromptEditor
import VexPromptEditor, { VexPromptEditorRef } from './VexPromptEditor';
// 导入表单子组件
import TaskInputSection from './form-components/TaskInputSection';
import TaskProcessSection from './form-components/TaskProcessSection';
import TaskOutputSection from './form-components/TaskOutputSection';
import FormActionButtons from './form-components/FormActionButtons';

const { Text, Title, Paragraph } = Typography;

interface WorkTaskFormProps {
  initialValues?: Partial<WorkTask>;
  isEdit?: boolean;
}

/**
 * 工作任务表单组件
 * 用于创建和编辑工作任务
 */
const WorkTaskForm: React.FC<WorkTaskFormProps> = ({ initialValues, isEdit = false }) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [testExecuting, setTestExecuting] = React.useState<boolean>(false);
  const [npcs, setNpcs] = React.useState<Npc[]>([]);
  const [aiServices, setAiServices] = React.useState<any[]>([]);
  const [customPrompt, setCustomPrompt] = React.useState<boolean>(initialValues?.npcPromptTemplate?.isCustomized || false);
  const [testOutput, setTestOutput] = React.useState<string>('');
  const [executionTime, setExecutionTime] = React.useState<string>(initialValues?.lastRunAt || '');
  const [selectedNpcId, setSelectedNpcId] = React.useState<string>(initialValues?.npcId || '');
  // 保存每个NPC的提示词模板
  const [npcTemplates, setNpcTemplates] = React.useState<Record<string, NpcPromptTemplate>>({});
  const [executionStatus, setExecutionStatus] = React.useState<ExecutionStatus>(
    initialValues?.executionStatus 
      ? initialValues.executionStatus as unknown as ExecutionStatus 
      : ExecutionStatus.IDLE
  );
  
  // 折叠面板状态管理
  const [activeCollapseKeys, setActiveCollapseKeys] = React.useState<string[]>(
    selectedNpcId ? ['promptControl'] : []
  );
  
  // 变量状态与编辑器引用 - 更新引用类型
  const [variables, setVariables] = React.useState<VariableView[]>([]);
  const promptEditorRef = useRef<VexPromptEditorRef>(null);
  const inputEditorRef = useRef<VariableEditorXRef>(null);
  
  // 模板持久化状态
  const [loadingTemplates, setLoadingTemplates] = React.useState<boolean>(false);
  
  // 加载NPC、AI服务、变量列表和模板
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 加载NPC列表
        const npcResponse = await npcService.getNpcs();
        setNpcs(npcResponse.data || []);
        
        // 加载AI服务列表
        const aiServiceResponse = await aiServiceService.getServices();
        setAiServices(aiServiceResponse.data || []);
        
        // 加载变量列表
        const variableResponse = await variableService.getVariables();
        // 将API返回的Variable转换为VariableView
        const variableData = Array.isArray(variableResponse.data) ? variableResponse.data : [];
        const variableViews = variableData.map((v: any) => ({
          id: v.id,
          name: v.name,
          identifier: v.identifier,
          type: v.type,
          sourceId: v.source?.id || '',
          sourceName: v.source?.name || v.name,
          value: v.value
        }));
        setVariables(variableViews);
        
        // 尝试加载持久化的模板（如果是编辑模式且有ID）
        if (isEdit && initialValues?.id) {
          await loadStoredTemplates(initialValues.id);
        }
      } catch (error) {
        console.error('加载表单数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isEdit, initialValues]);
  
  // 加载持久化存储的模板
  const loadStoredTemplates = async (taskId: string) => {
    try {
      setLoadingTemplates(true);
      const templates = await workTaskService.getTaskTemplates(taskId);
      if (templates && Object.keys(templates).length > 0) {
        // 预处理所有模板，确保使用系统标识符
        for (const npcId in templates) {
          if (templates[npcId] && templates[npcId].template) {
            templates[npcId].template = convertToSystemIdentifiers(
              templates[npcId].template,
              npcs
            );
          }
        }
        
        console.log('[WorkTaskForm] 成功加载并转换持久化模板');
        setNpcTemplates(templates);
        
        // 如果当前已选择了NPC，并且有该NPC的模板，立即应用
        if (selectedNpcId && templates[selectedNpcId]) {
          const npcTemplate = templates[selectedNpcId];
          form.setFieldsValue({
            npcPromptTemplate: {
              template: npcTemplate.template,
              isCustomized: npcTemplate.isCustomized
            }
          });
          
          // 如果编辑器已挂载，更新内容
          if (promptEditorRef.current) {
            promptEditorRef.current.parseExternalContent(npcTemplate.template);
          }
        }
      }
    } catch (error) {
      console.error('加载持久化模板失败:', error);
      message.warning('无法加载保存的模板，将使用默认模板');
    } finally {
      setLoadingTemplates(false);
    }
  };
  
  // 设置初始值
  React.useEffect(() => {
    if (initialValues) {
      setCustomPrompt(initialValues.npcPromptTemplate?.isCustomized || false);
      
      // 如果是编辑模式且有ID，检查是否有持久化的输出
      if (isEdit && initialValues.id) {
        const storedOutput = outputPersistenceService.getTaskOutput(initialValues.id);
        
        if (storedOutput) {
          // 使用持久化的输出
          setTestOutput(storedOutput.output);
          setExecutionTime(storedOutput.executionTime);
          setExecutionStatus(storedOutput.executionStatus as unknown as ExecutionStatus);
          setDebugInfo(storedOutput.debugInfo || null);
          
          // 更新表单字段
          form.setFieldsValue({
            ...initialValues,
            output: storedOutput.output
          });
        } else {
          // 使用初始值
          setTestOutput(initialValues.output || '');
          setExecutionTime(initialValues.lastRunAt || '');
          
          // 处理执行状态
          if (initialValues.executionStatus) {
            // 使用映射将字符串转换为枚举
            const statusMap: Record<string, ExecutionStatus> = {
              'idle': ExecutionStatus.IDLE,
              'running': ExecutionStatus.RUNNING,
              'completed': ExecutionStatus.COMPLETED,
              'failed': ExecutionStatus.FAILED
            };
            setExecutionStatus(statusMap[initialValues.executionStatus] || ExecutionStatus.IDLE);
          }
          
          form.setFieldsValue({
            ...initialValues
          });
        }
      } else {
        // 对于非编辑模式，使用初始值
        setTestOutput(initialValues.output || '');
        setExecutionTime(initialValues.lastRunAt || '');
        
        // 处理执行状态
        if (initialValues.executionStatus) {
          const statusMap: Record<string, ExecutionStatus> = {
            'idle': ExecutionStatus.IDLE,
            'running': ExecutionStatus.RUNNING,
            'completed': ExecutionStatus.COMPLETED,
            'failed': ExecutionStatus.FAILED
          };
          setExecutionStatus(statusMap[initialValues.executionStatus] || ExecutionStatus.IDLE);
        }
        
        form.setFieldsValue({
          ...initialValues
        });
      }
    }
  }, [initialValues, form, isEdit]);
  
  // 处理状态切换
  const handleStatusChange = (isActive: boolean) => {
    console.log(`[WorkTaskForm] 状态切换: ${isActive ? 'active' : 'archived'}`);
    const status = isActive ? 'active' : 'archived';
    form.setFieldsValue({ status });
  };
  
  // 将VariableView转换为VariableData
  const convertToVariableData = (variable: VariableView): VariableData => {
    return {
      id: variable.id,
      field: variable.identifier.split('_').pop() || 'unknown', // 从标识符提取字段名
      sourceName: variable.sourceName,
      sourceType: variable.type,
      value: variable.value,
      displayIdentifier: variable.displayIdentifier,
      // 实现getter
      get identifier() {
        return variable.identifier;
      }
    };
  };

  // 处理变量点击，将变量插入到输入框或提示词编辑器
  const handleVariableClick = (variable: VariableView) => {
    // 检查是否为当前任务的变量
    const taskName = form.getFieldValue('name');
    if (variable.sourceName === taskName) {
      message.warning('不能引用当前任务的变量');
      return;
    }

    // 判断焦点在哪个编辑器上
    if (document.activeElement?.closest('.prompt-editor-container')) {
      // 插入到提示词编辑器
      if (promptEditorRef.current) {
        promptEditorRef.current.insertVariable(variable);
      }
    } else {
      // 插入到输入编辑器
      if (inputEditorRef.current) {
        // 转换为VariableData类型
        const variableData = convertToVariableData(variable);
        inputEditorRef.current.insertVariable(variableData);
      }
    }
  };
  
  // 处理输入编辑器内容变化
  const handleInputChange = (content: string) => {
    // 直接使用VariableEditorXWrapper返回的内容（已根据contentFormat属性处理过）
    form.setFieldsValue({ input: content });
    
    // 添加调试日志，确认内容格式
    console.log('[WorkTaskForm] 编辑器内容更新:', {
      content: content,
      contentLength: content ? content.length : 0,
      hasContent: !!content
    });
  };
  
  // 生成NPC默认模板 - 使用系统标识符格式
  const generateDefaultTemplate = async (npcName: string, npcId?: string): Promise<string> => {
    if (!npcId) {
      // 没有ID时使用简单格式（向后兼容）
      return `你是@${npcName}.name，现在你具备的知识背景是：@${npcName}.knowledge，根据你的行动原则：@${npcName}.act，请你给出以上输入的反馈。`;
    }
    
    // 使用系统标识符格式生成模板
    return `你是@gv_${npcId}_name，现在你具备的知识背景是：@gv_${npcId}_knowledge，根据你的行动原则：@gv_${npcId}_act，请你给出以上输入的反馈。`;
  };
  
  // 持久化保存模板到数据库
  const saveTemplatesToDatabase = async (taskId: string, templates: Record<string, NpcPromptTemplate>): Promise<void> => {
    try {
      // 在持久化前确保所有模板都使用系统标识符
      const convertedTemplates = {...templates};
      for (const npcId in convertedTemplates) {
        if (convertedTemplates[npcId] && convertedTemplates[npcId].template) {
          convertedTemplates[npcId].template = convertToSystemIdentifiers(
            convertedTemplates[npcId].template,
            npcs
          );
        }
      }
      
      // 记录转换过程
      console.log('[WorkTaskForm] 保存到数据库的模板已转换为系统标识符格式');
      
      // 使用转换后的模板更新
      await workTaskService.updateTaskTemplates(taskId, convertedTemplates);
    } catch (error) {
      console.error('持久化保存模板失败:', error);
      throw error;
    }
  };
  
  // 当选择NPC时加载模板
  const handleNpcChange = async (npcId: string) => {
    setSelectedNpcId(npcId); // 更新当前选中的NPC ID
    
    if (!npcId) {
      // 如果选择了"不选择NPC"选项（npcId为空）
      form.setFieldsValue({
        npcName: '',
        npcPromptTemplate: {
          template: '', // 清空提示词模板
          isCustomized: false
        }
      });
      
      // 关闭提示词控制面板
      setActiveCollapseKeys([]);
      
      // 清空编辑器内容
      if (promptEditorRef.current) {
        promptEditorRef.current.parseExternalContent('');
      }
      
      return;
    }
    
    // 确保折叠面板展开，使编辑器可见
    if (!activeCollapseKeys.includes('promptControl')) {
      setActiveCollapseKeys(['promptControl']);
    }
    
    const selectedNpc = npcs.find(npc => npc.id === npcId);
    if (selectedNpc) {
      form.setFieldsValue({
        npcName: selectedNpc.name
      });
      
      try {
        // 检查是否有缓存的模板
        if (npcTemplates[npcId]) {
          // 使用缓存的模板
          const savedTemplate = npcTemplates[npcId];
          
          // 设置表单值
          form.setFieldsValue({
            npcPromptTemplate: {
              template: savedTemplate.template,
              isCustomized: savedTemplate.isCustomized
            }
          });
          
          // 更新编辑器内容，使用parseExternalContent解析变量标记
          if (promptEditorRef.current) {
            promptEditorRef.current.parseExternalContent(savedTemplate.template);
          }
        } else {
          // 直接生成默认模板
          const defaultTemplate = await generateDefaultTemplate(selectedNpc.name, selectedNpc.id);
          
          // 设置表单值
          form.setFieldsValue({
            npcPromptTemplate: {
              template: defaultTemplate,
              isCustomized: false
            }
          });
          
          // 更新编辑器内容，使用parseExternalContent解析变量标记
          if (promptEditorRef.current) {
            promptEditorRef.current.parseExternalContent(defaultTemplate);
          }
        }
      } catch (error) {
        console.error('加载提示词模板失败:', error);
      }
    } else {
      // 清空模板
      form.setFieldsValue({
        npcPromptTemplate: {
          template: '',
          isCustomized: false
        }
      });
      
      // 清空编辑器内容
      if (promptEditorRef.current) {
        promptEditorRef.current.parseExternalContent('');
      }
    }
  };
  
  // 当选择AI服务时
  const handleAiServiceChange = (serviceId: string) => {
    const selectedService = aiServices.find(service => service.id === serviceId);
    if (selectedService) {
      form.setFieldsValue({
        aiServiceName: selectedService.name
      });
    }
  };
  
  // 切换自定义提示词
  const handleCustomPromptChange = (checked: boolean) => {
    setCustomPrompt(checked);
    form.setFieldsValue({
      npcPromptTemplate: {
        ...form.getFieldValue('npcPromptTemplate'),
        isCustomized: checked
      }
    });
  };
  
  // 状态管理：变量解析调试信息
  const [debugInfo, setDebugInfo] = React.useState<{
    originalInput: string;
    resolvedInput: string;
    originalTemplate: string;
    resolvedTemplate: string;
    fullPrompt: string;
  } | null>(null);
  
  // 状态：是否显示调试信息
  const [showDebugInfo, setShowDebugInfo] = React.useState<boolean>(false);
  
  // 测试执行
  const handleTestExecute = async () => {
    try {
      const values = form.getFieldsValue();
      
      if (!values.aiServiceId || !values.input) {
        message.warning('请确保已填写输入内容和选择AI服务');
        return; // 缺少必要字段
      }
      
      // 获取输入内容和模板
      let rawInput = values.input; // 直接使用表单值
      let rawTemplate = values.npcPromptTemplate?.template || '';
      
      // 处理提示词模板
      if (promptEditorRef.current && promptEditorRef.current.getRichContent) {
        const richTemplate = promptEditorRef.current.getRichContent();
        rawTemplate = richTemplate.rawText;
      } else if (promptEditorRef.current && promptEditorRef.current.getRawContent) {
        // 降级到旧方法
        rawTemplate = promptEditorRef.current.getRawContent() || values.npcPromptTemplate?.template || '';
      }
      
      // 确保模板使用系统标识符
      console.log('[WorkTaskForm] 转换前模板:', rawTemplate);
      rawTemplate = convertToSystemIdentifiers(rawTemplate, npcs);
      console.log('[WorkTaskForm] 转换后模板:', rawTemplate);
      
      // 确保NPC提示词模板不为undefined
      const npcPromptTemplate = values.npcPromptTemplate || { 
        template: '', 
        isCustomized: false 
      };
      
      // 如果没有模板但是需要自定义，则获取模板
      if (!npcPromptTemplate.template) {
        const selectedNpc = npcs.find(npc => npc.id === values.npcId);
        if (selectedNpc) {
          try {
            // 尝试获取NPC模板或生成默认模板
            npcPromptTemplate.template = await generateDefaultTemplate(selectedNpc.name, selectedNpc.id);
          } catch (error) {
            console.error('获取NPC模板失败:', error);
            message.warning('获取NPC模板失败，将使用系统默认模板');
          }
        }
      }
      
      setTestExecuting(true);
      setExecutionStatus(ExecutionStatus.RUNNING);
      
      // 始终请求带调试信息的测试执行
      const result = await workTaskService.testExecuteWorkTask({
        input: rawInput, // 使用纯文本格式的输入
        npcId: values.npcId,
        aiServiceId: values.aiServiceId,
        npcPromptTemplate: {
          ...npcPromptTemplate,
          template: rawTemplate // 使用纯文本格式的模板
        },
        debug: true // 始终获取调试信息
      });
      
      // 处理返回结果
      let output = '';
      let debugData: TestExecuteDebugInfo | null = null;
      
      if (typeof result === 'string') {
        // 兼容旧API返回格式
        output = result;
      } else {
        // 新API返回格式：包含输出和调试信息
        output = result.output;
        debugData = result.debug || null;
      }
      
      // 更新状态
      setTestOutput(output);
      setDebugInfo(debugData);
      
      // 记录执行时间
      const currentTime = new Date().toISOString();
      setExecutionTime(currentTime);
      setExecutionStatus(ExecutionStatus.COMPLETED);
      
      // 将输出内容保存到表单字段，确保提交时能获取到最新结果
      form.setFieldsValue({ output });
      
      // 如果是编辑模式且有任务ID，则持久化结果
      if (isEdit && initialValues?.id) {
        // 将结果持久化到本地存储
        outputPersistenceService.saveTaskOutput(
          initialValues.id,
          output,
          ExecutionStatus.COMPLETED.toString(),
          currentTime,
          debugData
        );
      }
    } catch (error) {
      console.error('测试执行失败:', error);
      setExecutionStatus(ExecutionStatus.FAILED);
      setDebugInfo(null);
    } finally {
      setTestExecuting(false);
    }
  };
  
  // 切换调试信息显示
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  // 提交表单 - 更新为支持持久化模板
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // 强制从编辑器获取最新内容 - 解决更新时内容不同步问题
      let inputHtml = '';
      let inputRawText = '';
      
      // 捕获并记录编辑器当前状态
      console.log('[WorkTaskForm] 提交前编辑器状态:', {
        editorMounted: !!inputEditorRef.current,
        initialInput: values.input || '(空)',
        isEditMode: isEdit
      });
      
      // 优先从编辑器获取内容，无论是创建还是更新模式
      if (inputEditorRef.current) {
        try {
          // 获取HTML格式内容
          inputHtml = inputEditorRef.current.getContent();
          
          // 强制获取rawText格式，确保文本格式一致性
          inputRawText = inputEditorRef.current.getRawText();
          
          console.log('[WorkTaskForm] 成功从编辑器获取内容:', {
            htmlLength: inputHtml.length,
            rawTextLength: inputRawText.length,
            htmlPreview: inputHtml.substring(0, 50) + '...',
            rawTextPreview: inputRawText.substring(0, 50) + '...'
          });
        } catch (error) {
          console.error('[WorkTaskForm] 获取编辑器内容出错:', error);
          // 降级处理：使用表单值
          inputRawText = values.input || '';
        }
      } else {
        // 编辑器未挂载，使用表单值
        console.warn('[WorkTaskForm] 编辑器引用不可用，使用表单值');
        inputRawText = values.input || '';
      }
      
      // 确保即使编辑器获取失败，也至少有表单中的值
      if (!inputRawText && values.input) {
        inputRawText = values.input;
        console.warn('[WorkTaskForm] 使用表单值作为降级方案');
      }
      
      // 更新表单值以确保一致性
      values.input = inputRawText;
      
      // 确保获取最新的status值
      const currentStatus = form.getFieldValue('status');
      console.log('[WorkTaskForm] 提交时的状态:', currentStatus);
      
      // 明确给values对象设置status字段
      values.status = currentStatus;
      
      // 处理NPC模板 - 确保使用系统标识符格式
      if (values.npcPromptTemplate?.template) {
        console.log('[WorkTaskForm] 提交前模板:', values.npcPromptTemplate.template);
        values.npcPromptTemplate.template = convertToSystemIdentifiers(
          values.npcPromptTemplate.template, 
          npcs
        );
        console.log('[WorkTaskForm] 提交后模板:', values.npcPromptTemplate.template);
      }
      
      // 处理所有NPC模板集合 - 确保使用系统标识符
      const convertedTemplates = {...npcTemplates};
      for (const npcId in convertedTemplates) {
        if (convertedTemplates[npcId] && convertedTemplates[npcId].template) {
          convertedTemplates[npcId].template = convertToSystemIdentifiers(
            convertedTemplates[npcId].template,
            npcs
          );
        }
      }
      
      // 添加当前的NPC模板集合到提交数据中
      const submitData = {
        ...values,
        npcTemplates: convertedTemplates // 包含转换后的所有NPC模板
      };
      
      // 详细日志记录
      console.log('[WorkTaskForm] 最终提交数据:', {
        isEditMode: isEdit ? 'UPDATE' : 'CREATE',
        taskId: isEdit ? initialValues?.id : 'NEW',
        input: {
          value: values.input,
          length: values.input ? values.input.length : 0,
          preview: values.input ? values.input.substring(0, 30) + '...' : '(empty)'
        },
        hasContent: !!inputRawText
      });
      
      // 表单数据验证 - 确保关键字段存在
      if (!submitData.input) {
        message.error('输入内容不能为空');
        setSubmitting(false);
        return;
      }
      
      let taskId;
      if (isEdit && initialValues?.id) {
        console.log(`[WorkTaskForm] 更新任务 ID: ${initialValues.id}`);
        const response = await workTaskService.updateWorkTask(initialValues.id, submitData);
        taskId = initialValues.id;
        console.log(`[WorkTaskForm] 更新成功，任务 ID: ${taskId}`);
      } else {
        console.log('[WorkTaskForm] 创建新任务');
        const response = await workTaskService.createWorkTask(submitData);
        taskId = response.id;
        console.log(`[WorkTaskForm] 创建成功，新任务 ID: ${taskId}`);
      }
      
      // 确保模板被持久化保存
      if (taskId && Object.keys(convertedTemplates).length > 0) {
        try {
          // 打印调试信息，用于验证转换
          console.log('[WorkTaskForm] 持久化保存模板:', {
            模板数量: Object.keys(convertedTemplates).length,
            模板示例: Object.keys(convertedTemplates).length > 0 
              ? convertedTemplates[Object.keys(convertedTemplates)[0]].template 
              : '无模板'
          });
          
          // 使用转换后的模板持久化保存
          await workTaskService.updateTaskTemplates(taskId, convertedTemplates);
        } catch (templateError) {
          console.error('保存模板失败，但任务已保存:', templateError);
        }
      }
      
      navigate('/task');
    } catch (error) {
      console.error(isEdit ? '更新工作任务失败:' : '创建工作任务失败:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // 返回列表页
  const handleCancel = () => {
    navigate('/task');
  };
  
  
  // 格式化执行时间
  const formatExecutionTime = () => {
    if (!executionTime) return '未执行';
    const date = new Date(executionTime);
    return date.toLocaleString('zh-CN');
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin tip="加载中..." />
      </div>
    );
  }
  
  return (
    <Row gutter={24}>
      {/* 左侧工作任务表单 */}
      <Col span={16}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'active',
            ...initialValues
          }}
        >
          {/* 名称和输入区域 */}
          <TaskInputSection 
            form={form}
            inputEditorRef={inputEditorRef}
            handleInputChange={handleInputChange}
            handleStatusChange={handleStatusChange}
          />
          
          {/* 规则处理区域 */}
          <TaskProcessSection 
            form={form}
            selectedNpcId={selectedNpcId}
            selectedNpcName={form.getFieldValue('npcName') || ''}
            npcs={npcs}
            aiServices={aiServices}
            promptEditorRef={promptEditorRef}
            npcTemplates={npcTemplates}
            setNpcTemplates={setNpcTemplates}
            activeCollapseKeys={activeCollapseKeys}
            setActiveCollapseKeys={setActiveCollapseKeys}
            handleNpcChange={handleNpcChange}
            handleAiServiceChange={handleAiServiceChange}
            variables={variables}
            currentTaskName={form.getFieldValue('name')}
            saveTemplateToDatabase={isEdit && initialValues?.id ? saveTemplatesToDatabase : undefined}
            taskId={isEdit && initialValues?.id ? initialValues.id : undefined}
          />
          
          {/* 输出区域 */}
          <TaskOutputSection 
            form={form}
            taskId={isEdit ? initialValues?.id : undefined}
            testOutput={testOutput}
            executionTime={executionTime}
            executionStatus={executionStatus}
            debugInfo={debugInfo}
            testExecuting={testExecuting}
            showDebugInfo={showDebugInfo}
            handleTestExecute={handleTestExecute}
            toggleDebugInfo={toggleDebugInfo}
            formatExecutionTime={formatExecutionTime}
          />
          
          {/* 表单底部操作按钮 */}
          <Form.Item>
            <FormActionButtons 
              isEdit={isEdit} 
              submitting={submitting} 
              onCancel={handleCancel} 
            />
          </Form.Item>
        </Form>
      </Col>

      {/* 右侧变量列表 */}
      <Col span={8}>
        <Card 
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <VariableList onVariableClick={handleVariableClick} />
        </Card>
      </Col>
    </Row>
  );
};

export default WorkTaskForm;
