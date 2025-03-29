import * as React from 'react';
import { useRef, createRef } from 'react';
import { Form, Card, Spin, Row, Col, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ExecutionStatus, NpcPromptTemplate, TestExecuteDebugInfo } from '../../services/workTaskService';
import { VariableView } from './VariableList';
import AvailableVariablePanel from './AvailableVariablePanel';
import { VariableEditorXRef, VariableData } from '../../components/VariableEditorXWrapper';
import { VexPromptEditorRef } from './VexPromptEditor';
import createLogger from '../../utils/logger';

// 导入表单子组件
import TaskInputSection from './form-components/TaskInputSection';
import TaskProcessSection from './form-components/TaskProcessSection';
import TaskOutputSection from './form-components/TaskOutputSection';
import FormActionButtons from './form-components/FormActionButtons';

// 导入自定义Hook
import { useFormDataManagement } from './hooks/useFormDataManagement';
import { useTemplateManagement } from './hooks/useTemplateManagement';
import { useTestExecution } from './hooks/useTestExecution';

const logger = createLogger('WorkTaskForm');

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

interface WorkTaskFormProps {
  initialValues?: any;
  isEdit?: boolean;
}

/**
 * 工作任务表单组件
 * 用于创建和编辑工作任务
 */
const WorkTaskForm: React.FC<WorkTaskFormProps> = ({ initialValues, isEdit = false }) => {
  // 创建表单实例
  const [form] = Form.useForm();
  const navigate = useNavigate();
  
  // 创建引用
  const promptEditorRef = useRef<VexPromptEditorRef>(null);
  const inputEditorRef = useRef<VariableEditorXRef>(null);
  const variablePanelRef = createRef<{ refresh: () => void }>();
  
  // 状态
  const [loading, setLoading] = React.useState<boolean>(false);
  const [npcs, setNpcs] = React.useState<any[]>([]);
  const [aiServices, setAiServices] = React.useState<any[]>([]);
  const [testOutput, setTestOutput] = React.useState<string>('');
  const [executionTime, setExecutionTime] = React.useState<string>(initialValues?.lastRunAt || '');
  const [selectedNpcId, setSelectedNpcId] = React.useState<string>(initialValues?.npcId || '');
  const [selectedNpcName, setSelectedNpcName] = React.useState<string>(initialValues?.npcName || '');
  const [npcTemplates, setNpcTemplates] = React.useState<Record<string, NpcPromptTemplate>>({});
  const [executionStatus, setExecutionStatus] = React.useState<ExecutionStatus>(
    initialValues?.executionStatus 
      ? initialValues.executionStatus as unknown as ExecutionStatus 
      : ExecutionStatus.IDLE
  );
  
  const [variables, setVariables] = React.useState<VariableView[]>([]);
  const [activeCollapseKeys, setActiveCollapseKeys] = React.useState<string[]>(
    selectedNpcId ? ['promptControl'] : []
  );
  
  // 调试信息
  const [debugInfo, setDebugInfo] = React.useState<TestExecuteDebugInfo | null>(null);
  
  // 服务端日志
  const [serverLogs, setServerLogs] = React.useState<string[]>([]);
  
  // 使用自定义Hooks
  const formDataManagement = useFormDataManagement({
    form,
    initialTaskId: isEdit ? initialValues?.id : undefined,
    isEdit,
    onSaveSuccess: () => {}
  });
  
  const templateManagement = useTemplateManagement({
    form,
    initialTaskId: isEdit ? initialValues?.id : undefined,
    isEdit,
    npcs // 传入NPC列表
  });
  
  const testExecution = useTestExecution({
    initialTaskId: isEdit ? initialValues?.id : undefined,
    getFormValues: () => form.getFieldsValue(true)
  });
  
  // 加载NPC、AI服务、变量列表和模板 - 按顺序加载确保依赖关系
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 第一步：优先加载NPC数据，因为模板处理依赖它
        logger.info('开始加载数据：先加载NPC数据');
        await loadNpcs();
        logger.info('NPC数据加载完成');
        
        // 第二步：并行加载其他基础数据（不依赖NPC数据）
        logger.info('开始加载其他基础数据');
        await Promise.all([
          loadAiServices(),
          loadVariables()
        ]);
        logger.info('基础数据加载完成');
        
        // 第三步：最后加载模板，此时NPC数据已经准备好用于标识符转换
        if (isEdit && initialValues?.id) {
          logger.info('开始加载模板数据');
          await loadStoredTemplates(initialValues.id);
          logger.info('模板数据加载完成');
        }
      } catch (error) {
        logger.error('加载表单数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // 初始化表单数据
    formDataManagement.initializeFormData();
    // 移除formDataManagement依赖，它是一个对象引用会导致不必要的重新渲染
    // 只依赖真正需要的变量
  }, [isEdit, initialValues?.id]); 
  
  // 加载NPC列表
  const loadNpcs = async () => {
    try {
      const { npcService } = await import('../../services/npcService');
      const npcResponse = await npcService.getNpcs();
      setNpcs(npcResponse.data || []);
    } catch (error) {
      logger.error('加载NPC列表失败:', error);
    }
  };
  
  // 加载AI服务列表
  const loadAiServices = async () => {
    try {
      const { aiServiceService } = await import('../../services/aiServiceService');
      const aiServiceResponse = await aiServiceService.getServices();
      setAiServices(aiServiceResponse.data || []);
    } catch (error) {
      logger.error('加载AI服务列表失败:', error);
    }
  };
  
  // 加载变量列表
  const loadVariables = async () => {
    try {
      const { variableService } = await import('../../services/variableService');
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
    } catch (error) {
      logger.error('加载变量列表失败:', error);
    }
  };
  
  // 加载持久化存储的模板
  const loadStoredTemplates = async (taskId: string) => {
    try {
      const { default: workTaskService } = await import('../../services/workTaskService');
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
        
        logger.info('成功加载并转换持久化模板');
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
      logger.error('加载持久化模板失败:', error);
    }
  };
  
  // 设置初始值，不使用持久化的输出（已禁用缓存机制）
  React.useEffect(() => {
    if (initialValues) {
      // 直接使用初始值，不读取本地存储
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
    }
  }, [initialValues]);
  
  // 处理状态切换
  const handleStatusChange = (isActive: boolean) => {
    logger.debug(`状态切换: ${isActive ? 'active' : 'archived'}`);
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
      logger.warn('不能引用当前任务的变量');
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
    // 直接使用VariableEditorXWrapper返回的内容
    form.setFieldsValue({ input: content });
    
    // 添加调试日志，确认内容格式
    logger.debug('编辑器内容更新:', {
      content: content.length > 100 ? content.substring(0, 100) + '...' : content,
      contentLength: content ? content.length : 0,
      hasContent: !!content
    });
  };
  
  // 持久化保存模板到数据库
  const saveTemplatesToDatabase = async (taskId: string, templates: Record<string, NpcPromptTemplate>): Promise<void> => {
    try {
      const { default: workTaskService } = await import('../../services/workTaskService');
      
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
      
      logger.info('保存到数据库的模板已转换为系统标识符格式');
      
      // 使用转换后的模板更新
      await workTaskService.updateTaskTemplates(taskId, convertedTemplates);
    } catch (error) {
      logger.error('持久化保存模板失败:', error);
      throw error;
    }
  };
  
  // 当选择NPC时加载模板
  const handleNpcChange = async (npcId: string) => {
    setSelectedNpcId(npcId); // 更新当前选中的NPC ID
    
    const selectedNpc = npcs.find(npc => npc.id === npcId);
    if (selectedNpc) {
      setSelectedNpcName(selectedNpc.name);
    } else {
      setSelectedNpcName('');
    }

    // 确保提示词编辑器面板展开
    if (npcId && !activeCollapseKeys.includes('promptControl')) {
      setActiveCollapseKeys(['promptControl']);
    }
    
    // 清空现有NPC ID情况
    if (!npcId) {
      form.setFieldsValue({
        npcPromptTemplate: {
          template: '',
          isCustomized: false
        }
      });
      
      if (promptEditorRef.current) {
        promptEditorRef.current.parseExternalContent('');
      }
      return;
    }
    
    // 先检查是否在已加载的NPC模板中存在
    if (npcTemplates[npcId]) {
      const npcTemplate = npcTemplates[npcId];
      form.setFieldsValue({
        npcPromptTemplate: {
          template: npcTemplate.template,
          isCustomized: npcTemplate.isCustomized
        }
      });
      
      // 更新编辑器内容
      if (promptEditorRef.current) {
        promptEditorRef.current.parseExternalContent(npcTemplate.template);
      }
      
      logger.debug('从已加载模板应用NPC模板', { npcId, isCustomized: npcTemplate.isCustomized });
      return;
    }
    
    // 调用Hook中的NPC变更处理器获取默认模板
    await templateManagement.handleNpcChange(npcId);
    
    // 获取表单中当前的模板值，可能已经被handleNpcChange更新了
    const currentTemplate = form.getFieldValue(['npcPromptTemplate', 'template']);
    
    // 如果存在模板且编辑器已挂载，应用到编辑器
    if (currentTemplate && promptEditorRef.current) {
      promptEditorRef.current.parseExternalContent(currentTemplate);
      logger.debug('应用新的NPC模板到编辑器', { npcId, templateLength: currentTemplate.length });
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
  
  // 测试执行 - 使用Promise链代替async/await以确保更精确的时序控制
  const handleTestExecute = () => {
    // 先清除之前的测试结果
    testExecution.clearTestResult();
    
    // 阶段1：准备和验证数据
    logger.info('【WorkTaskForm】开始测试执行流程 - 阶段1：准备数据');
    
    // 创建将包含编辑器最新内容的字段对象
    const latestEditorContent: Record<string, any> = {};
    
    // 表单验证处理 - 使用Promise链而非async/await
    form.validateFields(['aiServiceId'])
      .then(() => {
        // 设置执行状态
        setExecutionStatus(ExecutionStatus.RUNNING);
        
        // 阶段2：获取编辑器内容
        logger.info('【WorkTaskForm】阶段2：收集编辑器实时数据');
        
        // 如果输入编辑器有实例，从编辑器获取最新内容
        if (inputEditorRef.current) {
          const latestContent = inputEditorRef.current.getRawText();
          // 仅更新用于API请求的对象，不更新form
          latestEditorContent.input = latestContent;
          
          // 记录编辑器内容与表单内容的差异
          const formData = form.getFieldsValue(true);
          logger.info('【WorkTaskForm】输入内容对比:', {
            formInputLength: formData.input ? formData.input.length : 0,
            editorInputLength: latestContent ? latestContent.length : 0,
            isDifferent: formData.input !== latestContent
          });
        }
        
        // 如果提示词编辑器有实例，从编辑器获取最新内容
        if (promptEditorRef.current) {
          const latestTemplate = promptEditorRef.current.getRawContent();
          if (latestTemplate) {
            // 仅更新用于API请求的对象，不更新form
            if (!latestEditorContent.npcPromptTemplate) {
              latestEditorContent.npcPromptTemplate = { 
                template: latestTemplate,
                isCustomized: true 
              };
            } else {
              latestEditorContent.npcPromptTemplate.template = latestTemplate;
            }
            
            // 记录编辑器内容与表单内容的差异
            const formData = form.getFieldsValue(true);
            const formTemplate = formData.npcPromptTemplate?.template || '';
            logger.info('【WorkTaskForm】提示词内容对比:', {
              formTemplateLength: formTemplate.length,
              editorTemplateLength: latestTemplate.length,
              isDifferent: formTemplate !== latestTemplate
            });
          }
        }
        
        // 阶段3：执行测试
        logger.info('【WorkTaskForm】阶段3：开始API调用，编辑器内容键:', Object.keys(latestEditorContent));
        
        // 调用测试执行，使用Promise链处理结果
        return testExecution.testExecute(latestEditorContent);
      })
      .then((result: any) => {
        // 阶段4：处理成功结果
        logger.info('【WorkTaskForm】阶段4：处理API返回结果', { 
          success: result.success,
          hasOutput: !!result.output
        });
        
        if (result && result.success) {
          // 确保我们使用返回的结果而不是testExecution.testResult
          // 这样避免状态更新的时序问题
          setTestOutput(result.output || '');
          setExecutionStatus(ExecutionStatus.COMPLETED);
          
          // 记录执行时间
          const currentTime = new Date().toISOString();
          setExecutionTime(currentTime);
          
          // 设置调试信息和服务器日志 - 使用结果对象中的值
          setDebugInfo(result.debugInfo || null);
          setServerLogs(result.serverLogs || []);
          
          // 将测试输出结果更新到表单字段，确保保存时能包含最新测试结果
          if (result.output) {
            form.setFieldValue('output', result.output);
            logger.info('【WorkTaskForm】测试结果已更新到表单字段', { outputLength: result.output.length });
          }
          
          logger.info('【WorkTaskForm】测试执行成功，输出长度:', 
            result.output ? result.output.length : 0);
        }
      })
      .catch((error) => {
        // 阶段5：处理错误
        logger.error('【WorkTaskForm】测试执行失败:', error);
        
        // 确保错误状态正确设置
        setExecutionStatus(ExecutionStatus.FAILED);
        
        // 如果有错误消息，显示在控制台
        if (error.error) {
          console.error('【WorkTaskForm】错误详情:', error.error);
        }
      });
  };
  
  // 格式化执行时间
  const formatExecutionTime = () => {
    if (!executionTime) return '未执行';
    const date = new Date(executionTime);
    return date.toLocaleString('zh-CN');
  };
  
  // 提交表单 - 使用FormDataManagement Hook
  const handleSubmit = async () => {
    try {
      // 确保将测试输出结果包含在表单数据中
      if (testOutput) {
        form.setFieldValue('output', testOutput);
        logger.info('提交前设置output字段:', { outputLength: testOutput.length });
      }
      
      // 先从编辑器获取最新内容，应用到表单
      if (inputEditorRef.current) {
        const latestContent = inputEditorRef.current.getRawText();
        // 输出调试信息
        logger.info('提交前获取编辑器内容:', {
          contentLength: latestContent ? latestContent.length : 0,
          preview: latestContent ? latestContent.substring(0, 30) + '...' : '无内容'
        });
        form.setFieldValue('input', latestContent);
      }
      
      // 确保npcPromptTemplate使用系统标识符
      const template = form.getFieldValue(['npcPromptTemplate', 'template']);
      if (template) {
        const convertedTemplate = convertToSystemIdentifiers(template, npcs);
        form.setFieldValue(['npcPromptTemplate', 'template'], convertedTemplate);
      }
      
      // 设置模板集合到表单字段
      form.setFieldValue('npcTemplates', npcTemplates);
      
      // 强制表单先提交表单数据（避免直接调用handleSubmit）
      await form.validateFields();
      
      // 获取包含编辑器更新后的最新表单数据
      const formValues = form.getFieldsValue(true);
      
      // 输出调试信息
      logger.info('提交的表单数据:', {
        inputLength: formValues.input ? formValues.input.length : 0,
        inputPreview: formValues.input ? formValues.input.substring(0, 30) + '...' : '无内容'
      });
      
      // 手动调用API提交数据，而不是使用formDataManagement.handleSubmit
      let response;
      // 导入workTaskService
      const { default: workTaskService } = await import('../../services/workTaskService');
      
      if (isEdit && initialValues?.id) {
        // 更新现有任务
        response = await workTaskService.updateWorkTask(initialValues.id, formValues);
      } else {
        // 创建新任务
        response = await workTaskService.createWorkTask(formValues);
      }
      
      // 如果成功提交并有任务ID，保存模板
      if (response && response.id) {
        // 将模板保存到数据库
        if (Object.keys(npcTemplates).length > 0) {
          await saveTemplatesToDatabase(response.id, npcTemplates);
        }
      }
      
      // 显示成功消息
      if (isEdit) {
        message.success('工作任务更新成功');
      } else {
        message.success('工作任务创建成功');
      }
      
      // 导航到任务列表页，保持与之前行为一致
      navigate('/task');
    } catch (error) {
      logger.error('表单提交失败:', error);
    }
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
            selectedNpcName={selectedNpcName}
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
          
          {/* 输出区域 - 传递执行阶段信息 */}
          <TaskOutputSection 
            form={form}
            taskId={isEdit ? initialValues?.id : undefined}
            testOutput={testOutput}
            executionTime={executionTime}
            executionStatus={executionStatus}
            debugInfo={debugInfo}
            testExecuting={testExecution.executing}
            handleTestExecute={handleTestExecute}
            formatExecutionTime={formatExecutionTime}
            serverLogs={serverLogs} // 传递服务端日志，但不再显示
            executionPhase={testExecution.executionPhase} // 传递执行阶段信息
          />
          
          {/* 表单底部操作按钮 */}
          <Form.Item>
            <FormActionButtons 
              isEdit={isEdit} 
              submitting={formDataManagement.saving} 
              onCancel={formDataManagement.handleCancel} 
            />
          </Form.Item>
        </Form>
      </Col>

      {/* 右侧变量列表 - 使用可用变量面板 */}
      <Col span={8}>
        <AvailableVariablePanel 
          ref={variablePanelRef}
          onVariableClick={handleVariableClick}
          inputEditorRef={inputEditorRef}
          promptEditorRef={promptEditorRef}
        />
      </Col>
    </Row>
  );
};

export default WorkTaskForm;
