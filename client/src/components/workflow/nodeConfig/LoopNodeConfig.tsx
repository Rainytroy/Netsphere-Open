import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Typography, Select, InputNumber, Divider, Spin, Tag } from 'antd';
import { RetweetOutlined, SearchOutlined } from '@ant-design/icons';
import { NodeConfigProps } from './NodeConfigInterface';
import { variableService, VariableType } from '../../../services/variableService';
import VariableSelectorModal from '../../../pages/demo/variable-editor-x/components/VariableSelectorModal';
import { VariableData } from '../../../pages/demo/variable-editor-x/types';
import IdentifierFormatterService from '../../../services/IdentifierFormatterService';
import VariableThemeService from '../../../services/VariableThemeService';

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
  
  // VEX变量选择器状态
  const [modalVisible, setModalVisible] = useState(false);
  
  // 维护变量类型映射，用于应用正确的样式
  const [variableTypeMap, setVariableTypeMap] = useState<Record<string, string>>(
    initialConfig?.variableTypes || {}
  );
  
  // 维护系统标识符到显示标识符的映射，用于UI显示
  const [displayIdMap, setDisplayIdMap] = useState<Record<string, string>>(
    initialConfig?.displayIdMap || {}
  );
  
  // 从VexWorkflowEditor借用的变量转换函数
  const convertToVexVariable = (variable: any): VariableData => {
    // 基础变量信息
    const baseVariable = {
      id: variable.id || variable.sourceId || '',
      field: variable.field || variable.name || '',  // 正确保留原始field字段
      sourceName: variable.sourceName || variable.source?.name || 'Unknown',
      sourceType: variable.type || variable.source?.type || 'custom',
      value: variable.value || '',
      displayIdentifier: variable.displayIdentifier,
    };
    
    // 如果没有提供displayIdentifier，需要构建一个
    if (!baseVariable.displayIdentifier) {
      // 从ID中提取entityId (与前面的逻辑保持一致)
      let entityId = baseVariable.id;
      const idParts = baseVariable.id.split('_');
      
      if (idParts.length >= 3) {
        // type_entityId_fieldname 格式：中间部分是entityId
        entityId = idParts.slice(1, -1).join('_');
      } else if (idParts.length === 2) {
        // entityId_fieldname 格式：第一部分是entityId
        entityId = idParts[0];
      }
      
      // 获取entityId的前4位作为shortId
      const shortId = entityId.substring(0, 4);
      
      // 构建标准格式的显示标识符
      baseVariable.displayIdentifier = `@${baseVariable.sourceName}.${baseVariable.field}#${shortId}`;
    }
    
    // 添加getter方法用于生成标准格式的标识符
    return {
      ...baseVariable,
      // 系统标识符：@gv_type_entityId_field-=
      identifier: `@gv_${baseVariable.sourceType}_${baseVariable.id}_${baseVariable.field}-=`,
      // 兼容旧代码的type字段
      type: baseVariable.sourceType,
    };
  };
  
  // 转换变量列表
  const convertToVexVariables = (): VariableData[] => {
    return variables.map(convertToVexVariable);
  };
  
  // 加载变量列表
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        console.log('[LoopNodeConfig] 开始加载变量列表...');
        
        // 直接请求API并记录响应数据结构
        const response: any = await variableService.getVariables();
        console.log('[LoopNodeConfig] 获取到原始响应:', 
          typeof response, 
          Array.isArray(response) ? '是数组' : '非数组',
          response && response.data ? '有data属性' : '无data属性'
        );
        
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
        
        console.log(`[LoopNodeConfig] 处理后得到 ${responseData.length} 条变量记录`);
        
        // 确保变量数据的所有字段都是正确的 (特别是field字段)
        const variableViews = responseData.map((v: any) => {
          // 检查并保持原始字段值
          const originalField = v.field || v.fieldname || 'value';
          
          // 更详细的日志，帮助我们理解每个变量的数据结构
          console.log(`[LoopNodeConfig] 变量: ${v.name || 'unnamed'}, ID: ${v.id?.substring(0, 8)}..., 类型: ${v.type}, 字段: ${originalField}`);
          
          return {
            id: v.id,
            name: v.name,
            identifier: v.identifier,
            type: v.type,
            field: originalField,  // 确保使用原始字段名
            sourceId: v.source?.id || '',
            sourceName: v.source?.name || '',
            value: v.value,
            // 添加更多源字段，以便转换函数能够访问
            source: v.source,
            fieldname: v.fieldname
          };
        });
        
        // 确保变量没有重复，使用ID作为唯一标识
        const uniqueVariables = variableViews.filter((v, index, self) => 
          index === self.findIndex(t => t.id === v.id)
        );
        
        console.log(`[LoopNodeConfig] 去重后剩余 ${uniqueVariables.length} 条变量记录`);
        
        // 更新状态
        setVariables(uniqueVariables);
      } catch (error) {
        console.error('[LoopNodeConfig] 加载变量列表失败:', error);
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
  
  /**
   * 获取变量的显示标识符
   * 如果是系统标识符，转换为显示格式
   */
  const getDisplayIdentifier = (variableId: string): string => {
    // 优先从缓存中获取显示标识符
    if (displayIdMap[variableId]) {
      return displayIdMap[variableId];
    }
    
    // 如果变量ID本身就是显示格式(包含@和.)，直接返回
    if (variableId && variableId.startsWith('@') && variableId.includes('.')) {
      return variableId;
    }
    
    return variableId;
  };
  
  // 验证变量合法性
  const validateVariableReference = (value: string) => {
    if (!value) return Promise.reject(new Error('变量引用不能为空'));
    
    // 放宽变量验证，接受V3.0格式标识符
    // 包括显示格式(@source.field#id)和系统格式(@gv_type_entityId_field-=)
    if (
      // 显示格式: @source.field 或 @source.field#id
      (/^@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(#[a-zA-Z0-9]{4})?$/.test(value)) ||
      // 系统格式: @gv_type_entityId_field-=
      (/^@gv_[a-zA-Z0-9_]+-[a-zA-Z0-9_\-]+-[a-zA-Z0-9_]+-=$/.test(value))
    ) {
      return Promise.resolve();
    }
    
    return Promise.reject(new Error('必须是有效的变量引用格式'));
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

  // 根据变量类型确定标签颜色
  const getVariableTagStyle = (displayId: string) => {
    // 从缓存的映射中获取变量类型
    let variableType = variableTypeMap[displayId];
    
    if (!variableType) {
      // 如果未找到缓存的类型信息，则从显示标识符推断
      variableType = VariableType.WORKFLOW; // 默认为工作流变量
      
      // 解析显示标识符
      const parseResult = IdentifierFormatterService.parseDisplayIdentifier(displayId);
      if (parseResult) {
        const { sourceName, field } = parseResult;
        
        // 根据字段名和源名称推断类型
        if (field === 'knowledge' || field === 'act' || field === 'name') {
          variableType = VariableType.NPC;
        } else if (field === 'output') {
          variableType = VariableType.TASK;
        } else if (field === 'value') {
          variableType = VariableType.CUSTOM;
        } else if (field === 'path' || field === 'content') {
          variableType = VariableType.FILE;
        }
        
        // 根据源名称进一步推断
        if (sourceName && sourceName.toLowerCase().includes('task')) {
          variableType = VariableType.TASK;
        } else if (sourceName && sourceName.toLowerCase().includes('workflow')) {
          variableType = VariableType.WORKFLOW;
        } else if (sourceName && sourceName.toLowerCase().includes('npc')) {
          variableType = VariableType.NPC;
        }
      }
      
      // 缓存推断结果
      setVariableTypeMap(prev => ({
        ...prev,
        [displayId]: variableType
      }));
    }
    
    // 使用VariableThemeService获取标准样式
    const colors = VariableThemeService.getTypeColor(variableType);
    
    return {
      backgroundColor: colors.bgColor,
      borderColor: colors.borderColor,
      color: colors.textColor,
      fontSize: '12px',
      fontWeight: 500,
      padding: '4px 8px',
      borderRadius: '4px'
    };
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
    
    // 保存当前的标识符映射和类型映射
    const variableDisplayMap: Record<string, string> = {};
    const variableTypes: Record<string, string> = {};
    
    // 如果有变量路径并且是variableValue类型条件
    if (conditionConfig.variablePath && values.conditionType === 'variableValue') {
      const displayId = getDisplayIdentifier(conditionConfig.variablePath);
      
      // 记录显示标识符映射
      if (displayId !== conditionConfig.variablePath) {
        variableDisplayMap[conditionConfig.variablePath] = displayId;
      }
      
      // 保存变量类型信息
      if (variableTypeMap[displayId]) {
        variableTypes[displayId] = variableTypeMap[displayId];
      }
      
      console.log('保存变量标识符映射和类型信息:', {
        displayMap: variableDisplayMap,
        typeMap: variableTypes
      });
    }
    
    const config = {
      ...initialConfig,
      conditionType: values.conditionType,
      conditionConfig,
      displayIdMap: variableDisplayMap, // 保存标识符映射关系
      variableTypes: variableTypes // 保存变量类型映射关系
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
        icon={<RetweetOutlined />}
        description="循环卡用于控制工作流的执行流向，根据条件决定走Yes或No分支。"
        type="info"
        showIcon={true}
        style={{ marginBottom: 16, background: '#f5f5f5', border: '1px solid #e8e8e8' }}
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {variablePath ? (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    border: '1px solid #d9d9d9',
                    borderRadius: '2px',
                    padding: '4px 11px',
                    width: '100%',
                    minHeight: '32px'
                  }}
                  onClick={() => setModalVisible(true)}
                >
                  <Tag style={getVariableTagStyle(variablePath)}>
                    {variablePath}
                  </Tag>
                </div>
              ) : (
                <Button 
                  type="dashed" 
                  block 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setModalVisible(true)}
                >
                  <SearchOutlined /> 选择变量
                </Button>
              )}
            </div>
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
      
      {/* 变量选择模态框 */}
      <VariableSelectorModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSelect={(variable: VariableData) => {
          // 获取变量基本信息
          const variableId = variable.id || '';
          const sourceName = variable.sourceName || '';
          const field = variable.field || 'value';
          
          // 解析变量ID中的entityId部分
          let entityId = variableId;
          
          // 变量ID格式为：type_entityId_fieldname
          const idParts = variableId.split('_');
          if (idParts.length >= 3) {
            // 第一部分是type，最后一部分是fieldname，中间的都是entityId
            entityId = idParts.slice(1, -1).join('_');
          } else if (idParts.length === 2) {
            // 处理简化格式：entityId_fieldname
            entityId = idParts[0];
          }
          
          // 获取entityId的前4位作为shortId
          const shortId = entityId.substring(0, 4);
          
          // 手动构建显示标识符，确保使用正确的entityId前4位
          const displayId = `@${sourceName}.${field}#${shortId}`;
          
          // 从变量中获取并保存确定的类型，而不是依赖推断
          const variableType = variable.sourceType || variable.type || 'custom';
          
          // 保存变量类型到缓存中
          setVariableTypeMap(prev => ({
            ...prev,
            [displayId]: variableType
          }));
          
          console.log('[LoopNodeConfig] 选择变量v3.0:', {
            variableName: sourceName,
            variableField: field,
            variableType,
            variableId: variableId.substring(0, 8) + (variableId.length > 8 ? '...' : ''),
            entityId: entityId.substring(0, 8) + (entityId.length > 8 ? '...' : ''),
            shortId,
            displayId: displayId
          });
          
          // 更新变量路径
          handleVariablePathChange(displayId);
          
          // 关闭模态框
          setModalVisible(false);
        }}
        variables={convertToVexVariables()}
        loading={loading}
      />
    </Form>
  );
};

export default LoopNodeConfig;
