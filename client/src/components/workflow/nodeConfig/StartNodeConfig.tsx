import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Alert, Typography, Spin, Button, message } from 'antd';
import { NodeConfigProps } from './NodeConfigInterface';
import VexWorkflowEditor, { VexWorkflowEditorRef } from '../VexWorkflowEditor';
import { variableService, VariableType } from '../../../services/variableService';
import { workflowVariableService } from '../../../services/workflowVariableService';
import { workflowService } from '../../../services/workflowService';
import { useWorkflowEditor } from '../WorkflowEditorContext';
import { useVariableParser } from '../../../pages/demo/variable-editor-x/hooks/useVariableParser';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * 起点卡配置组件
 * 允许用户配置工作流的起始提示文本
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
  
  // 创建一个ref用于访问VexWorkflowEditor组件实例
  const editorRef = useRef<VexWorkflowEditorRef>(null);
  
  // 在组件顶层使用变量解析钩子
  const { parseText } = useVariableParser();
  
  // 使用状态跟踪是否已经设置过初始内容，避免重复设置
  const [contentInitialized, setContentInitialized] = useState(false);
  
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
  
  // 处理内容变化 - 优化以减少不必要的日志和状态更新
  const handleEditorChange = (value: string) => {
    // 只有当内容真正变化时才更新状态和记录
    if (value !== editorContent) {
      // 更新本地state
      setEditorContent(value);
      
      // 同时更新表单值，但避免不必要的重渲染
      form.setFieldsValue({ promptText: value });
      
      // 调试输出 - 使用更具体的标识符
      console.log(`[StartNodeConfig:${nodeId}] 编辑器内容更新`);
      
      // 直接更新工作流编辑器状态中的描述字段（实时同步）
      if (updateEditorState) {
        console.log(`[StartNodeConfig] 更新工作流描述字段:`, {
          contentLength: value?.length || 0,
          preview: value?.substring(0, 30) + '...'
        });
        updateEditorState('description', value);
      }
    }
  };
  
  // 获取工作流编辑器上下文
  const workflowContext = useWorkflowEditor();
  
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
    
    // 输出调试信息
    console.log(`[StartNodeConfig:${nodeId}] 表单提交内容:`, values.promptText);
    console.log(`[StartNodeConfig:${nodeId}] 编辑器内容:`, finalPromptText);
    console.log(`[StartNodeConfig:${nodeId}] 最终使用内容长度:`, finalPromptText?.length || 0);
    
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
        
        // 记录包含系统标识符的原始文本
        console.log(`[StartNodeConfig:${nodeId}] 原始文本(含变量标识符):`, {
          rawTextLength: rawText?.length || 0,
          rawTextPreview: rawText?.substring(0, 50) + '...'
        });
        
        // 第二步：使用变量解析器解析变量标识符
        try {
          // 直接使用parseText方法解析原始文本
          const resolvedContent = await parseText(rawText);
          if (resolvedContent) {
            console.log(`[StartNodeConfig:${nodeId}] 成功解析变量内容:`, {
              resolvedLength: resolvedContent.length,
              resolvedPreview: resolvedContent.substring(0, 50) + '...'
            });
            // 使用解析后的内容替换parsedContent
            parsedContent = resolvedContent;
          } else {
            console.warn(`[StartNodeConfig:${nodeId}] 解析内容为空，将使用原始文本`);
            // 如果解析失败，回退到使用原始文本
            parsedContent = rawText;
          }
        } catch (resolveError) {
          console.error(`[StartNodeConfig:${nodeId}] 解析变量标识符错误:`, resolveError);
          // 如果解析过程出错，回退到使用原始文本
          parsedContent = rawText;
        }
      }
      
      // 从prepareFormData结果中获取工作流ID
      const formData = workflowContext?.prepareFormData?.() || {};
      let workflowId = '';
      
      // 记录详细的formData信息，帮助调试
      console.log('[StartNodeConfig] prepareFormData结果:', {
        hasFormData: !!formData,
        formDataType: typeof formData,
        formDataKeys: formData ? Object.keys(formData) : [],
        hasId: formData && 'id' in formData,
        idValue: formData && 'id' in formData ? formData.id : 'undefined'
      });
      
      // 优先使用表单数据中的ID，这通常是正确的UUID格式
      if (formData && typeof formData === 'object') {
        // 如果存在id属性则使用
        if ('id' in formData && formData.id) {
          workflowId = String(formData.id);
          console.log(`[StartNodeConfig] 从formData获取到工作流ID: ${workflowId}`);
        }
      }
      
      // 我们已经尝试从prepareFormData获取了ID，但如果没找到，可以查看表单数据中是否有其他线索
      if (!workflowId && workflowContext) {
        // 记录实际可用的上下文属性，用于调试
        console.log(`[StartNodeConfig] 工作流上下文属性:`, Object.keys(workflowContext));
        
        // 通过formData进一步探测
        try {
          const rawFormData = workflowContext.prepareFormData?.();
          if (rawFormData) {
            console.log(`[StartNodeConfig] 完整formData:`, rawFormData);
            
            // 递归搜索对象中可能存在的id字段
            const findId = (obj: any, depth = 0): string | null => {
              if (!obj || depth > 3) return null; // 限制递归深度
              if (typeof obj !== 'object') return null;
              
              // 直接检查是否有id字段
              if ('id' in obj && typeof obj.id === 'string' && obj.id) {
                return obj.id;
              }
              
              // 递归检查所有子对象
              for (const key in obj) {
                if (typeof obj[key] === 'object') {
                  const foundId = findId(obj[key], depth + 1);
                  if (foundId) return foundId;
                }
              }
              
              return null;
            };
            
            const deepSearchId = findId(rawFormData);
            if (deepSearchId) {
              workflowId = deepSearchId;
              console.log(`[StartNodeConfig] 通过深度搜索找到ID: ${workflowId}`);
            }
          }
        } catch (idErr) {
          console.error(`[StartNodeConfig] 尝试深度搜索ID时出错:`, idErr);
        }
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
        contentLength: parsedContent?.length || 0,
        contentPreview: parsedContent?.substring(0, 50) + '...'
      });
      
      if (workflowId && workflowName) {
        try {
          // 显示更新中提示
          const updateMessageKey = `update-workflow-${Date.now()}`;
          message.loading({ content: '正在保存工作流描述...', key: updateMessageKey, duration: 0 });
          
          console.log(`[StartNodeConfig] 开始更新工作流描述 - 详细信息:`, {
            workflowId,
            workflowName,
            contentLength: parsedContent?.length || 0,
            contentPreview: parsedContent?.substring(0, 50) + '...',
            containsVariableId: parsedContent?.includes('@gv_') || false,
            isResolved: !parsedContent?.includes('@gv_'),
            timestamp: new Date().toISOString()
          });

          // 1. 更新工作流的description变量
          console.log(`[StartNodeConfig] 调用 workflowVariableService.createOrUpdateWorkflowVariable...`);
          const varUpdateStart = Date.now();
          const varResult = await workflowVariableService.createOrUpdateWorkflowVariable(
            workflowId,
            workflowName,
            'description', // 变量字段名
            parsedContent // 使用解析后的内容
          );
          const varUpdateDuration = Date.now() - varUpdateStart;
          console.log(`[StartNodeConfig] 变量更新完成，耗时: ${varUpdateDuration}ms, 结果:`, varResult);
          
          // 2. 同时更新工作流对象自身的description属性
          console.log(`[StartNodeConfig] 调用 workflowService.updateWorkflow 更新工作流 ${workflowId} 的 description 属性...`);
          const wfUpdateStart = Date.now();
          
          const updateResult = await workflowService.updateWorkflow(workflowId, {
            description: parsedContent
          });
          
          const wfUpdateDuration = Date.now() - wfUpdateStart;
          console.log(`[StartNodeConfig] 工作流对象更新完成，耗时: ${wfUpdateDuration}ms, 结果:`, updateResult);
          
          // 验证更新是否成功
          if (updateResult.description !== parsedContent) {
            console.warn(`[StartNodeConfig] ⚠️ 警告: 工作流描述可能未正确更新!`, {
              expectedLength: parsedContent?.length || 0,
              actualLength: updateResult.description?.length || 0,
              expected: parsedContent?.substring(0, 100) + '...',
              actual: updateResult.description?.substring(0, 100) + '...'
            });
            
            // 更新警告
            message.warning({ 
              content: '工作流描述已保存，但可能需要重新检查内容', 
              key: updateMessageKey,
              duration: 3
            });
          } else {
            // 更新成功提示
            message.success({ 
              content: '工作流描述保存成功', 
              key: updateMessageKey,
              duration: 2
            });
          }
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
          console.error('[StartNodeConfig] ❌ 工作流描述更新失败:', error);
          console.error('[StartNodeConfig] 错误详情:', {
            message: typedError.message || '未知错误',
            stack: typedError.stack?.substring(0, 200) || '无堆栈信息',
            status: typedError.response?.status,
            statusText: typedError.response?.statusText,
            responseData: typedError.response?.data
          });
          
          // 显示错误消息给用户
          message.error({
            content: `保存工作流描述失败: ${typedError.message || '未知错误'}`,
            duration: 5
          });
          
          // 打开浏览器控制台
          console.log('[StartNodeConfig] 请查看浏览器控制台(F12)获取更多错误信息');
        }
      } else {
        console.warn('[StartNodeConfig] 无法更新工作流描述，缺少工作流ID或名称');
        message.warning('无法更新工作流描述，缺少工作流标识或名称');
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

      {/* 移除变量引用提示，优化界面空间 */}

      {/* 移除独立的保存按钮，使用Modal底部按钮统一保存 */}
    </Form>
  );
};

export default StartNodeConfig;
