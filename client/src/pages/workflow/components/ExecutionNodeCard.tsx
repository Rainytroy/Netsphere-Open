import React, { useState, useEffect, useRef } from 'react';
import { Card, Spin, Typography, Space, Button, Tag, Descriptions } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { ExecutionVariableTransfer } from './variable';
import { WorkTaskExecutor, ExecutionPhase } from './worktask';
import { ExecutionNode, WorkTaskNodeOutput, AssignmentNodeOutput, LoopNodeOutput } from '../types';
import VariableThemeService from '../../../services/VariableThemeService';
import IdentifierFormatterService from '../../../services/IdentifierFormatterService';
import VariableSchemaService from '../../../services/VariableSchemaService';
import { VariableType } from '../../../services/variableService';
import { getNodeIcon } from '../engine/utils/UIHelper';
import { parseRawText } from '../engine/utils/VariableParser';
import { rawTextToResolvedText } from '../../../pages/demo/variable-editor-x/utils/formatters';
import { VariableData } from '../../../pages/demo/variable-editor-x/types';
import { useVariableParser } from '../../../pages/demo/variable-editor-x/hooks/useVariableParser';
import DisplayNodeContent from './nodeContent/DisplayNodeContent';

const { Text, Paragraph } = Typography;

// 执行时间戳接口
interface ExecutionTimestamps {
  startTime?: number;           // 开始执行时间
  apiCallStartTime?: number;    // API调用开始时间
  apiCallEndTime?: number;      // API调用完成时间
  renderCompleteTime?: number;  // 渲染完成时间
  statusCompleteTime?: number;  // 状态变为completed的时间
  nextNodeTime?: number;        // 通知下一节点时间
  renderStartTime?: number;     // 渲染开始时间
}

// 为window对象添加workflowEngine属性和通知器的类型声明
declare global {
  interface Window {
    workflowEngine?: {
      updateNode: (nodeId: string, updates: Partial<ExecutionNode>) => void;
      getNode?: (nodeId: string) => ExecutionNode | undefined;
      getVariables?: () => Record<string, any>;
    };
    // 工作任务完成通知器，用于节点间通信
    workTaskCompletionNotifier?: {
      // 回调函数映射 nodeId -> callback
      callbacks?: Map<string, () => void>;
      // 注册任务完成回调
      registerTaskCompletion: (nodeId: string, callback: () => void) => void;
      // 触发任务完成通知
      notifyTaskCompletion: (nodeId: string) => void;
    };
  }
}

// 扩展WorkTaskNodeOutput类型以包含result属性和时间戳
interface ExtendedWorkTaskNodeOutput extends WorkTaskNodeOutput {
  result?: string;
  timestamps?: any; // 添加时间戳属性
}

// 系统深蓝色(导航深蓝)
const DEEP_BLUE_COLOR = 'rgb(0, 21, 41)';
// 卡片图标的灰色
const ICON_GRAY_COLOR = '#999';

interface ExecutionNodeCardProps {
  node: ExecutionNode;
  isActive: boolean;
  displayMode?: 'simple' | 'detailed';  // 显示模式，默认详细模式
}

/**
 * 基础节点卡片组件
 */
const ExecutionNodeCard: React.FC<ExecutionNodeCardProps> = ({ node, isActive, displayMode = 'detailed' }) => {
  // 根据节点状态确定卡片样式 - 移除syncing的紫色边框，使用默认样式
  const getCardStyle = () => {
    switch (node.status) {
      case 'waiting': return { opacity: 0.6 };
      case 'executing': return { boxShadow: '0 0 5px #1890ff' };
      case 'error': return { boxShadow: '0 0 5px #f5222d' };
      default: return {}; // syncing和completed使用默认样式
    }
  };
  
  // 渲染节点标题（图标+节点名称+执行状态）
  const renderTitle = () => {
    // 获取节点输出状态 - 用于调试
    const nodeOutputStatus = node.output?.status?.state;
    console.log(`[ExecutionNodeCard] 渲染标题 - 节点ID: ${node.id}, 主状态: ${node.status}, 输出状态: ${nodeOutputStatus}`);
    
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Tag 
          color="#f0f0f0" 
          style={{ 
            fontSize: '12px', 
            color: ICON_GRAY_COLOR, 
            padding: '2px 8px', 
            border: '1px solid #d9d9d9',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <span style={{ color: ICON_GRAY_COLOR }}>{getNodeIcon(node.type)}</span>
          <span style={{ marginLeft: 4 }}>{node.name}</span>
        </Tag>
        {node.status === 'executing' && <Spin size="small" style={{ marginLeft: 8 }} />}
        {/* 移除syncing状态显示，避免UI冗余 */}
        {node.status === 'completed' && 
          <CheckCircleFilled style={{ color: DEEP_BLUE_COLOR, marginLeft: 8, fontSize: '16px' }} />
        }
        {node.status === 'error' && 
          <span style={{ color: '#f5222d', marginLeft: 8, fontSize: '16px' }}>❌</span>
        }
      </div>
    );
  };
  
  // 渲染节点内容
  const renderNodeContent = () => {
    // 起点卡和显示卡保持不变，其他类型在精简模式下不渲染内容区域
    if (displayMode === 'simple' && 
        (node.type === 'worktask' || node.type === 'assign' || node.type === 'loop')) {
      // 返回null，不渲染任何内容，只保留标题栏
      return null;
    }
    
    // 详细模式或起点卡/显示卡，保持现有逻辑
    switch (node.type) {
      case 'start':
        return <StartNodeContent node={node} />;
      case 'worktask':
        return <WorkTaskNodeContent node={node} />;
      case 'display':
        return <DisplayNodeContent node={node} />;
      case 'assign':
        return <AssignmentNodeContent node={node} />;
      case 'loop':
        return <LoopNodeContent node={node} />;
      default:
        return null;
    }
  };
  
  return (
    <Card
      title={renderTitle()}
      bordered
      className={`node-card ${isActive ? 'active' : ''}`}
      style={{
        marginBottom: 16,
        ...getCardStyle()
      }}
      headStyle={{ 
        paddingBottom: 8,
        borderBottom: 'none'
      }}
      bodyStyle={{ 
        paddingTop: 0
      }}
    >
      {renderNodeContent()}
    </Card>
  );
};

/**
 * 起点卡内容组件 - 增加生成式动画效果
 */
const StartNodeContent: React.FC<{ node: ExecutionNode }> = ({ node }) => {
  const [displayText, setDisplayText] = useState('');
  const fullText = "Netsphere因为你的需求开始运行……";
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  
  // 生成式动画效果 - 使用正确的打字效果实现
  useEffect(() => {
    // 重置状态，确保每次组件挂载或状态变化时从头开始
    setDisplayText('');
    indexRef.current = 0;
    
    // 清除可能存在的旧定时器
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    if (node.status === 'executing' || node.status === 'completed') {
      // 创建新的动画定时器
      animationRef.current = setInterval(() => {
        if (indexRef.current < fullText.length) {
          // 替换为完全重新设置字符串，避免累加可能导致的问题
          setDisplayText(fullText.substring(0, indexRef.current + 1));
          indexRef.current += 1;
        } else {
          // 动画完成时清除定时器
          if (animationRef.current) {
            clearInterval(animationRef.current);
            animationRef.current = null;
          }
        }
      }, 50);
      
      // 组件卸载时清理定时器
      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
      };
    }
  }, [node.status]);
  
  return (
    <div>
      <Text>{displayText}</Text>
    </div>
  );
};

/**
 * 循环卡内容组件
 */
const LoopNodeContent: React.FC<{ node: ExecutionNode }> = ({ node }) => {
  const output = node.output as LoopNodeOutput | undefined;
  if (!output) return <Paragraph>循环条件尚未执行</Paragraph>;
  
  const { conditionType, runCount, maxRuns, variablePath, result } = output;
  
  if (conditionType === 'runCount') {
    return (
      <div>
        <Text strong>
          【运行次数 {runCount}/{maxRuns}】
        </Text>
        <Paragraph>
          {runCount && maxRuns && runCount < maxRuns 
            ? '继续循环肝' 
            : '完成任务，交作业给下一个环节'}
        </Paragraph>
      </div>
    );
  } else {
    return (
      <div>
        <Text strong>
          <Tag 
            style={getVariableTagStyle(variablePath || '')}
          >
            {variablePath || '未知变量'}
          </Tag> 的值
        </Text>
        <Paragraph>
          {result === 'yes'
            ? '符合Netsphere的想法，所以是YES'
            : '不符合Netsphere的想法，所以是NO'}
        </Paragraph>
      </div>
    );
  }
};


/**
 * 根据变量类型获取标签样式
 */
const getVariableTagStyle = (displayId: string) => {
  // 从显示标识符中推断变量类型
  const variableType = getVariableTypeFromDisplayId(displayId);
  
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

/**
 * 从系统标识符中提取完整ID
 */
const extractFullIdFromSystemId = (systemId: string): string => {
  if (!systemId || !systemId.startsWith('@gv_') || !systemId.endsWith('-=')) {
    return '';
  }
  
  // 移除前缀和后缀
  return systemId.substring(4, systemId.length - 2);
};

/**
 * 从变量显示标识符中提取类型
 */
const getVariableTypeFromDisplayId = (displayId: string): string => {
  const lowerCaseId = displayId.toLowerCase();
  
  if (lowerCaseId.includes('npc')) {
    return 'npc';
  } else if (lowerCaseId.includes('task')) {
    return 'task';
  } else if (lowerCaseId.includes('workflow')) {
    return 'workflow';
  } else if (lowerCaseId.includes('file')) {
    return 'file';
  }
  return 'custom';
};

/**
 * 从系统标识符直接提取类型
 */
const getTypeFromSystemId = (systemId: string): string => {
  if (!systemId || !systemId.startsWith('@gv_') || !systemId.endsWith('-=')) {
    return 'custom';
  }
  
  // 尝试从标识符中提取类型前缀
  const match = systemId.match(/@gv_([a-z]+)_/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  
  return 'custom';
};

/**
 * 从DisplayIdMap中获取系统标识符
 */
const getSystemIdFromDisplayMap = (displayId: string, displayIdMap: Record<string, string>): string => {
  // 反向查找对应的系统标识符
  for (const [sysId, dispId] of Object.entries(displayIdMap)) {
    if (dispId === displayId) {
      return sysId;
    }
  }
  return '';
};

/**
 * 赋值卡内容组件 - 使用新的变量组件
 */
const AssignmentNodeContent: React.FC<{ node: ExecutionNode }> = ({ node }) => {
  const output = node.output as AssignmentNodeOutput | undefined;
  
  if (!output?.assignments || output.assignments.length === 0) {
    return <Paragraph>尚未完成赋值操作</Paragraph>;
  }

  // 获取变量上下文和标识符映射
  const variableContext = output.variableContext?.variables || node.executionData?.variables || {};
  const displayIdMap = output.variableContext?.displayIdMap || node.config?.displayIdMap || {};
  const variableTypes = output.variableContext?.variableTypes || node.config?.variableTypes || {};
  
  return (
    <div className="assignment-node-content">
      {output.assignments.map((assignment, index) => {
        // 获取源变量和目标变量的系统标识符
        const sourceSystemId = getSystemIdFromDisplayMap(assignment.sourceDisplayId, displayIdMap) || '';
        const targetSystemId = getSystemIdFromDisplayMap(assignment.targetDisplayId, displayIdMap) || '';
        
        // 从系统标识符提取完整ID
        const sourceFullId = extractFullIdFromSystemId(sourceSystemId);
        const targetFullId = extractFullIdFromSystemId(targetSystemId);
        
        // 根据显示标识符推测类型
        const sourceDisplayType = getVariableTypeFromDisplayId(assignment.sourceDisplayId);
        const targetDisplayType = getVariableTypeFromDisplayId(assignment.targetDisplayId);

        // 直接从系统标识符提取类型（这是比较可靠的方法）
        const sourceSystemType = getTypeFromSystemId(sourceSystemId);
        const targetSystemType = getTypeFromSystemId(targetSystemId);
        
        // 从赋值记录中检查有无类型信息
        // 这些信息存储在输出的variableContext和displayIdMap中
        const varTypes = output.variableContext?.variableTypes || {};
        
        // 优先使用：1)系统标识符中直接解析出的类型 2)变量类型映射 3)显示ID推断的类型
        const sourceOriginalType = sourceSystemType !== 'custom' ? sourceSystemType : 
          (sourceSystemId && varTypes[sourceSystemId] ? varTypes[sourceSystemId] : sourceDisplayType);
          
        const targetOriginalType = targetSystemType !== 'custom' ? targetSystemType :
          (targetSystemId && varTypes[targetSystemId] ? varTypes[targetSystemId] : targetDisplayType);
        
        // 直接使用变量当前值（调试面板显示的值）
        const currentValue = variableContext[sourceFullId];
        
        return (
          <ExecutionVariableTransfer 
            key={index}
            sourceDisplayId={assignment.sourceDisplayId}
            sourceSystemId={sourceSystemId}
            sourceFullId={sourceFullId}
            sourceType={sourceOriginalType}
            
            targetDisplayId={assignment.targetDisplayId}
            targetSystemId={targetSystemId}
            targetFullId={targetFullId}
            targetType={targetOriginalType}
            
            transferValue={currentValue || assignment.value}
            editable={true}
            autoRefresh={true}
          />
        );
      })}
    </div>
  );
};

/**
 * 手动完成节点函数类型
 */
declare global {
  interface Window {
    // ...现有的声明
    manualCompleteWorkTaskNode?: (nodeId: string) => void;
  }
}

/**
 * 工作任务卡内容组件
 */
const WorkTaskNodeContent: React.FC<{ node: ExecutionNode }> = ({ node }) => {
  const output = node.output as WorkTaskNodeOutput | undefined;
  const [showDebug, setShowDebug] = useState(false);
  // 时间戳状态
  const [timestamps, setTimestamps] = useState<ExecutionTimestamps>({});
  // 手动完成状态
  const [isCompleting, setIsCompleting] = useState(false);
  
  // 提取必要的属性
  const workTaskId = node.config?.workTaskId || output?.taskId;
  const taskName = output?.taskName || node.config?.taskName || node.name;
  const npc = output?.npc || node.config?.npc;
  
  // 完成工作任务节点 - 现在改为自动完成，不再需要手动点击
  const handleAutoComplete = () => {
    if (!node.id) return;
    
    setIsCompleting(true);
    console.log(`[ExecutionNodeCard] 自动完成工作任务节点: ${node.id}`);
    
    try {
      // 调用全局函数完成节点
      if (window.manualCompleteWorkTaskNode) {
        window.manualCompleteWorkTaskNode(node.id);
        
        // 添加一个延时来重置加载状态，确保UI显示成功
        setTimeout(() => {
          setIsCompleting(false);
          console.log(`[ExecutionNodeCard] 重置状态完成`);
        }, 2000);
      } else {
        console.error('[ExecutionNodeCard] 全局完成函数不存在');
        setIsCompleting(false);
      }
    } catch (error) {
      console.error('[ExecutionNodeCard] 自动完成节点出错:', error);
      setIsCompleting(false);
    }
  };
  
  // 监听变量同步状态，当同步完成时自动触发完成函数
  useEffect(() => {
    // 当节点处于同步状态且变量同步已完成时，自动触发完成
    if (node.status === 'syncing' && output?.variableSyncStatus && !isCompleting) {
      console.log(`[ExecutionNodeCard] 检测到变量同步已完成，自动触发完成函数`);
      // 使用短暂延迟确保UI状态更新
      setTimeout(() => {
        handleAutoComplete();
      }, 500);
    }
  }, [node.status, output?.variableSyncStatus, isCompleting, node.id]);
  
  // 处理状态变更回调
  const handleStatusChange = (status: {
    phase: ExecutionPhase;
    progress: number;
    message?: string;
  }) => {
    // 更新节点输出状态
    if (node.id && status) {
      // 获取当前时间
      const stateChangeTime = new Date().toISOString();
      
      // 计算新的状态 - 永远不自动设置为completed，保持当前状态或使用running
      const newState = 
        status.phase === ExecutionPhase.ERROR ? 'error' : 
        node.status === 'syncing' ? 'syncing' : 'running';
      
      console.log(`[ExecutionNodeCard] [${stateChangeTime}] 状态变更: 阶段=${status.phase}, 进度=${status.progress}%, 新状态=${newState}`);
      
      // 更新节点输出
      const nodeOutput: WorkTaskNodeOutput = {
        ...(node.output as WorkTaskNodeOutput || {}),
        taskName: taskName,
        status: {
          progress: status.progress,
          state: newState
        },
        // 添加更多调试信息
        debugInfo: {
          originalPhase: status.phase,
          statusChangeTime: stateChangeTime,
          preventedAutoComplete: status.phase === ExecutionPhase.COMPLETED ? true : undefined,
          message: status.message
        }
      };
      
      // 通过WorkflowEngine更新节点输出
      if (window.workflowEngine) {
        window.workflowEngine.updateNode(node.id, { output: nodeOutput });
      }
    }
  };
  
  // 处理API调用完成回调
  const handleComplete = (output: string, execTimestamps: ExecutionTimestamps) => {
    // 保存时间戳
    setTimestamps(execTimestamps);
    
    // 仅更新节点输出，不改变节点状态
    if (node.id) {
      const nodeOutput: ExtendedWorkTaskNodeOutput = {
        ...(node.output as WorkTaskNodeOutput || {}),
        taskName: taskName,
        status: {
          progress: 70, // 显示70%进度，表示API调用完成但渲染尚未完成
          state: 'running'
        },
        result: output,
        timestamps: execTimestamps
      };
      
      // 通过WorkflowEngine更新节点输出，但不更改状态
      if (window.workflowEngine) {
        window.workflowEngine.updateNode(node.id, { 
          output: nodeOutput as any // 使用any类型绕过类型检查
        });
      }
    }
  };
  
  // 处理结果渲染完成回调
  const handleRenderComplete = (output: string, execTimestamps: ExecutionTimestamps) => {
    // 更新时间戳
    const updatedTimestamps = {...execTimestamps};
    setTimestamps(updatedTimestamps);
    
    // 记录渲染完成时间，但不自动设置状态为completed
    const renderCompleteTime = Date.now();
    const renderTimeFormatted = new Date(renderCompleteTime).toISOString();
    updatedTimestamps.renderCompleteTime = renderCompleteTime;
    
    console.log(`[ExecutionNodeCard] [${renderTimeFormatted}] 任务结果已渲染完成: ${node.id}`);
    
    // 更新节点输出，如果节点状态已经是completed，则保持状态为completed
    if (node.id) {
      const nodeOutput: ExtendedWorkTaskNodeOutput = {
        ...(node.output as WorkTaskNodeOutput || {}),
        status: {
          progress: 100, // 保持100%进度
          // 如果节点主状态已经是completed，则输出状态也应该是completed
          state: node.status === 'completed' ? 'completed' : 
                 node.status === 'syncing' ? 'syncing' : 'running'
        },
        timestamps: updatedTimestamps,
        renderComplete: true, // 标记渲染已完成
        renderCompleteTime: renderTimeFormatted // 记录渲染完成时间
      };
      
      console.log(`[ExecutionNodeCard] 更新节点输出 - 节点ID: ${node.id}, 主状态: ${node.status}, 设置输出状态为: ${nodeOutput.status.state}`);
      
      // 通过WorkflowEngine更新节点输出，但不改变状态
      if (window.workflowEngine) {
        console.log(`[ExecutionNodeCard] 更新节点输出，但保持节点 ${node.id} 状态为 ${node.status}`);
        window.workflowEngine.updateNode(node.id, { 
          output: nodeOutput as any
          // 不再设置status为completed
        });
        
        // 不再自动通知任务完成
        // 改为等待手动完成按钮触发
      }
    }
  };
  
  // 格式化时间戳为可读格式
  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '未记录';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
    } catch (error) {
      return timestamp.toString();
    }
  };
  
  // 格式化时间差为可读格式
  const formatTimeDiff = (startTime?: number, endTime?: number): string => {
    if (!startTime || !endTime) return '未知';
    const diff = endTime - startTime;
    return `${diff} ms`;
  };
  
  // 调试面板显示
  const renderDebugPanel = () => {
    // 提取时间戳，优先使用状态中的时间戳，其次使用节点输出中的时间戳
    const ts = timestamps || (output as ExtendedWorkTaskNodeOutput)?.timestamps || {};
    
    return (
      showDebug && (
        <div style={{ 
          padding: '12px', 
          marginTop: '16px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '6px',
          border: '1px solid #e8e8e8'
        }}>
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: '16px' }}>
            工作任务信息
          </Typography.Title>
          
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="任务ID">
              <Text code>{workTaskId || '未定义'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="名称">{taskName || '未定义'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {output?.status ? `${output.status.state} (${output.status.progress}%)` : '未执行'}
            </Descriptions.Item>
            
            {/* 时间戳信息 */}
            <Descriptions.Item label="开始执行时间">
              {formatTimestamp(ts.startTime)}
            </Descriptions.Item>
            <Descriptions.Item label="API调用开始时间">
              {formatTimestamp(ts.apiCallStartTime)}
            </Descriptions.Item>
            <Descriptions.Item label="API调用完成时间">
              {formatTimestamp(ts.apiCallEndTime)}
            </Descriptions.Item>
            <Descriptions.Item label="渲染完成时间">
              {formatTimestamp(ts.renderCompleteTime)}
            </Descriptions.Item>
            <Descriptions.Item label="状态变为completed时间">
              {formatTimestamp(ts.statusCompleteTime)}
            </Descriptions.Item>
            <Descriptions.Item label="通知下一节点时间">
              {formatTimestamp(ts.nextNodeTime)}
            </Descriptions.Item>
            
            {/* 时间差分析 */}
            <Descriptions.Item label="API调用耗时">
              {formatTimeDiff(ts.apiCallStartTime, ts.apiCallEndTime)}
            </Descriptions.Item>
            <Descriptions.Item label="渲染耗时">
              {formatTimeDiff(ts.apiCallEndTime, ts.renderCompleteTime)}
            </Descriptions.Item>
            <Descriptions.Item label="状态更新耗时">
              {formatTimeDiff(ts.renderCompleteTime, ts.statusCompleteTime)}
            </Descriptions.Item>
            <Descriptions.Item label="通知下一节点耗时">
              {formatTimeDiff(ts.statusCompleteTime, ts.nextNodeTime)}
            </Descriptions.Item>
            <Descriptions.Item label="总耗时">
              {formatTimeDiff(ts.startTime, ts.nextNodeTime)}
            </Descriptions.Item>
          </Descriptions>
        </div>
      )
    );
  };
  
  // 如果没有任务ID，则回退到简单展示
  if (!workTaskId) {
    return (
      <div>
        <Paragraph>
          <Text strong>{taskName}</Text> 未配置任务ID，无法执行
        </Paragraph>
        
        <div style={{ marginTop: '16px' }}>
          <Button 
            type="link" 
            onClick={() => setShowDebug(!showDebug)}
            style={{ padding: 0, color: '#1890ff' }}
          >
            {showDebug ? '隐藏详情' : '查看详情'}
          </Button>
        </div>
        
        {renderDebugPanel()}
      </div>
    );
  }
  
  // 使用工作任务执行器组件
  return (
    <div>
      <WorkTaskExecutor
        workTaskId={workTaskId}
        taskName={taskName}
        npc={npc}
        autoExecute={node.status === 'executing' || node.status === 'completed'}
        simplified={false}
        onStatusChange={handleStatusChange}
        onComplete={handleComplete}
        onRenderComplete={handleRenderComplete}
      />
      
      {/* 当节点处于同步状态时显示同步信息 - 已完成状态不显示 */}
      {node.status === 'syncing' && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          {/* 自动模式下显示状态提示 */}
          <div style={{ 
            padding: '8px 16px', 
            backgroundColor: '#e6f7ff', 
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            marginBottom: '8px',
            display: isCompleting ? 'none' : 'block' // 自动执行时隐藏此消息
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {output?.variableSyncStatus ? 
                '✅ 变量同步已完成，工作流将自动继续' : 
                '⏳ 变量同步中，请等待...'
              }
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {output?.variableSyncStatus ? 
                `同步耗时: ${output?.syncInfo?.syncWaitTime || '计算中...'} · 已启用自动模式` : 
                '启用自动模式，同步完成后将自动继续'
              }
            </div>
          </div>
          
          {/* 执行中显示加载状态 */}
          {isCompleting && (
            <div style={{ padding: '8px 0' }}>
              <Spin size="small" />
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#1890ff' }}>
                正在自动执行下一步...
              </div>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          type="link" 
          onClick={() => setShowDebug(!showDebug)}
          style={{ padding: 0, color: '#1890ff' }}
        >
          {showDebug ? '隐藏详情' : '查看详情'}
        </Button>
        
      {/* 删除状态显示文本 */}
      </div>
      
      {renderDebugPanel()}
    </div>
  );
};

export default ExecutionNodeCard;
