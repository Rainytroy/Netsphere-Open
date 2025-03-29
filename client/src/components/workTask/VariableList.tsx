import * as React from 'react';
import { Typography, List, Input, Select, Divider, Tag, Empty, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { VariableType } from '../../services/variableService';
import VariableTag from './VariableTag';

const { Title, Text } = Typography;
const { Option } = Select;

// 用于显示的变量视图模型
export interface VariableView {
  id: string;
  name: string;
  identifier: string;
  displayIdentifier?: string; // 添加显示标识符
  type: VariableType;
  sourceId: string;
  sourceName: string;
  value: string;
}

interface VariableListProps {
  onVariableClick?: (variable: VariableView) => void; // 改为可选属性
  usedVariables?: VariableView[]; // 新增已使用的变量列表作为props
}

/**
 * 变量列表组件
 * 用于显示当前编辑器中已使用的变量
 */
const VariableList: React.FC<VariableListProps> = ({ onVariableClick, usedVariables = [] }) => {
  const [searchText, setSearchText] = React.useState<string>('');
  const [selectedType, setSelectedType] = React.useState<string>('all');


  // 过滤变量列表
  const filteredVariables = React.useMemo(() => {
    return usedVariables.filter(variable => {
      // 搜索筛选
      const matchesSearch = !searchText || 
          variable.identifier.toLowerCase().includes(searchText.toLowerCase()) ||
          variable.sourceName.toLowerCase().includes(searchText.toLowerCase()) ||
          variable.name.toLowerCase().includes(searchText.toLowerCase());
      
      // 类型筛选，更严格的类型比较
      let matchesType = false;
      if (selectedType === 'all') {
        // 全部类型
        matchesType = true;
      } else if (selectedType === VariableType.NPC) {
        // 确保是NPC类型且类型字符串完全匹配
        matchesType = variable.type === VariableType.NPC;
      } else if (selectedType === VariableType.TASK) {
        // 确保是工作任务类型且类型字符串完全匹配
        matchesType = variable.type === VariableType.TASK;
      } else if (selectedType === VariableType.CUSTOM) {
        // 确保是自定义类型且类型字符串完全匹配
        matchesType = variable.type === VariableType.CUSTOM;  
      } else if (selectedType === VariableType.FILE) {
        // 确保是文件类型且类型字符串完全匹配
        matchesType = variable.type === VariableType.FILE;
      } else if (selectedType === VariableType.WORKFLOW) {
        // 确保是工作流类型且类型字符串完全匹配
        matchesType = variable.type === VariableType.WORKFLOW;
      }
      
      return matchesSearch && matchesType;
    });
  }, [usedVariables, selectedType, searchText]);

  // 获取变量类型颜色
  const getTypeColor = (type: VariableType) => {
    switch (type) {
      case VariableType.NPC:
        return '#1890FF'; // 蓝色
      case VariableType.TASK:
        return '#389E0D'; // 深绿色 (更新为与VariableTag一致)
      case VariableType.CUSTOM:
        return '#FA8C16'; // 橙色
      case VariableType.FILE:
        return '#13C2C2'; // 青色
      case VariableType.WORKFLOW:
        return '#722ED1'; // 紫色
      default:
        return '#D9D9D9'; // 默认灰色
    }
  };

  // 格式化变量类型显示名称
  const formatTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      [VariableType.NPC]: 'NPC',
      [VariableType.TASK]: '工作任务',
      [VariableType.CUSTOM]: '自定义变量',
      [VariableType.FILE]: '文件',
      [VariableType.WORKFLOW]: '工作流',
    };
    return typeMap[type] || type;
  };

  // 提取不重复的变量类型列表
  const variableTypes = React.useMemo(() => {
    const types = new Set<VariableType>();
    usedVariables.forEach((variable: VariableView) => {
      if (variable.type) {
        types.add(variable.type);
      }
    });
    return Array.from(types);
  }, [usedVariables]);

  return (
    <div className="variable-list" style={{ height: '100%', overflowY: 'auto' }}>
      <Title level={5}>可用变量</Title>
      
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索变量"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        
        <Select
          placeholder="选择类型"
          style={{ width: '100%' }}
          value={selectedType}
          onChange={value => {
            // 确保重置空值为'all'而不是默认值
            if (value === undefined || value === null) {
              setSelectedType('all');
            } else {
              setSelectedType(value);
            }
          }}
        >
          <Option value="all">全部类型</Option>
          {variableTypes.map(type => (
            <Option key={type} value={type}>{formatTypeLabel(type)}</Option>
          ))}
        </Select>
      </div>
      
      <Divider style={{ margin: '8px 0' }} />
      
      {filteredVariables.length === 0 ? (
        <Empty description="没有可用的变量" />
      ) : (
        <List
          dataSource={filteredVariables}
          renderItem={variable => (
            <List.Item
              key={variable.id}
              style={{ padding: '8px 0' }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* 使用VariableTag组件代替自定义标识符显示 */}
                  <VariableTag
                    identifier={variable.identifier}
                    displayIdentifier={variable.displayIdentifier}
                    type={variable.type}
                    value={variable.value}
                    readOnly={true}
                  />
                  <Tag 
                    style={{ 
                      marginLeft: 8,
                      backgroundColor: '#FFFFFF',
                      color: getTypeColor(variable.type),
                      border: `1px solid ${getTypeColor(variable.type)}`
                    }}
                  >
                    {formatTypeLabel(variable.type)}
                  </Tag>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Tooltip title={variable.value}>
                    <Text 
                      type="secondary" 
                      style={{ 
                        display: '-webkit-box', 
                        WebkitLineClamp: 1, // 改为1行
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis', // 添加确保显示省略号
                        maxHeight: '20px', // 添加固定高度
                        fontSize: '12px'
                      }}
                    >
                      {variable.value || '(空值)'}
                    </Text>
                  </Tooltip>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default VariableList;
