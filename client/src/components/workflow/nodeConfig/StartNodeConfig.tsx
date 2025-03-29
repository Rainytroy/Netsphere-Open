import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Alert, Typography, Spin, Button } from 'antd';
import { NodeConfigProps } from './NodeConfigInterface';
import VariableEditor2, { VariableEditorRef } from '../../../components/variable';
import { variableService, VariableType } from '../../../services/variableService';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * 起点卡配置组件
 * 允许用户配置工作流的起始提示文本
 */
const StartNodeConfig: React.FC<NodeConfigProps> = ({
  nodeId,
  initialConfig,
  onSave
}) => {
  // 创建表单引用
  const [form] = Form.useForm();
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorContent, setEditorContent] = useState<string>(initialConfig?.promptText || '这是工作流的起点');
  
  // 创建一个ref用于访问VariableEditor组件实例
  const editorRef = useRef<VariableEditorRef>(null);
  
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
    }
  };
  
  // 优化表单提交处理，确保正确获取和提交内容
  const handleFormSubmit = (values: any) => {
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
          <VariableEditor2
            ref={editorRef}
            variables={variables}
            placeholder="请输入向用户显示的提示文本..."
            defaultValue={initialConfig?.promptText || '这是工作流的起点'}
            onChange={handleEditorChange}
            minHeight="100px"
          />
        )}
      </Form.Item>

      <Alert
        message="变量引用"
        description={
          <div>
            <Text>起点卡的输入可通过以下格式的变量引用：</Text>
            <Text code>@工作流名称.start</Text>
            <div style={{ marginTop: 4 }}>
              <Text>例如，若工作流名称为"数据处理"，则引用格式为：</Text>
              <Text code>@数据处理.start</Text>
            </div>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 移除独立的保存按钮，使用Modal底部按钮统一保存 */}
    </Form>
  );
};

export default StartNodeConfig;
