import * as React from 'react';
import { Tag, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { VariableType } from '../../services/variableService';

export interface VariableTagProps {
  identifier: string;
  displayIdentifier?: string; // 显示用的标识符（格式：@变量名称.字段名#ID）
  error?: boolean;
  errorMessage?: string;
  onDelete?: () => void;
  readOnly?: boolean;
  type?: VariableType;
  value?: string; // 添加变量值属性
}

/**
 * 变量标签组件
 * 用于展示变量引用的标签
 */
const VariableTag: React.FC<VariableTagProps> = ({
  identifier,
  displayIdentifier,
  error = false,
  errorMessage,
  onDelete,
  readOnly = false,
  type,
  value
}) => {
  const [hovered, setHovered] = React.useState(false);
  
  // 获取变量类型的颜色
  const getTypeColor = (variableType?: VariableType): { bgColor: string, borderColor: string, textColor: string } => {
    if (error) {
      return {
        bgColor: '#FFF1F0',
        borderColor: '#F5222D',
        textColor: '#F5222D'
      };
    }
    
    switch (variableType) {
      case VariableType.NPC:
        return {
          bgColor: '#E6F7FF',
          borderColor: '#1890FF',
          textColor: '#1890FF'
        };
      case VariableType.TASK:
        return {
          bgColor: '#E3F9D3', // 深绿色背景
          borderColor: '#389E0D', // 更深的绿色边框
          textColor: '#389E0D' // 更深的绿色文本
        };
      case VariableType.CUSTOM:
        return {
          bgColor: '#FFF7E6',
          borderColor: '#FA8C16',
          textColor: '#FA8C16'
        };
      case VariableType.FILE:
        return {
          bgColor: '#E6FFFB',
          borderColor: '#13C2C2',
          textColor: '#13C2C2'
        };
      case VariableType.WORKFLOW:
        return {
          bgColor: '#F9F0FF',
          borderColor: '#722ED1',
          textColor: '#722ED1'
        };
      default:
        return {
          bgColor: '#E6F4FF',
          borderColor: '#0F56B3',
          textColor: '#0F56B3'
        };
    }
  };
  
  const colors = getTypeColor(type);

  // 变量标签样式
  const tagStyle: React.CSSProperties = {
    backgroundColor: colors.bgColor,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: '4px',
    padding: '2px 8px',
    // 移除特定字体设置，使用全局字体
    color: colors.textColor,
    cursor: readOnly ? 'default' : 'pointer',
    marginRight: '4px',
    transition: 'all 0.3s',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  };

  // 删除按钮样式
  const deleteButtonStyle: React.CSSProperties = {
    marginLeft: '4px',
    color: colors.textColor,
    cursor: 'pointer',
  };

  // 鼠标悬停时显示删除按钮
  const handleMouseEnter = () => {
    if (!readOnly) {
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  // 删除标签
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <Tooltip
      title={error ? errorMessage || '变量错误' : value || '无值'}
      color={error ? 'red' : undefined}
    >
      <Tag
        style={tagStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 使用友好的显示标识符（如果可用）或者标准标识符 */}
        {displayIdentifier ? displayIdentifier : `@${identifier}`}
        {hovered && !readOnly && onDelete && (
          <DeleteOutlined
            style={deleteButtonStyle}
            onClick={handleDelete}
          />
        )}
      </Tag>
    </Tooltip>
  );
};

export default VariableTag;
