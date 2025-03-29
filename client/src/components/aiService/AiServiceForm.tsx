import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Collapse, InputNumber, Switch, Alert } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { AiService, AiServiceType, serviceConfigTemplates, getServiceTypeLabel } from '../../services/aiServiceService';

interface AiServiceFormProps {
  initialValues?: Partial<AiService>;
  onSubmit: (values: Omit<AiService, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTestConnection?: (values: Partial<AiService>) => Promise<{success: boolean, message: string}>;
  submitButtonText: string;
  loading?: boolean;
}

/**
 * AI服务表单组件，用于创建或编辑AI服务配置
 */
const AiServiceForm: React.FC<AiServiceFormProps> = ({
  initialValues,
  onSubmit,
  onTestConnection,
  submitButtonText = '保存',
  loading = false
}) => {
  const [form] = Form.useForm();
  const [serviceType, setServiceType] = useState<AiServiceType>(
    initialValues?.type || AiServiceType.DEEPSEEK
  );
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  
  // 当服务类型变化时，重置相关字段
  useEffect(() => {
    const template = serviceConfigTemplates[serviceType];
    
    // 更新默认模型
    form.setFieldsValue({ 
      defaultModel: template.defaultModel,
      // 如果不需要baseUrl，则清空
      ...(template.requiresBaseUrl ? {} : { baseUrl: undefined })
    });
    
    // 重置配置字段为默认值
    const defaultConfig = template.configFields.reduce((acc, field) => {
      acc[field.name] = field.defaultValue;
      return acc;
    }, {} as Record<string, any>);
    
    form.setFieldsValue({ config: defaultConfig });
  }, [serviceType, form]);
  
  // 处理表单提交
  const handleSubmit = (values: any) => {
    onSubmit({
      ...values,
      type: serviceType
    });
  };
  
  // 处理连接测试
  const handleTestConnection = async () => {
    try {
      // 获取当前表单值但不触发验证
      const values = form.getFieldsValue();
      
      setTestLoading(true);
      setTestResult(null);
      
      if (onTestConnection) {
        const result = await onTestConnection({
          ...values,
          type: serviceType,
          id: initialValues?.id
        });
        setTestResult(result);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: '测试失败：' + (error instanceof Error ? error.message : '未知错误')
      });
    } finally {
      setTestLoading(false);
    }
  };
  
  // 获取当前服务类型的配置模板
  const currentTemplate = serviceConfigTemplates[serviceType];
  
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues || {
        type: AiServiceType.DEEPSEEK,
        name: '',
        apiKey: '',
        baseUrl: currentTemplate.requiresBaseUrl ? 'https://api.deepseek.com' : undefined,
        defaultModel: currentTemplate.defaultModel,
        config: currentTemplate.configFields.reduce((acc, field) => {
          acc[field.name] = field.defaultValue;
          return acc;
        }, {} as Record<string, any>)
      }}
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        label="服务名称"
        name="name"
        rules={[{ required: true, message: '请输入服务名称' }]}
      >
        <Input placeholder="请输入服务名称，例如：我的DeepSeek服务" />
      </Form.Item>
      
      <Form.Item
        label="服务类型"
        name="type"
        rules={[{ required: true, message: '请选择服务类型' }]}
      >
        <Select
          onChange={(value) => setServiceType(value)}
          options={[
            { 
              value: AiServiceType.DEEPSEEK, 
              label: getServiceTypeLabel(AiServiceType.DEEPSEEK)
            },
            { 
              value: AiServiceType.ANTHROPIC, 
              label: getServiceTypeLabel(AiServiceType.ANTHROPIC)
            }
          ]}
          optionRender={(option) => (
            <Space>
              <ApiOutlined style={{ 
                color: option.value === AiServiceType.DEEPSEEK ? '#0078D7' : '#6B21A8' 
              }} />
              {option.label}
            </Space>
          )}
        />
      </Form.Item>
      
      <Form.Item
        label="API密钥"
        name="apiKey"
        rules={[{ required: true, message: '请输入API密钥' }]}
      >
        <Input.Password placeholder="请输入API密钥" />
      </Form.Item>
      
      {currentTemplate.requiresBaseUrl && (
        <Form.Item
          label="服务基础URL"
          name="baseUrl"
          rules={[{ required: true, message: '请输入服务基础URL' }]}
        >
          <Input placeholder={`例如: https://api.${serviceType}.com`} />
        </Form.Item>
      )}
      
      <Form.Item
        label="默认模型"
        name="defaultModel"
        rules={[{ required: true, message: '请选择默认模型' }]}
      >
        <Select
          options={currentTemplate.availableModels}
          placeholder="请选择默认使用的模型"
        />
      </Form.Item>
      
      <Collapse bordered={false} ghost>
        <Collapse.Panel header="高级配置" key="1">
          {currentTemplate.configFields.map(field => (
            <Form.Item
              key={field.name}
              label={field.label}
              name={['config', field.name]}
            >
              {field.type === 'number' ? (
                <InputNumber style={{ width: '100%' }} />
              ) : field.type === 'select' ? (
                <Select options={field.options} />
              ) : field.type === 'switch' ? (
                <Switch />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
        </Collapse.Panel>
      </Collapse>
      
      {testResult && (
        <Alert
          message={testResult.success ? "连接成功" : "连接失败"}
          description={testResult.message}
          type={testResult.success ? "success" : "error"}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{ backgroundColor: '#1A1F2C' }}
          >
            {submitButtonText}
          </Button>
          
          <Button
            type="default"
            onClick={handleTestConnection}
            loading={testLoading}
          >
            测试连接
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default AiServiceForm;
