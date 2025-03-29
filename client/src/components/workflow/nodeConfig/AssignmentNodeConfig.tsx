import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Typography, Divider, Row, Col, Spin } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { NodeConfigProps } from './NodeConfigInterface';
import { variableService } from '../../../services/variableService';
import VariableSelector from '../../../components/variable/VariableSelector';

const { Text } = Typography;

// 定义赋值规则接口
interface AssignmentRule {
  sourceVariable: string;
  targetVariable: string;
}

/**
 * 赋值卡配置组件
 * 允许用户添加多条变量赋值规则
 */
const AssignmentNodeConfig: React.FC<NodeConfigProps> = ({
  nodeId,
  initialConfig,
  onSave
}) => {
  const [form] = Form.useForm();
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 跟踪当前编辑的赋值规则
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>(
    initialConfig?.assignments || [{ sourceVariable: '', targetVariable: '' }]
  );
  
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
    const initialAssignments = initialConfig?.assignments || [{ sourceVariable: '', targetVariable: '' }];
    setAssignmentRules(initialAssignments);
    
    form.setFieldsValue({
      assignments: initialAssignments
    });
  }, [form, initialConfig]);
  
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
  
  // 处理变量路径变化（源变量）
  const handleSourceVariableChange = (value: string, index: number) => {
    // 更新内部状态
    const newRules = [...assignmentRules];
    newRules[index] = {
      ...newRules[index],
      sourceVariable: value
    };
    setAssignmentRules(newRules);
    
    // 更新表单值
    const formValues = form.getFieldsValue();
    const assignments = formValues.assignments || [];
    assignments[index] = {
      ...assignments[index],
      sourceVariable: value
    };
    form.setFieldsValue({ assignments });
    
    // 调试输出
    console.log(`源变量[${index}]已更新:`, value);
  };
  
  // 处理变量路径变化（目标变量）
  const handleTargetVariableChange = (value: string, index: number) => {
    // 更新内部状态
    const newRules = [...assignmentRules];
    newRules[index] = {
      ...newRules[index],
      targetVariable: value
    };
    setAssignmentRules(newRules);
    
    // 更新表单值
    const formValues = form.getFieldsValue();
    const assignments = formValues.assignments || [];
    assignments[index] = {
      ...assignments[index],
      targetVariable: value
    };
    form.setFieldsValue({ assignments });
    
    // 调试输出
    console.log(`目标变量[${index}]已更新:`, value);
  };
  
  // 处理添加一条赋值规则
  const handleAddRule = () => {
    const newRule = { sourceVariable: '', targetVariable: '' };
    setAssignmentRules([...assignmentRules, newRule]);
    
    const formValues = form.getFieldsValue();
    const assignments = formValues.assignments || [];
    assignments.push(newRule);
    form.setFieldsValue({ assignments });
  };
  
  // 处理删除一条赋值规则
  const handleRemoveRule = (index: number) => {
    const newRules = [...assignmentRules];
    newRules.splice(index, 1);
    setAssignmentRules(newRules);
    
    const formValues = form.getFieldsValue();
    const assignments = formValues.assignments || [];
    assignments.splice(index, 1);
    form.setFieldsValue({ assignments });
  };
  
  // 处理表单提交
  const handleFormSubmit = (values: any) => {
    // 使用最新的赋值规则状态
    // 过滤掉空的赋值规则
    const validRules = assignmentRules.filter(
      (rule) => rule.sourceVariable && rule.targetVariable
    );
    
    // 调试输出
    console.log('表单提交的赋值规则:', values.assignments);
    console.log('内部状态的赋值规则:', assignmentRules);
    console.log('最终使用的有效赋值规则:', validRules);
    
    // 构建最终配置
    const config = {
      ...initialConfig,
      assignments: validRules
    };
    
    // 调用保存回调
    onSave(nodeId, config);
  };

  if (loading) {
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
        message="赋值卡说明"
        description="赋值卡用于将一个变量的值赋给另一个变量，可以添加多条赋值规则。必须使用变量选择器选择有效的变量。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Text strong>赋值规则</Text>
      <div>
        {assignmentRules.map((rule, index) => (
          <div key={index} style={{ marginBottom: 16 }}>
            <Row gutter={8} align="middle">
              <Col span={10}>
                <Form.Item
                  name={['assignments', index, 'sourceVariable']}
                  rules={[
                    { required: true, message: '请选择源变量' },
                    { validator: (_, value) => validateVariableReference(value) }
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <VariableSelector
                    placeholder="选择源变量"
                    value={rule.sourceVariable}
                    onChange={(value: string) => handleSourceVariableChange(value, index)}
                  />
                </Form.Item>
              </Col>
              <Col span={4} style={{ textAlign: 'center' }}>
                <Text>=</Text>
              </Col>
              <Col span={10}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Item
                    name={['assignments', index, 'targetVariable']}
                    rules={[
                      { required: true, message: '请选择目标变量' },
                      { validator: (_, value) => validateVariableReference(value) }
                    ]}
                    style={{ marginBottom: 0, flex: 1 }}
                  >
                    <VariableSelector
                      placeholder="选择目标变量"
                      value={rule.targetVariable}
                      onChange={(value: string) => handleTargetVariableChange(value, index)}
                    />
                  </Form.Item>
                  {assignmentRules.length > 1 && (
                    <MinusCircleOutlined
                      className="dynamic-delete-button"
                      onClick={() => handleRemoveRule(index)}
                      style={{ marginLeft: 8, color: '#ff4d4f' }}
                    />
                  )}
                </div>
              </Col>
            </Row>
          </div>
        ))}
        <Form.Item>
          <Button
            type="dashed"
            onClick={handleAddRule}
            block
            icon={<PlusOutlined />}
          >
            添加赋值规则
          </Button>
        </Form.Item>
      </div>

      <Alert
        message="变量格式说明"
        description={
          <div>
            <p>变量引用格式为 <Text code>@source.field</Text>，例如：</p>
            <ul>
              <li><Text code>@workflow.start</Text> - 工作流起点输入</li>
              <li><Text code>@taskName.output</Text> - 工作任务输出</li>
              <li><Text code>@nodeId.output</Text> - 节点输出</li>
            </ul>
            <p>请使用变量选择器（@触发）选择变量，而不是手动输入，以确保变量格式正确。</p>
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

export default AssignmentNodeConfig;
