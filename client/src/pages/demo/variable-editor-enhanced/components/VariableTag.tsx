import React from 'react';
import { Tag, Tooltip } from 'antd';
import { VariableData } from '../types';
import { TYPE_COLORS, TYPE_LABELS } from '../types';

interface VariableTagProps {
  variable: VariableData;
  onClick?: () => void;
  className?: string;
}

/**
 * 变量标签组件
 * 
 * 用于在编辑器中显示变量的可视化标签，支持悬停提示和点击交互
 */
export const VariableTag: React.FC<VariableTagProps> = ({ variable, onClick, className = '' }) => {
  const { id, field, sourceName, sourceType } = variable;
  const color = TYPE_COLORS[sourceType as keyof typeof TYPE_COLORS] || '#D9D9D9';
  const typeLabel = TYPE_LABELS[sourceType as keyof typeof TYPE_LABELS] || sourceType;
  
  // 构建完整标识符
  const fullIdentifier = variable.identifier;
  
  // 短ID用于显示 (只显示前4位)
  const shortId = id.substring(0, 4);
  
  return (
    <Tooltip title={
      <div>
        <p><strong>标识符：</strong> {fullIdentifier}</p>
        <p><strong>来源：</strong> {sourceName}</p>
        <p><strong>类型：</strong> {typeLabel}</p>
        <p><strong>字段：</strong> {field}</p>
        {variable.value && <p><strong>值：</strong> {variable.value}</p>}
      </div>
    }>
      <Tag 
        color={color}
        className={`variable-tag ${className}`}
        onClick={onClick}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          fontSize: '12px',
          lineHeight: '1.2',
          fontWeight: 500,
          margin: '0 1px'
        }}
      >
        <span className="variable-icon" style={{ fontWeight: 'bold' }}>{typeLabel[0]}</span>
        <span className="variable-name">{sourceName}</span>
        <span className="variable-field">.{field}</span>
        <span className="variable-id" style={{ opacity: 0.7, fontSize: '10px' }}>#{shortId}</span>
      </Tag>
    </Tooltip>
  );
};

export default VariableTag;
