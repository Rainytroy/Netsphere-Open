import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Radio, Alert, Typography, Spin } from 'antd';
import { NodeConfigProps } from './NodeConfigInterface';
import VariableEditor2, { VariableEditorRef } from '../../../components/variable';
import { variableService } from '../../../services/variableService';

const { Text } = Typography;

/**
 * 展示卡配置组件
 * 允许用户配置需要展示的变量和展示方式
 */
const DisplayNodeConfig: React.FC<NodeConfigProps> = ({
  nodeId,
  initialConfig,
  onSave
}) => {
  const [form] = Form.useForm();
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [variablePathContent, setVariablePathContent] = useState<string>(initialConfig?.variablePath || '');
  
  // 创建一个ref用于访问VariableEditor组件实例
  const editorRef = useRef<VariableEditorRef>(null);
  
  // 使用状态跟踪是否已经设置过初始内容，避免重复设置
  const [contentInitialized, setContentInitialized] = useState(false);
  
  // 分离内容初始化和焦点处理，确保只发生一次内容初始化
  useEffect(() => {
    // 只有当编辑器ref可用且内容尚未初始化时执行
    if (editorRef.current && !contentInitialized) {
      const currentContent = initialConfig?.variablePath || '';
      
      if (currentContent) {
        console.log('[DisplayNodeConfig] 初始化编辑器内容:', currentContent);
        // 设置编辑器内容并更新state
        editorRef.current.updateContent(currentContent);
        setContentInitialized(true);
      }
    }
  }, [editorRef.current, contentInitialized, initialConfig]);
  
  // 单独处理焦点，延迟更长以确保Modal和编辑器完全渲染
  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      try {
        // 使用更可靠的方式查找编辑器元素并设置焦点
        if (editorRef.current) {
          console.log('[DisplayNodeConfig] 尝试设置编辑器焦点');
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
        console.error('[DisplayNodeConfig] 设置焦点失败:', error);
      }
    }, 500); // 使用更长的延迟确保Modal完全渲染
    
    // 清理函数，避免重复设置焦点
    return () => {
      clearTimeout(focusTimeout);
    };
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
    // 设置初始变量路径到state
    setVariablePathContent(initialConfig?.variablePath || '');
    
    // 设置表单初始值
    form.setFieldsValue({
      variablePath: initialConfig?.variablePath || '',
      displayMode: initialConfig?.displayMode || 'direct'
    });
  }, [form, initialConfig]);
  
  // 处理变量路径变化 - 优化以减少不必要的状态更新
  const handleVariablePathChange = (value: string) => {
    // 只有当内容真正变化时才更新状态和记录
    if (value !== variablePathContent) {
      // 更新本地state
      setVariablePathContent(value);
      
      // 同时更新表单值，但避免不必要的重渲染
      form.setFieldsValue({ variablePath: value });
      
      // 调试输出 - 使用更具体的标识符
      console.log(`[DisplayNodeConfig:${nodeId}] 变量路径已更新`);
    }
  };

  // 移除焦点管理代码，避免修改编辑器组件
  
  // 处理表单提交 - 优化确保获取正确内容
  const handleFormSubmit = (values: any) => {
    // 获取编辑器中的实际变量路径内容
    let finalVariablePath = variablePathContent;
    
    // 内容验证
    if (finalVariablePath === undefined || finalVariablePath === null) {
      console.error(`[DisplayNodeConfig:${nodeId}] 变量路径内容无效:`, finalVariablePath);
      // 回退到表单值
      finalVariablePath = values.variablePath || '';
    }
    
    // 输出详细调试信息
    console.log(`[DisplayNodeConfig:${nodeId}] 表单提交变量路径:`, values.variablePath);
    console.log(`[DisplayNodeConfig:${nodeId}] 编辑器当前变量路径:`, variablePathContent);
    console.log(`[DisplayNodeConfig:${nodeId}] 最终使用变量路径:`, finalVariablePath);
    
    // 构建最终配置 - 始终优先使用编辑器内容
    const config = {
      ...initialConfig,
      variablePath: finalVariablePath,
      displayMode: values.displayMode
    };
    
    // 调用保存回调
    onSave(nodeId, config);
  };

  return (
    <Form 
      form={form}
      layout="vertical"
      id={`node-config-form-${nodeId}`}
      onFinish={handleFormSubmit}
    >
      <Alert
        message="展示卡说明"
        description="展示卡用于在系统输出区显示变量内容。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Form.Item
        label="展示内容"
        name="variablePath"
        rules={[{ required: true, message: '请输入展示内容' }]}
        extra="要展示的变量路径，例如 @workflow.start 或 @taskName.output"
      >
        {loading ? (
          <Spin tip="加载变量列表..." />
        ) : (
          <VariableEditor2
            ref={editorRef}
            variables={variables}
            placeholder="选择或输入变量路径，例如: @taskName.output"
            defaultValue={initialConfig?.variablePath || ''}
            onChange={handleVariablePathChange}
            minHeight="50px"
          />
        )}
      </Form.Item>
      
      <Form.Item
        label="显示方式"
        name="displayMode"
        rules={[{ required: true, message: '请选择显示方式' }]}
      >
        <Radio.Group>
          <Radio value="direct">直接显示</Radio>
          <Radio value="generative">生成式显示</Radio>
        </Radio.Group>
      </Form.Item>
      
      <Alert
        message="显示方式说明"
        description={
          <div>
            <p><Text strong>直接显示：</Text> 直接输出变量内容，不做任何处理</p>
            <p><Text strong>生成式显示：</Text> 以更友好的方式展示内容，适用于复杂结构数据</p>
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

export default DisplayNodeConfig;
