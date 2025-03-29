import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Typography, Select, InputNumber, Divider, Spin } from 'antd';
import { NodeConfigProps } from './NodeConfigInterface';
import { variableService } from '../../../services/variableService';
import VariableSelector from '../../../components/variable/VariableSelector';

const { Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * 循环卡配置组件
 * 允许用户配置循环条件和分支行为
 */
const LoopNodeConfig: React.FC<NodeConfigProps> = ({
  nodeId,
  initialConfig,
  onSave
}) => {
  const [form] = Form.useForm();
  const [conditionType, setConditionType] = useState<string>(
    initialConfig?.conditionType || 'runCount'
  );
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [variablePath, setVariablePath] = useState<string>(
    initialConfig?.conditionConfig?.variablePath || ''
  );
  
  // VariableSelector不需要ref
  
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
    const formValues = {
      conditionType: initialConfig?.conditionType || 'runCount',
      maxRuns: initialConfig?.conditionConfig?.maxRuns || 3,
      variablePath: initialConfig?.conditionConfig?.variablePath || '',
      expectedValue: initialConfig?.conditionConfig?.expectedValue || ''
    };
    
    // 设置变量路径状态
    setVariablePath(formValues.variablePath);
    
    // 设置表单值
    form.setFieldsValue(formValues);
    setConditionType(formValues.conditionType);
  }, [form, initialConfig]);

  // 处理条件类型变更
  const handleConditionTypeChange = (value: string) => {
    setConditionType(value);
  };
  
  // 处理变量路径变化
  const handleVariablePathChange = (value: string) => {
    // 更新本地state
    setVariablePath(value);
    
    // 同时更新表单值
    form.setFieldsValue({ 
      variablePath: value 
    });
    
    // 调试输出
    console.log('变量路径已更新:', value);
  };
  
  // 验证变量合法性
  const validateVariableReference = (value: string) => {
    if (!value) return Promise.reject(new Error('变量引用不能为空'));
    
    // 检查是否是标准变量格式 @xxx.yyy
    const isValidFormat = /^@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+$/.test(value);
    if (!isValidFormat) {
      return Promise.reject(new Error('必须是有效的变量引用格式: @source.field'));
    }
    
    return Promise.resolve();
  };

  // 获取当前条件类型的说明文本
  const getConditionDescription = () => {
    if (conditionType === 'runCount') {
      return (
        <div>
          <Text strong>运行次数条件说明：</Text>
          <Paragraph>
            当前运行次数小于设定的最大运行次数时，条件满足，执行"Yes"分支；
            当运行次数达到或超过最大值时，条件不满足，执行"No"分支。
          </Paragraph>
          <Paragraph>
            <div><Text mark>绿色连接（Yes）：</Text> 循环继续</div>
            <div><Text mark>红色连接（No）：</Text> 循环结束</div>
          </Paragraph>
        </div>
      );
    } else if (conditionType === 'variableValue') {
      return (
        <div>
          <Text strong>变量值条件说明：</Text>
          <Paragraph>
            当选中的变量值等于设定的期望值时，条件满足，执行"Yes"分支；
            当变量值不等于期望值时，条件不满足，执行"No"分支。
          </Paragraph>
          <Paragraph>
            <div><Text mark>绿色连接（Yes）：</Text> 条件成立</div>
            <div><Text mark>红色连接（No）：</Text> 条件不成立</div>
          </Paragraph>
        </div>
      );
    }
    
    return null;
  };

  // 处理表单提交
  const handleFormSubmit = (values: any) => {
    // 根据条件类型构建条件配置
    const conditionConfig: any = {};
    
    if (values.conditionType === 'runCount') {
      conditionConfig.maxRuns = values.maxRuns;
    } else if (values.conditionType === 'variableValue') {
      // 使用最新的变量路径状态
      conditionConfig.variablePath = variablePath || values.variablePath;
      conditionConfig.expectedValue = values.expectedValue;
      
      // 调试输出
      console.log('提交的变量路径:', conditionConfig.variablePath);
    }
    
    const config = {
      ...initialConfig,
      conditionType: values.conditionType,
      conditionConfig
    };
    
    // 调用保存回调
    onSave(nodeId, config);
  };

  if (loading && conditionType === 'variableValue') {
    return <Spin tip="加载变量列表..." />;
  }

  return (
    <Form 
      form={form}
      layout="vertical"
      id={`node-config-form-${nodeId}`}
      onFinish={handleFormSubmit}
    >
      <Alert
        message="循环卡说明"
        description="循环卡用于控制工作流的执行流向，根据条件决定走Yes或No分支。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Form.Item
        label="条件类型"
        name="conditionType"
        rules={[{ required: true, message: '请选择条件类型' }]}
      >
        <Select onChange={handleConditionTypeChange}>
          <Option value="runCount">运行次数</Option>
          <Option value="variableValue">变量值</Option>
        </Select>
      </Form.Item>
      
      {conditionType === 'runCount' && (
        <Form.Item
          label="最大运行次数"
          name="maxRuns"
          rules={[{ required: true, message: '请输入最大运行次数' }]}
          extra="循环将执行指定的次数"
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      )}
      
      {conditionType === 'variableValue' && (
        <>
          <Form.Item
            label="变量路径"
            name="variablePath"
            rules={[
              { required: true, message: '请选择变量' },
              { validator: (_, value) => validateVariableReference(value) }
            ]}
            extra="要比较的变量，选择一个全局变量"
          >
            <VariableSelector
              placeholder="选择变量，例如: @workflow.start"
              value={variablePath}
              onChange={(value: string) => handleVariablePathChange(value)}
            />
          </Form.Item>
          
          <Form.Item
            label="期望值"
            name="expectedValue"
            rules={[{ required: true, message: '请输入期望值' }]}
            extra="当变量等于此值时条件满足，执行Yes分支"
          >
            <Input placeholder="输入期望的变量值" />
          </Form.Item>
        </>
      )}
      
      <Divider />
      
      <Alert
        message="分支流向说明"
        description={getConditionDescription()}
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 移除独立的保存按钮，使用Modal底部按钮统一保存 */}
    </Form>
  );
};

export default LoopNodeConfig;
