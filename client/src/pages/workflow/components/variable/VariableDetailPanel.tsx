import React from 'react';
import { Descriptions, Typography, Space } from 'antd';
import VariableValueDisplay from './VariableValueDisplay';
import VariableThemeService from '../../../../services/VariableThemeService';
import { VariableType } from '../../../../services/variableService';

const { Text } = Typography;

interface VariableDetailPanelProps {
  displayId: string; // 显示标识符
  systemId: string; // 系统标识符
  fullId: string; // 完整ID
  variableType: string; // 变量类型
  editable?: boolean; // 是否允许编辑
  autoRefresh?: boolean; // 是否自动刷新
}

/**
 * 变量详情面板组件
 * 显示变量的详细信息，以及实时值
 */
const VariableDetailPanel: React.FC<VariableDetailPanelProps> = ({
  displayId,
  systemId,
  fullId,
  variableType = 'custom',
  editable = false,
  autoRefresh = false,
}) => {
  // 映射变量类型到VariableType枚举
  const getVariableTypeEnum = (type: string): VariableType => {
    switch (type.toLowerCase()) {
      case 'npc': return VariableType.NPC;
      case 'task': return VariableType.TASK;
      case 'workflow': return VariableType.WORKFLOW;
      case 'file': return VariableType.FILE;
      case 'custom':
      default: return VariableType.CUSTOM;
    }
  };

  // 获取变量类型的颜色样式
  const typeColorStyle = VariableThemeService.getTagStyle(getVariableTypeEnum(variableType));

  return (
    <Descriptions 
      size="small" 
      bordered 
      column={1}
      labelStyle={{ width: '120px', fontWeight: 'bold' }}
    >
      <Descriptions.Item label="显示标识符">
        <Text code>{displayId}</Text>
      </Descriptions.Item>
      
      <Descriptions.Item label="系统标识符">
        <Text code>{systemId}</Text>
      </Descriptions.Item>
      
      <Descriptions.Item label="完整ID">
        <Text code>{fullId}</Text>
      </Descriptions.Item>
      
      <Descriptions.Item label="类型">
        <Space>
          <div 
            style={{ 
              ...typeColorStyle, 
              padding: '2px 8px', 
              borderRadius: '4px',
              display: 'inline-block'
            }}
          >
            {variableType || '未知'}
          </div>
        </Space>
      </Descriptions.Item>
      
      <Descriptions.Item label="当前值">
        <VariableValueDisplay 
          fullId={fullId}
          systemId={systemId}
          editable={editable}
          autoRefresh={autoRefresh}
        />
      </Descriptions.Item>
    </Descriptions>
  );
};

export default VariableDetailPanel;
