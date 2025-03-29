import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import { Form, Input, Typography, FormInstance, Switch, Row, Col, Space, Tag } from 'antd';
import createLogger from '../../../utils/logger';
import { VariableEditorXRef, VariableData } from '../../../components/VariableEditorXWrapper';
import VexPromptEditor, { VexPromptEditorRef } from '../VexPromptEditor';

const { Title, Text } = Typography;

// 创建日志实例
const logger = createLogger('TaskInputSection');

interface TaskInputSectionProps {
  form: FormInstance;
  inputEditorRef: React.RefObject<VariableEditorXRef>;
  handleInputChange: (content: string) => void;
  handleStatusChange?: (isActive: boolean) => void;
}

/**
 * 工作任务表单的输入区域组件
 * 包含名称字段和输入编辑器
 */
const TaskInputSection: React.FC<TaskInputSectionProps> = ({
  form,
  inputEditorRef,
  handleInputChange,
  handleStatusChange
}) => {
  // 创建内部ref用于操作VexPromptEditor
  const vexEditorRef = useRef<VexPromptEditorRef>(null);
  
  // 使用forwardRef转发功能，将VexPromptEditor的功能桥接到外部inputEditorRef
  useImperativeHandle(inputEditorRef, () => ({
    // 实现VariableEditorXRef接口所需的方法
    insertVariable: (variable: VariableData) => {
      if (vexEditorRef.current) {
        logger.info('通过适配器插入变量:', variable);
        vexEditorRef.current.insertVariable(variable);
      }
    },
    getContent: () => {
      if (vexEditorRef.current) {
        const richContent = vexEditorRef.current.getRichContent();
        return richContent.html || '';
      }
      return '';
    },
    getRawText: () => {
      if (vexEditorRef.current) {
        const rawContent = vexEditorRef.current.getRawContent() || '';
        logger.debug('获取原始文本:', {
          length: rawContent.length,
          preview: rawContent.substring(0, 50) + (rawContent.length > 50 ? '...' : ''),
          hasSystemIdentifiers: rawContent.includes('@gv_')
        });
        return rawContent;
      }
      return '';
    },
    getResolvedContent: async () => {
      // 简单返回原始内容，因为VexPromptEditor没有对应方法
      if (vexEditorRef.current) {
        return vexEditorRef.current.getRawContent() || '';
      }
      return '';
    },
    focusEditor: () => {
      // VexPromptEditor没有直接的focus方法
    },
    clearContent: () => {
      if (vexEditorRef.current) {
        vexEditorRef.current.updateContent('');
      }
    },
    refreshVariables: async () => {
      // VexPromptEditor可能没有刷新变量的方法
      logger.warn('尝试刷新变量，但VexPromptEditor不支持此方法');
    },
    setContent: (content: string) => {
      if (vexEditorRef.current) {
        logger.debug('设置编辑器内容:', {
          length: content.length,
          preview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          hasSystemIdentifiers: content.includes('@gv_')
        });
        vexEditorRef.current.updateContent(content);
      }
    },
    getUsedVariables: () => [],
    setLoading: () => {}
  }), []);

  // 使用本地状态管理开关状态
  const [switchChecked, setSwitchChecked] = useState<boolean>(form.getFieldValue('status') !== 'archived');
  
  // 当组件加载时初始化开关状态
  useEffect(() => {
    const currentStatus = form.getFieldValue('status');
    setSwitchChecked(currentStatus !== 'archived');
  }, []);
  
  // 增强版handleInputChange，添加日志记录
  const handleContentChange = (content: string) => {
    logger.debug('内容变更:', {
      length: content.length,
      preview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      hasSystemIdentifiers: content.includes('@gv_')
    });
    
    // 调用父组件回调
    handleInputChange(content);
  };
  
  // 状态切换处理函数
  const handleStatusToggle = (checked: boolean) => {
    // 更新本地状态
    setSwitchChecked(checked);
    
    // 更新表单值
    const status = checked ? 'active' : 'archived';
    form.setFieldsValue({ status });
    
    // 调用父组件回调
    if (handleStatusChange) {
      handleStatusChange(checked);
    }
  };

  return (
    <>
      {/* 名称区域和状态切换开关 */}
      <Row align="middle" style={{ marginBottom: 8 }}>
        <Col span={12}>
          <Title level={5} style={{ margin: 0 }}>名称</Title>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Space align="center">
            <Text>状态:</Text>
            {/* 状态切换开关 - 脱离Form控制 */}
            <Switch
              checkedChildren="发布"
              unCheckedChildren="存档"
              checked={switchChecked}
              onChange={handleStatusToggle}
            />
          </Space>
        </Col>
      </Row>
      
      <Form.Item
        name="name"
        rules={[{ required: true, message: '请输入任务名称' }]}
      >
        <Input placeholder="请输入任务名称" />
      </Form.Item>
      
      {/* 输入区域 */}
      <Title level={5}>输入 / INPUT</Title>
      <Form.Item
        name="input"
        rules={[{ 
          required: true, 
          message: '请输入内容',
          validator: (_, value) => {
            // 改进验证逻辑：只有真正没有内容时才提示错误
            if (!value || value.trim() === '') {
              return Promise.reject('请输入内容');
            }
            return Promise.resolve();
          }
        }]}
        style={{ marginBottom: '24px' }}
      >
        <VexPromptEditor
          ref={vexEditorRef}
          defaultValue={form.getFieldValue('input') || ''}
          onChange={handleContentChange}
          placeholder="请输入需要NPC处理的内容，可以引用其他全局变量，使用@符号触发变量选择"
          minHeight={180}
          style={{ 
            width: '100%', 
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            minHeight: '180px'
          }}
        />
      </Form.Item>
    </>
  );
};

export default TaskInputSection;
