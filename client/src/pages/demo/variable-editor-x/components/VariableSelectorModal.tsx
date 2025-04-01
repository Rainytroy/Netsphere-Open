import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Space, Select, Spin } from 'antd';
import { VariableData } from '../types';
import VariableTag from '../../../../components/common/VariableTag';

const { Text } = Typography;
const { Option } = Select;

interface VariableSelectorModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (variable: VariableData) => void;
  variables: VariableData[];
  loading?: boolean;
}

/**
 * 变量选择模态窗口
 * 用于从变量列表中选择一个变量并插入到编辑器中
 */
const VariableSelectorModal: React.FC<VariableSelectorModalProps> = ({
  visible,
  onCancel,
  onSelect,
  variables,
  loading = false
}) => {
  const [selectedVariable, setSelectedVariable] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // 当对话框关闭时重置选择状态
  useEffect(() => {
    if (!visible) {
      setSelectedVariable('');
      setSearchText('');
    }
  }, [visible]);

  // 处理选择变更
  const handleChange = (value: string) => {
    setSelectedVariable(value);
  };

  // 处理确认选择
  const handleConfirm = () => {
    if (selectedVariable) {
      // 根据ID查找完整的变量数据
      const variable = variables.find(v => v.identifier === selectedVariable);
      if (variable) {
        // 记录详细日志，确保使用的是v3.0格式的标识符
        console.log('[v3.0] 选择要插入的变量:', {
          id: variable.id.substring(0, 8) + '...',
          type: variable.type,
          field: variable.field,
          identifier: variable.identifier,
          displayId: variable.displayIdentifier
        });
        
        // 验证标识符格式
        if (!variable.identifier.startsWith('@gv_') || !variable.identifier.endsWith('-=')) {
          console.warn('[v3.0] 警告: 变量标识符不符合v3.0格式:', variable.identifier);
          
          // 强制重新构建标识符以确保符合格式
          const correctedVariable = {
            ...variable,
            identifier: `@gv_${variable.type}_${variable.id}_${variable.field}-=`
          };
          
          console.log('[v3.0] 已修正标识符:', correctedVariable.identifier);
          onSelect(correctedVariable);
        } else {
          // 标识符格式正确，直接使用
          onSelect(variable);
        }
      }
    }
    onCancel();
  };

  // 处理搜索
  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  // 过滤变量列表
  const filteredVariables = variables.filter(v => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    
    // 预处理特殊字符，移除可能的前缀@
    const normalizedSearch = searchLower.startsWith('@') 
      ? searchLower.substring(1) 
      : searchLower;
    
    return (
      // 搜索系统标识符 (v3.0格式)
      v.identifier.toLowerCase().includes(normalizedSearch) ||
      // 搜索变量类型
      v.type.toLowerCase().includes(normalizedSearch) ||
      // 搜索来源名称
      v.sourceName.toLowerCase().includes(normalizedSearch) ||
      // 搜索字段名称
      v.field.toLowerCase().includes(normalizedSearch) ||
      // 搜索显示标识符
      (v.displayIdentifier && v.displayIdentifier.toLowerCase().includes(normalizedSearch)) ||
      // 支持不带@前缀的显示标识符搜索
      (v.displayIdentifier && v.displayIdentifier.toLowerCase().substring(1).includes(normalizedSearch)) ||
      // 支持仅搜索显示标识符中的短ID部分
      (v.displayIdentifier && v.displayIdentifier.includes('#') && 
       v.displayIdentifier.toLowerCase().split('#')[1].includes(normalizedSearch))
    );
  });

  // 渲染变量标签（仅标签本身，用于选中后显示）
  const renderLabel = (variable: VariableData) => (
    <VariableTag
      identifier={variable.identifier}
      displayIdentifier={variable.displayIdentifier}
      type={variable.sourceType as any}
      value={variable.value}
      readOnly={true}
    />
  );
  
  // 渲染变量选项（完整内容，用于下拉列表）
  const renderOption = (variable: VariableData) => {
    return (
      <Option 
        key={variable.identifier} 
        value={variable.identifier}
        label={renderLabel(variable)} // 这个标签用于选中后显示
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <VariableTag
              identifier={variable.identifier}
              displayIdentifier={variable.displayIdentifier}
              type={variable.sourceType as any}
              value={variable.value}
              readOnly={true}
            />
          </div>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'rgba(0, 0, 0, 0.45)',
            paddingLeft: '4px'
          }}>
            <span>{variable.sourceName}</span>
            <span>{variable.value || '[无值]'}</span>
          </div>
        </div>
      </Option>
    );
  };

  return (
    <Modal
      title="选择变量"
      open={visible}
      onCancel={onCancel}
      maskClosable={false}
      destroyOnClose={true}
      width={550}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirm}
          disabled={!selectedVariable}
        >
          确认
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Text>选择要插入的变量:</Text>
        
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="搜索变量（支持按名称、来源、字段或变量标识符搜索）"
          optionFilterProp="children"
          onChange={handleChange}
          onSearch={handleSearch}
          value={selectedVariable}
          loading={loading}
          filterOption={false}
          notFoundContent={loading ? <Spin size="small" /> : "没有找到变量"}
          size="large"
          optionLabelProp="label" // 使用label属性作为选中后显示的内容
        >
          {filteredVariables.map(renderOption)}
        </Select>
        
        <div style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.45)' }}>
          {!loading && `共 ${filteredVariables.length} 个变量可用`}
          {loading && "正在加载变量..."}
        </div>
      </Space>
    </Modal>
  );
};

export default VariableSelectorModal;
