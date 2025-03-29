import React from 'react';
import { Form, Input, Button } from 'antd';
import { Variable } from '../../services/variableService';

interface VariableFormProps {
  initialValues?: Partial<Variable>;
  onSubmit: (values: { name: string; value: string }) => void;
  submitButtonText: string;
  loading?: boolean;
}

/**
 * 变量表单组件，用于创建或编辑变量
 */
const VariableForm: React.FC<VariableFormProps> = ({
  initialValues,
  onSubmit,
  submitButtonText = '创建',
  loading = false
}) => {
  const [form] = Form.useForm();
  
  const handleSubmit = (values: { name: string; value: string }) => {
    onSubmit(values);
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        label="变量名称"
        name="name"
        rules={[
          { required: true, message: '请输入变量名称' },
          { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_]+$/, message: '变量名称只能包含字母、数字、汉字和下划线' }
        ]}
      >
        <Input placeholder="请输入变量名称（将用于生成标识符）" />
      </Form.Item>
      
      <Form.Item
        label="变量值"
        name="value"
        rules={[{ required: true, message: '请输入变量的值' }]}
      >
        <Input.TextArea rows={6} placeholder="请输入变量的值" />
      </Form.Item>
      
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          style={{ backgroundColor: '#1A1F2C' }}
        >
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default VariableForm;
