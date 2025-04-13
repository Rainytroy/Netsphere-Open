import React, { useState, useEffect } from 'react';
import { Typography, Button, Tag, message, Tooltip } from 'antd';
import { CaretRightOutlined, CheckCircleOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons';
import useExecutionVariable from './useExecutionVariable';
import VariableThemeService from '../../../../services/VariableThemeService';
import { VariableType } from '../../../../services/variableService';
import VariableDetailPanel from './VariableDetailPanel';

const { Text, Paragraph } = Typography;

interface ExecutionVariableTransferProps {
  // 源变量
  sourceDisplayId: string;
  sourceSystemId: string;
  sourceFullId: string;
  sourceType: string;
  
  // 目标变量
  targetDisplayId: string;
  targetSystemId: string;
  targetFullId: string;
  targetType: string;
  
  // 传递值
  transferValue: string;
  
  // 选项
  editable?: boolean;
  autoRefresh?: boolean;
}

/**
 * 执行变量传递组件
 * 显示变量传递关系，源变量和目标变量的详情
 */
const ExecutionVariableTransfer: React.FC<ExecutionVariableTransferProps> = ({
  sourceDisplayId,
  sourceSystemId,
  sourceFullId,
  sourceType = 'custom',
  
  targetDisplayId,
  targetSystemId,
  targetFullId,
  targetType = 'custom',
  
  transferValue = '',
  
  editable = false,
  autoRefresh = true,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [actualTransferValue, setActualTransferValue] = useState<string>(''); // 存储实际传输的值
  const { getVariableValue, updateVariableValue } = useExecutionVariable();
  
  // 执行变量赋值操作
  const performTransfer = async () => {
    try {
      setIsTransferring(true);
      
      // 获取源变量值，优先使用传入的值
      let valueToTransfer = transferValue;
      
      // 如果没有提供值，则从服务器获取源变量值
      if (!valueToTransfer) {
        const sourceResult = await getVariableValue(sourceFullId, true);
        if (!sourceResult.success) {
          console.error('获取源变量值失败:', sourceResult.error);
          setTransferStatus('error');
          return;
        }
        valueToTransfer = sourceResult.value || '';
      }
      
      setActualTransferValue(valueToTransfer);
      
      // 将源变量值赋值给目标变量
      const updateResult = await updateVariableValue(targetFullId, valueToTransfer);
      
      if (updateResult.success) {
        setTransferStatus('success');
        console.log(`变量赋值成功: ${sourceFullId} -> ${targetFullId} = "${valueToTransfer}"`);
        
        // 显示成功消息
        message.success('变量赋值成功');
      } else {
        setTransferStatus('error');
        console.error('变量赋值失败:', updateResult.error);
        
        // 显示错误消息
        message.error(`变量赋值失败: ${updateResult.error}`);
      }
    } catch (error) {
      setTransferStatus('error');
      console.error('变量赋值异常:', error);
      message.error('变量赋值异常');
    } finally {
      setIsTransferring(false);
    }
  };
  
  // 在组件挂载时，执行变量赋值
  useEffect(() => {
    // 如果没有源变量ID或目标变量ID，不执行赋值
    if (!sourceFullId || !targetFullId) return;
    
    // 执行变量赋值
    performTransfer();
  }, [sourceFullId, targetFullId, transferValue]);
  
  // 将类型字符串转换为VariableType枚举
  const getTypeEnum = (typeStr: string): VariableType => {
    switch ((typeStr || '').toLowerCase()) {
      case 'npc': return VariableType.NPC;
      case 'task': return VariableType.TASK;
      case 'workflow': return VariableType.WORKFLOW;
      case 'file': return VariableType.FILE;
      default: return VariableType.CUSTOM;
    }
  };
  
  // 获取标签样式
  const sourceStyle = VariableThemeService.getTagStyle(getTypeEnum(sourceType));
  const targetStyle = VariableThemeService.getTagStyle(getTypeEnum(targetType));
  
  // 手动重试赋值
  const handleRetry = () => {
    performTransfer();
  };
  
  // 获取传输状态图标
  const getTransferStatusIcon = () => {
    if (isTransferring) {
      return <SyncOutlined spin style={{ color: '#1890ff', marginLeft: 8 }} />;
    }
    
    switch (transferStatus) {
      case 'success':
        return (
          <Tooltip title="变量赋值成功">
            <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />
          </Tooltip>
        );
      case 'error':
        return (
          <Tooltip title="变量赋值失败，点击重试">
            <Button 
              type="text" 
              danger 
              icon={<ReloadOutlined />} 
              size="small"
              onClick={handleRetry}
              style={{ marginLeft: 8, padding: 0 }}
            />
          </Tooltip>
        );
      default:
        return null;
    }
  };

  // 基本视图 - 简洁显示变量传递关系
  const basicView = (
    <Paragraph>
      <Tag style={sourceStyle}>{sourceDisplayId}</Tag>
      <Text> 已经传递给 </Text>
      <Tag style={targetStyle}>{targetDisplayId}</Tag>
      {getTransferStatusIcon()}
      <Button 
        type="link" 
        size="small" 
        onClick={() => setShowDetails(!showDetails)}
        style={{ marginLeft: 8, padding: 0 }}
      >
        {showDetails ? '隐藏详情' : '查看详情'}
      </Button>
    </Paragraph>
  );
  
  // 详细视图 - 显示详细的变量信息，不再使用折叠面板
  const detailView = showDetails && (
    <div style={{ backgroundColor: '#f5f5f5', marginBottom: 16, borderRadius: '4px', padding: '12px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>源变量</Text>
        <div style={{ backgroundColor: '#f7f7f7', padding: '8px', borderRadius: '4px' }}>
          <VariableDetailPanel 
            displayId={sourceDisplayId}
            systemId={sourceSystemId}
            fullId={sourceFullId}
            variableType={sourceType}
            editable={false} // 源变量通常不允许编辑
            autoRefresh={autoRefresh}
          />
        </div>
      </div>
      
      <div>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>目标变量</Text>
        <div style={{ backgroundColor: '#f7f7f7', padding: '8px', borderRadius: '4px' }}>
          <VariableDetailPanel 
            displayId={targetDisplayId}
            systemId={targetSystemId}
            fullId={targetFullId}
            variableType={targetType}
            editable={editable} // 目标变量可能允许编辑
            autoRefresh={autoRefresh}
          />
        </div>
      </div>
    </div>
  );
  
  return (
    <div>
      {basicView}
      {detailView}
    </div>
  );
};

export default ExecutionVariableTransfer;
