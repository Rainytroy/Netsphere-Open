import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Alert, Typography, Divider, Row, Col, Spin, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined, SwapOutlined, SearchOutlined } from '@ant-design/icons';
import { NodeConfigProps } from './NodeConfigInterface';
import { variableService, VariableType } from '../../../services/variableService';
import VariableSelectorModal from '../../../pages/demo/variable-editor-x/components/VariableSelectorModal';
import { VariableData } from '../../../pages/demo/variable-editor-x/types';
import IdentifierFormatterService from '../../../services/IdentifierFormatterService';
import VariableThemeService from '../../../services/VariableThemeService';
import VariableSchemaService from '../../../services/VariableSchemaService';

/**
 * 系统标识符格式正则表达式
 * 与formatters.ts保持一致，用于解析和验证v3.0格式系统标识符
 */
const V3_IDENTIFIER_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=/g;
const V3_IDENTIFIER_EXACT_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=$/;

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
  
// 维护变量类型映射，用于应用正确的样式
// 如果初始配置中包含变量类型映射，则使用它进行初始化
const [variableTypeMap, setVariableTypeMap] = useState<Record<string, string>>(
  initialConfig?.variableTypes || {}
);

// 维护系统标识符到显示标识符的映射，用于UI显示
// 如果初始配置中包含映射，则使用它进行初始化
const [displayIdMap, setDisplayIdMap] = useState<Record<string, string>>(
  initialConfig?.displayIdMap || {}
);

// 初始加载时记录已恢复的变量类型信息
useEffect(() => {
  if (initialConfig?.variableTypes) {
    console.log('[AssignmentNodeConfig] 已恢复变量类型映射:', initialConfig.variableTypes);
  }
}, [initialConfig]);

/**
 * 系统标识符转换为显示标识符 
 * 使用IdentifierFormatterService服务处理，确保与系统一致
 */
const getDisplayIdentifier = (systemId: string): string => {
  // 优先从缓存中获取，提高性能
  if (displayIdMap[systemId]) {
    return displayIdMap[systemId];
  }
  
  // 如果不是系统标识符，直接返回
  if (!systemId || !systemId.startsWith('@gv_') || !systemId.endsWith('-=')) {
    return systemId;
  }
  
  try {
    // 使用系统标准服务处理标识符
    const parseResult = IdentifierFormatterService.parseIdentifier(systemId);
    if (!parseResult) return systemId;
    
    const { id, field } = parseResult;
    
    // 提取类型信息
    const typeMatch = systemId.match(/@gv_([a-zA-Z0-9]+)_/);
    const type = typeMatch ? typeMatch[1] : 'custom';
    
    // 在变量列表中查找匹配项
    const variable = variables.find(v => 
      (v.type === type && v.id === id && v.field === field) ||
      (v.id === id) // 尝试宽松匹配
    );
    
    // 获取变量信息，优先使用变量源名称
    const sourceName = variable?.sourceName || 
                       variable?.source?.name || 
                       VariableSchemaService.normalizeSourceType(type, field);
    const shortId = id.substring(0, 4);
    
    // 使用标准格式构造显示标识符
    const displayId = IdentifierFormatterService.formatDisplayIdentifier(sourceName, field, id);
    
    // 缓存映射，提高后续访问性能
    setDisplayIdMap(prev => ({
      ...prev,
      [systemId]: displayId
    }));
    
    return displayId;
  } catch (error) {
    console.error('[AssignmentNodeConfig] 解析系统标识符失败:', systemId, error);
    return systemId;
  }
};
  
  // VEX变量选择器状态
  const [modalVisible, setModalVisible] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState<number>(-1);
  const [currentEditField, setCurrentEditField] = useState<'sourceVariable' | 'targetVariable'>('sourceVariable');
  
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
      // 系统标识符：@gv_{id}-= (避免重复添加类型和字段)
      identifier: variable.identifier || `@gv_${baseVariable.id}-=`,
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
        console.log('[AssignmentNodeConfig] 开始加载变量列表...');
        
        // 直接请求API并记录响应数据结构
        const response: any = await variableService.getVariables();
        console.log('[AssignmentNodeConfig] 获取到原始响应:', 
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
        
        console.log(`[AssignmentNodeConfig] 处理后得到 ${responseData.length} 条变量记录`);
        
        // 确保变量数据的所有字段都是正确的 (特别是field字段)
        const variableViews = responseData.map((v: any) => {
          // 检查并保持原始字段值
          const originalField = v.field || v.fieldname || 'value';
          
          // 更详细的日志，帮助我们理解每个变量的数据结构
          console.log(`[AssignmentNodeConfig] 变量: ${v.name || 'unnamed'}, ID: ${v.id?.substring(0, 8)}..., 类型: ${v.type}, 字段: ${originalField}`);
          
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
        
        console.log(`[AssignmentNodeConfig] 去重后剩余 ${uniqueVariables.length} 条变量记录`);
        
        // 更新状态
        setVariables(uniqueVariables);
      } catch (error) {
        console.error('[AssignmentNodeConfig] 加载变量列表失败:', error);
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
  
  // 组件挂载和变量加载完成后，自动重建系统标识符映射
  useEffect(() => {
    if (!loading && variables.length > 0 && assignmentRules.length > 0) {
      console.log('[AssignmentNodeConfig] 自动初始化显示标识符映射...');
      
      // 临时存储要更新的映射
      const newDisplayMap: Record<string, string> = {};
      
      // 处理每条赋值规则中的变量标识符
      assignmentRules.forEach(rule => {
        // 处理源变量标识符
        if (rule.sourceVariable && rule.sourceVariable.startsWith('@gv_')) {
          const match = rule.sourceVariable.match(V3_IDENTIFIER_EXACT_REGEX);
          if (match) {
            const [_, type, id, field] = match;
            
            // 在变量列表中查找匹配的变量
            const variable = variables.find(v => {
              // 尝试完全匹配
              const exactMatch = v.type === type && v.id === id && v.field === field;
              // 尝试ID匹配（宽松匹配）
              const idMatch = !exactMatch && v.id === id;
              return exactMatch || idMatch;
            });
            
            if (variable) {
              // 使用变量的原始sourceName
              const sourceName = variable.sourceName || variable.source?.name || type;
              // 构建正确的显示标识符
              const shortId = id.substring(0, 4);
              const displayId = `@${sourceName}.${field}#${shortId}`;
              
              // 添加到更新映射
              newDisplayMap[rule.sourceVariable] = displayId;
              
              console.log(`[AssignmentNodeConfig] 重建源变量显示标识符: ${rule.sourceVariable} -> ${displayId}`);
            }
          }
        }
        
        // 处理目标变量标识符
        if (rule.targetVariable && rule.targetVariable.startsWith('@gv_')) {
          const match = rule.targetVariable.match(V3_IDENTIFIER_EXACT_REGEX);
          if (match) {
            const [_, type, id, field] = match;
            
            // 在变量列表中查找匹配的变量
            const variable = variables.find(v => {
              // 尝试完全匹配
              const exactMatch = v.type === type && v.id === id && v.field === field;
              // 尝试ID匹配（宽松匹配）
              const idMatch = !exactMatch && v.id === id;
              return exactMatch || idMatch;
            });
            
            if (variable) {
              // 使用变量的原始sourceName
              const sourceName = variable.sourceName || variable.source?.name || type;
              // 构建正确的显示标识符
              const shortId = id.substring(0, 4);
              const displayId = `@${sourceName}.${field}#${shortId}`;
              
              // 添加到更新映射
              newDisplayMap[rule.targetVariable] = displayId;
              
              console.log(`[AssignmentNodeConfig] 重建目标变量显示标识符: ${rule.targetVariable} -> ${displayId}`);
            }
          }
        }
      });
      
      // 批量更新显示标识符映射
      if (Object.keys(newDisplayMap).length > 0) {
        setDisplayIdMap(prev => ({
          ...prev,
          ...newDisplayMap
        }));
        
        console.log(`[AssignmentNodeConfig] 完成显示标识符映射更新，共 ${Object.keys(newDisplayMap).length} 项`);
      }
    }
  }, [loading, variables, assignmentRules]);
  
  // 验证变量引用非空 (简化验证，不再检查格式，因为使用变量选择器)
  const validateVariableReference = (value: string) => {
    if (!value) return Promise.reject(new Error('变量引用不能为空'));
    
    // 不再检查格式，因为变量选择器已经确保了正确的V3格式变量
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
    
    // 保存当前的标识符映射和类型映射关系
    const variableDisplayMap: Record<string, string> = {};
    const variableTypes: Record<string, string> = {};
    
    // 为每个有效的规则添加标识符映射和类型映射
    validRules.forEach(rule => {
      // 处理源变量标识符
      if (rule.sourceVariable && displayIdMap[rule.sourceVariable]) {
        const displayId = displayIdMap[rule.sourceVariable];
        variableDisplayMap[rule.sourceVariable] = displayId;
        
        // 为源变量保存类型信息
        if (variableTypeMap[displayId]) {
          variableTypes[displayId] = variableTypeMap[displayId];
        }
      }
      
      // 处理目标变量标识符
      if (rule.targetVariable && displayIdMap[rule.targetVariable]) {
        const displayId = displayIdMap[rule.targetVariable];
        variableDisplayMap[rule.targetVariable] = displayId;
        
        // 为目标变量保存类型信息 - 确保目标变量类型也被保存
        if (variableTypeMap[displayId]) {
          variableTypes[displayId] = variableTypeMap[displayId];
        }
      }
    });
    
    console.log('保存标识符映射:', variableDisplayMap);
    console.log('保存变量类型信息:', variableTypes);
    
    // 构建最终配置，包含标识符映射和变量类型映射
    const config = {
      ...initialConfig,
      assignments: validRules,
      displayIdMap: variableDisplayMap, // 保存标识符映射关系到配置中
      variableTypes: variableTypes // 保存变量类型映射关系到配置中
    };
    
    // 调用保存回调
    onSave(nodeId, config);
  };

  /**
   * 根据变量类型确定标签颜色
   * 使用缓存的类型信息或通过标识符解析获得类型
   */
  const getVariableTagStyle = (displayId: string) => {
    // 从缓存的映射中获取变量类型
    let variableType = variableTypeMap[displayId];
    
    if (!variableType) {
      console.log(`[AssignmentNodeConfig] 未找到变量 ${displayId} 的类型缓存，尝试推断...`);
      
      // 如果未找到缓存的类型信息，则从显示标识符推断
      variableType = VariableType.WORKFLOW; // 默认为工作流变量
      
      // 解析显示标识符
      const parseResult = IdentifierFormatterService.parseDisplayIdentifier(displayId);
      if (parseResult) {
        const { sourceName, field } = parseResult;
        
        // 通过系统服务尝试解析变量类型
        // 第一步：通过字段名进行推断
        if (field === 'knowledge' || field === 'act' || field === 'actlvdesc' || field === 'name') {
          variableType = VariableType.NPC;
        } else if (field === 'output' || field === 'input') {
          variableType = VariableType.TASK;
        } else if (field === 'value') {
          variableType = VariableType.CUSTOM;
        } else if (field === 'path' || field === 'content') {
          variableType = VariableType.FILE;
        }
        
        // 第二步：通过源名称进一步推断
        if (sourceName) {
          // 优先使用含有明确类型标识的源名称
          const lowerName = sourceName.toLowerCase();
          if (lowerName.includes('npc')) {
            variableType = VariableType.NPC;
          } else if (lowerName.includes('task')) {
            variableType = VariableType.TASK;
          } else if (lowerName.includes('workflow')) {
            variableType = VariableType.WORKFLOW;
          } else if (lowerName.includes('file')) {
            variableType = VariableType.FILE;
          }
        }
      }
      
      // 缓存推断结果
      console.log(`[AssignmentNodeConfig] 推断变量 ${displayId} 类型为: ${variableType}`);
      setVariableTypeMap(prev => ({
        ...prev,
        [displayId]: variableType
      }));
    } else {
      console.log(`[AssignmentNodeConfig] 使用缓存的变量类型 ${displayId} -> ${variableType}`);
    }
    
    // 使用VariableThemeService获取标准样式
    // 这是关键 - 使用官方服务获取标准的变量颜色主题
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
        icon={<SwapOutlined />}
        description="赋值卡用于将一个变量的值赋给另一个变量，可以添加多条赋值规则。必须使用变量选择器选择有效的变量。"
        type="info"
        showIcon={true}
        style={{ marginBottom: 16, background: '#f5f5f5', border: '1px solid #e8e8e8' }}
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
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {rule.sourceVariable ? (
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Tag 
                          style={getVariableTagStyle(getDisplayIdentifier(rule.sourceVariable))}
                        >
                          {getDisplayIdentifier(rule.sourceVariable)}
                        </Tag>
                        <Button 
                          type="link" 
                          size="small"
                          style={{ marginLeft: 4, padding: '0 4px' }}
                          onClick={() => {
                            setCurrentEditIndex(index);
                            setCurrentEditField('sourceVariable');
                            setModalVisible(true);
                          }}
                        >
                          修改
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        type="dashed" 
                        block 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => {
                          setCurrentEditIndex(index);
                          setCurrentEditField('sourceVariable');
                          setModalVisible(true);
                        }}
                      >
                        <SearchOutlined /> 选择源变量
                      </Button>
                    )}
                  </div>
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
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {rule.targetVariable ? (
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Tag 
                            style={getVariableTagStyle(getDisplayIdentifier(rule.targetVariable))}
                          >
                            {getDisplayIdentifier(rule.targetVariable)}
                          </Tag>
                          <Button 
                            type="link" 
                            size="small"
                            style={{ marginLeft: 4, padding: '0 4px' }}
                            onClick={() => {
                              setCurrentEditIndex(index);
                              setCurrentEditField('targetVariable');
                              setModalVisible(true);
                            }}
                          >
                            修改
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          type="dashed" 
                          block 
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => {
                            setCurrentEditIndex(index);
                            setCurrentEditField('targetVariable');
                            setModalVisible(true);
                          }}
                        >
                          <SearchOutlined /> 选择目标变量
                        </Button>
                      )}
                    </div>
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
      
      {/* 变量选择模态框 */}
      <VariableSelectorModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSelect={(variable: VariableData) => {
          if (currentEditIndex === -1) return;
          
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
          
          // 手动构建显示标识符，确保使用变量原始的sourceName（如"来源值"）而非类型
          // 这是修复点：确保sourceName被保留为实际的变量名称，而不是变成"custom"
          const displayId = `@${sourceName}.${field}#${shortId}`;
          
          console.log('[AssignmentNodeConfig] 使用原始源名称构建显示标识符:', {
            原始源名称: sourceName,
            字段: field,
            最终显示标识符: displayId
          });
          
          // 从变量中获取并保存确定的类型，而不是依赖推断
          const variableType = variable.sourceType || variable.type || 'custom';
          
          // 保存变量类型到缓存中
          setVariableTypeMap(prev => ({
            ...prev,
            [displayId]: variableType
          }));
          
          // 获取系统标识符，直接使用variable.identifier避免重复添加类型和字段
          const systemIdentifier = variable.identifier || `@gv_${variableId}-=`;
          
          // 将系统标识符映射到显示标识符，保存在缓存中
          setDisplayIdMap(prev => ({
            ...prev,
            [systemIdentifier]: displayId
          }));
          
          console.log('[AssignmentNodeConfig] 选择变量v3.0:', {
            index: currentEditIndex,
            field: currentEditField,
            variableName: sourceName,
            variableField: field,
            variableType,
            variableId: variableId.substring(0, 8) + (variableId.length > 8 ? '...' : ''),
            entityId: entityId.substring(0, 8) + (entityId.length > 8 ? '...' : ''),
            shortId,
            displayId: displayId,
            systemIdentifier: systemIdentifier
          });
          
          // 更新对应的赋值规则 - 使用系统标识符，而不是显示标识符
          if (currentEditField === 'sourceVariable') {
            handleSourceVariableChange(systemIdentifier, currentEditIndex);
          } else {
            handleTargetVariableChange(systemIdentifier, currentEditIndex);
          }
          
          // 关闭模态框
          setModalVisible(false);
        }}
        variables={convertToVexVariables()}
        loading={loading}
      />
    </Form>
  );
};

export default AssignmentNodeConfig;
