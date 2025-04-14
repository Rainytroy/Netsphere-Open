import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Typography, Spin, message, Switch, Space, Alert, Tag } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { NodeConfigProps } from './NodeConfigInterface';
import VexWorkflowEditor, { VexWorkflowEditorRef } from '../VexWorkflowEditor';
import { variableService } from '../../../services/variableService';
import { workflowVariableService } from '../../../services/workflowVariableService';
import { workflowService } from '../../../services/workflowService';
import { useWorkflowEditor } from '../WorkflowEditorContext';
import { useVariableParser } from '../../../pages/demo/variable-editor-x/hooks/useVariableParser';
import IdentifierFormatterService from '../../../services/IdentifierFormatterService';

const { Text } = Typography;

/**
 * 起点卡配置组件
 * 允许用户配置工作流的起始提示文本和启用状态
 */
const StartNodeConfig: React.FC<NodeConfigProps> = ({
  nodeId,
  initialConfig,
  onSave,
  updateEditorState  // 接收编辑器状态更新回调
}) => {
  // 创建表单引用
  const [form] = Form.useForm();
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorContent, setEditorContent] = useState<string>(initialConfig?.promptText || '这是工作流的起点');
  
  // 工作流启用状态 - 默认为启用
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // 创建一个ref用于访问VexWorkflowEditor组件实例
  const editorRef = useRef<VexWorkflowEditorRef>(null);
  
  // 在组件顶层使用变量解析钩子
  const { parseText } = useVariableParser();
  
  // 使用状态跟踪是否已经设置过初始内容，避免重复设置
  const [contentInitialized, setContentInitialized] = useState(false);
  
  // 获取工作流编辑器上下文
  const workflowContext = useWorkflowEditor();
  
  // 初始化工作流启用状态
  useEffect(() => {
    const loadWorkflowStatus = async () => {
      try {
        // 尝试获取工作流ID
        const formData = workflowContext?.prepareFormData?.() || {};
        let workflowId = '';
        
        if (formData && typeof formData === 'object' && 'id' in formData && formData.id) {
          workflowId = String(formData.id);
          console.log(`[StartNodeConfig] 获取到工作流ID: ${workflowId}, 正在加载启用状态...`);
          
          // 获取工作流详情以获取isActive状态
          if (workflowId) {
            const workflow = await workflowService.getWorkflow(workflowId);
            if (workflow) {
              setIsActive(workflow.isActive);
              console.log(`[StartNodeConfig] 工作流启用状态: ${workflow.isActive}`);
            }
          }
        }
      } catch (error) {
        console.error('[StartNodeConfig] 加载工作流启用状态失败:', error);
        // 默认为启用状态
        setIsActive(true);
      }
    };
    
    loadWorkflowStatus();
  }, [workflowContext]);
  
  // 分离内容初始化和焦点处理，确保只发生一次内容初始化
  useEffect(() => {
    // 只有当编辑器ref可用且内容尚未初始化时执行
    if (editorRef.current && !contentInitialized) {
      const currentContent = initialConfig?.promptText || '这是工作流的起点';
      
      // 总是更新内容，不管是空还是有值
      console.log('[StartNodeConfig] 初始化编辑器内容:', currentContent);
      // 设置编辑器内容并更新state
      editorRef.current.updateContent(currentContent);
      setContentInitialized(true);
    }
  }, [editorRef.current, contentInitialized, initialConfig]);
  
  // 单独处理焦点，延迟更长以确保Modal和编辑器完全渲染
  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      try {
        // 使用更可靠的方式查找编辑器元素并设置焦点
        if (editorRef.current) {
          console.log('[StartNodeConfig] 尝试设置编辑器焦点');
          // 检查编辑器实例是否有focusEditor方法（实际实现中有，但接口定义中没有）
          if (typeof (editorRef.current as any).focusEditor === 'function') {
            (editorRef.current as any).focusEditor();
          } else {
            // 回退到DOM查询
            const editorElement = document.querySelector(`[id="node-config-form-${nodeId}"] [role="textbox"]`);
            if (editorElement) {
              (editorElement as HTMLElement).focus();
            }
          }
        }
      } catch (error) {
        console.error('[StartNodeConfig] 设置焦点失败:', error);
      }
    }, 500); // 使用更长的延迟确保Modal完全渲染
    
    return () => clearTimeout(focusTimeout);
  }, [nodeId]);
  
  // 加载变量列表
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        const response: any = await variableService.getVariables();
        
        // 处理响应数据，确保我们有一个有效的数组
        let responseData: any[] = [];
        if (response) {
          if (Array.isArray(response)) {
            responseData = response;
          } else if (response.data && Array.isArray(response.data)) {
            responseData = response.data;
          } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            responseData = response.data.data;
          }
        }
        
        // 转换变量为VariableEditor组件可用的格式
        const variableViews = responseData.map((v: any) => ({
          id: v.id,
          name: v.name,
          identifier: v.identifier,
          type: v.type,
          sourceId: v.source?.id || '',
          sourceName: v.source?.name || '',
          value: v.value
        }));
        
        setVariables(variableViews);
      } catch (error) {
        console.error('加载变量列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadVariables();
  }, []);
  
  // 初始化表单值
  useEffect(() => {
    // 设置初始值到state
    setEditorContent(initialConfig?.promptText || '这是工作流的起点');
    
    // 设置表单初始值
    form.setFieldsValue({
      promptText: initialConfig?.promptText || '这是工作流的起点'
    });
  }, [form, initialConfig]);
  
  // 处理内容变化
  const handleEditorChange = (value: string) => {
    // 只有当内容真正变化时才更新状态
    if (value !== editorContent) {
      // 更新本地state和表单值
      setEditorContent(value);
      form.setFieldsValue({ promptText: value });
      
      // 更新工作流编辑器状态中的描述字段（实时同步）
      if (updateEditorState) {
        updateEditorState('description', value);
      }
    }
  };
  
  // 处理工作流启用状态变化
  const handleActiveChange = (checked: boolean) => {
    setIsActive(checked);
  };
  
  // 优化表单提交处理，确保正确获取和提交内容
  const handleFormSubmit = async (values: any) => {
    // 获取最新的编辑器内容
    const finalPromptText = editorContent;
    
    // 确认内容是否有效
    if (finalPromptText === undefined || finalPromptText === null) {
      console.error(`[StartNodeConfig:${nodeId}] 提交内容无效:`, finalPromptText);
      // 回退到表单值
      values.promptText = values.promptText || '';
    }
    
    // 简单调试日志
    console.log(`[StartNodeConfig] 保存内容，启用状态: ${isActive}`);
    
    // 构建最终配置 - 始终使用editorContent而不是表单值
    const config = {
      ...initialConfig,
      promptText: finalPromptText // 确保使用编辑器内容
    };
    
    // 调用保存回调，传递节点ID和配置
    onSave(nodeId, config);
    
    // 获取VEX解析后的内容 - 使用VEX解析服务处理变量标识符
    let parsedContent = finalPromptText;
    try {
      // 如果编辑器实例可用，尝试获取并解析内容
      if (editorRef.current) {
        // 第一步：获取原始文本，包含系统标识符
        const richContent = editorRef.current.getRichContent();
        const rawText = richContent.rawText;
        
        // 使用变量解析器解析变量标识符
        try {
          // 解析原始文本
          const resolvedContent = await parseText(rawText);
          if (resolvedContent) {
            parsedContent = resolvedContent;
          } else {
            // 如果解析失败，回退到使用原始文本
            parsedContent = rawText;
          }
        } catch (resolveError) {
          console.error(`[StartNodeConfig] 解析变量标识符错误:`, resolveError);
          parsedContent = rawText;
        }
      }
      
      // 从prepareFormData结果中获取工作流ID
      const formData = workflowContext?.prepareFormData?.() || {};
      let workflowId = '';
      
      // 获取工作流ID
      if (formData && typeof formData === 'object' && 'id' in formData && formData.id) {
        workflowId = String(formData.id);
      }
      
      // 最终检查，需要有效的UUID格式工作流ID
      if (!workflowId) {
        console.error('[StartNodeConfig] 无法获取有效的工作流ID，无法更新工作流变量');
        message.error('无法获取工作流ID，变量更新失败');
        return; // 中止变量更新流程
      }
      
      // 使用当前工作流名称
      const workflowName = workflowContext?.name || '未命名工作流';
      
      console.log('[StartNodeConfig] 尝试保存工作流变量和描述:', {
        nodeId,
        workflowId,
        workflowName,
        isActive,
        contentLength: parsedContent?.length || 0,
        contentPreview: parsedContent?.substring(0, 50) + '...'
      });
      
      if (workflowId && workflowName) {
        try {
          // 显示更新中提示
          const updateMessageKey = `update-workflow-${Date.now()}`;
          message.loading({ content: '正在保存工作流设置...', key: updateMessageKey, duration: 0 });
          
          // 1. 更新工作流的description变量
          await workflowVariableService.createOrUpdateWorkflowVariable(
            workflowId,
            workflowName,
            'description',
            parsedContent
          );
          
          // 2. 更新工作流的isActive状态和description属性
          await workflowService.updateWorkflow(workflowId, {
            description: parsedContent,
            isActive: isActive
          });
          
          // 更新成功提示
          message.success({ 
            content: '工作流设置保存成功', 
            key: updateMessageKey,
            duration: 2
          });
        } catch (error) {
          // 将unknown类型的错误转换为具有必要属性的类型
          const typedError = error as { 
            message?: string,
            stack?: string,
            response?: { 
              status?: number, 
              statusText?: string, 
              data?: any 
            } 
          };
          
          // 记录详细错误信息
          console.error('[StartNodeConfig] ❌ 工作流更新失败:', error);
          console.error('[StartNodeConfig] 错误详情:', {
            message: typedError.message || '未知错误',
            stack: typedError.stack?.substring(0, 200) || '无堆栈信息',
            status: typedError.response?.status,
            statusText: typedError.response?.statusText,
            responseData: typedError.response?.data
          });
          
          // 显示错误消息给用户
          message.error({
            content: `保存工作流设置失败: ${typedError.message || '未知错误'}`,
            duration: 5
          });
          
          // 打开浏览器控制台
          console.log('[StartNodeConfig] 请查看浏览器控制台(F12)获取更多错误信息');
        }
      } else {
        console.warn('[StartNodeConfig] 无法更新工作流，缺少工作流ID或名称');
        message.warning('无法更新工作流，缺少工作流标识或名称');
      }
    } catch (error) {
      console.error('[StartNodeConfig] 处理编辑器内容失败:', error);
      message.error('处理编辑器内容失败，请重试');
    }
  };

  return (
    <Form 
      form={form}
      layout="vertical"
      id={`node-config-form-${nodeId}`}
      onFinish={handleFormSubmit}
    >
      <Alert
        icon={<CreditCardOutlined />}
        description="起点卡是工作流的开始，用于设置工作流的初始提示文本和状态。用户与工作流交互时将首先看到此卡片内容。"
        type="info"
        showIcon={true}
        style={{ marginBottom: 16, background: '#f5f5f5', border: '1px solid #e8e8e8' }}
      />
      
      <Form.Item
        label="提示文本"
        name="promptText"
        rules={[{ required: true, message: '请输入提示文本' }]}
        extra="用户启动工作流时将看到此提示文本"
      >
        {loading ? (
          <Spin tip="加载变量列表..." />
        ) : (
          <VexWorkflowEditor
            ref={editorRef}
            variables={variables}
            placeholder="请输入向用户显示的提示文本..."
            defaultValue={initialConfig?.promptText || '这是工作流的起点'}
            onChange={handleEditorChange}
            minHeight="100px"
            workflowId={nodeId}
          />
        )}
      </Form.Item>

      {/* 添加工作流启用/禁用开关 */}
      <Form.Item 
        label="工作流状态" 
        name="isActive"
        help="控制工作流是否启用，关闭后工作流将不会被执行"
      >
        <Space>
          <Switch 
            checked={isActive} 
            onChange={handleActiveChange} 
            checkedChildren="启用" 
            unCheckedChildren="禁用"
          />
          <Text type={isActive ? "success" : "secondary"}>
            {isActive ? "工作流已启用" : "工作流已禁用"}
          </Text>
        </Space>
      </Form.Item>
      
      {/* 变量应用区域 */}
      <div 
        style={{ 
          background: '#f5f5f5', 
          padding: '16px', 
          borderRadius: '6px',
          marginTop: '16px',
          marginBottom: '16px',
          border: '1px solid #e8e8e8'
        }}
      >
        <Space>
          <Tag
            style={{
              backgroundColor: '#F9F0FF', // 工作流标准背景色（紫色）
              borderColor: '#722ED1', // 工作流标准边框色（紫色）
              color: '#722ED1', // 工作流标准文本颜色（紫色）
              fontSize: '12px',
              fontWeight: 500,
              padding: '4px 8px'
            }}
          >
            {(() => {
              // 获取工作流名称和ID
              const workflowName = workflowContext?.name || '未命名工作流';
              const formData = workflowContext?.prepareFormData?.() || {};
              let workflowId = '';
              
              if (formData && typeof formData === 'object' && 'id' in formData && formData.id) {
                workflowId = String(formData.id);
              }
              
              // 生成显示标识符
              if (workflowId) {
                const shortId = workflowId.substring(0, 4);
                return `@${workflowName}.startinput#${shortId}`;
              }
              
              // 如果没有工作流ID，使用默认格式
              return '@工作流名称.startinput#ID';
            })()}
          </Tag>
          <Text>是工作流运行时，用户首先输入的内容</Text>
        </Space>
      </div>
    </Form>
  );
};

export default StartNodeConfig;
