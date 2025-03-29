import React, { useState } from 'react';
import { Form, Input, Button, Switch, Divider, Space, Typography } from 'antd';
import { CreateWorkflowParams } from '../../services/workflowService';

const { TextArea } = Input;
const { Title } = Typography;

interface WorkflowFormProps {
  initialValues?: Partial<CreateWorkflowParams>;
  onSubmit: (data: CreateWorkflowParams) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * 工作流表单组件
 * 用于创建和编辑工作流基本信息
 */
const WorkflowForm: React.FC<WorkflowFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? false);
  
  // 处理表单提交
  const handleSubmit = (values: CreateWorkflowParams) => {
    // 将isActive添加到表单值中
    const data = {
      ...values,
      isActive
    };
    
    onSubmit(data);
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues || {}}
      onFinish={handleSubmit}
      style={{ maxWidth: 600 }}
    >
      <Title level={4} style={{ marginBottom: 24, color: '#1A1F2C' }}>
        {initialValues?.name ? '编辑工作流' : '创建工作流'}
      </Title>
      
      {/* 基本信息 */}
      <Form.Item
        name="name"
        label="工作流名称"
        rules={[
          { required: true, message: '请输入工作流名称' },
          { max: 50, message: '名称最多50个字符' }
        ]}
      >
        <Input 
          placeholder="输入工作流名称" 
          style={{ borderRadius: '4px' }} 
        />
      </Form.Item>
      
      <Form.Item
        name="description"
        label="描述"
        rules={[
          { max: 500, message: '描述最多500个字符' }
        ]}
      >
        <TextArea 
          placeholder="输入工作流描述（可选）" 
          autoSize={{ minRows: 3, maxRows: 6 }}
        />
      </Form.Item>
      
      <Form.Item label="状态">
        <Space>
          <Switch 
            checked={isActive} 
            onChange={setIsActive} 
          />
          <span>{isActive ? '已启用' : '未启用'}</span>
        </Space>
      </Form.Item>
      
      {/* 元数据 */}
      <Divider orientation="left">高级设置</Divider>
      
      <Form.Item
        label="标签"
        name={['metadata', 'tags']}
        tooltip="用逗号分隔多个标签"
      >
        <Input placeholder="输入标签，用逗号分隔（可选）" />
      </Form.Item>
      
      <Form.Item
        label="版本"
        name={['metadata', 'version']}
        initialValue={1}
      >
        <Input disabled />
      </Form.Item>
      
      {/* 按钮 */}
      <Form.Item style={{ marginTop: 40 }}>
        <Space size="middle">
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            style={{ backgroundColor: '#1A1F2C', borderColor: '#1A1F2C' }}
          >
            {initialValues?.name ? '保存' : '创建'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default WorkflowForm;
