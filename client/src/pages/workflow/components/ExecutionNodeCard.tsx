import React, { useState, useEffect, useRef } from 'react';
import { Card, Spin, Typography, Space, Button, Progress, Tag, Descriptions } from 'antd';
import { CopyOutlined, DownloadOutlined, CheckCircleFilled } from '@ant-design/icons';
import { ExecutionVariableTransfer } from './variable';
import { WorkTaskExecutor, ExecutionPhase } from './worktask';
import { ExecutionNode, WorkTaskNodeOutput, DisplayNodeOutput, AssignmentNodeOutput, LoopNodeOutput } from '../types';

// 为window对象添加workflowEngine属性和通知器的类型声明
declare global {
  interface Window {
    workflowEngine?: {
      updateNode: (nodeId: string, updates: Partial<ExecutionNode>) => void;
      getNode?: (nodeId: string) => ExecutionNode | undefined;
    };
    // 工作任务完成通知器，用于节点间通信
    workTaskCompletionNotifier?: {
      // 注册任务完成回调
      registerTaskCompletion: (nodeId: string, callback: () => void) => void;
      // 触发任务完成通知
      notifyTaskCompletion: (nodeId: string) => void;
    };
  }
}

// 扩展WorkTaskNodeOutput类型以包含result属性
interface ExtendedWorkTaskNodeOutput extends WorkTaskNodeOutput {
  result?: string;
}
import VariableThemeService from '../../../services/VariableThemeService';
import IdentifierFormatterService from '../../../services/IdentifierFormatterService';
import VariableSchemaService from '../../../services/VariableSchemaService';
import { VariableType } from '../../../services/variableService';
import { getNodeIcon } from '../engine/utils/UIHelper';
import ReactMarkdown from 'react-markdown';
import { parseRawText } from '../engine/utils/VariableParser';
import { rawTextToResolvedText } from '../../../pages/demo/variable-editor-x/utils/formatters';
import { VariableData } from '../../../pages/demo/variable-editor-x/types';
import { useVariableParser } from '../../../pages/demo/variable-editor-x/hooks/useVariableParser';

const { Text, Paragraph } = Typography;

// 系统深蓝色(导航深蓝)
const DEEP_BLUE_COLOR = 'rgb(0, 21, 41)';
// 卡片图标的灰色
const ICON_GRAY_COLOR = '#999';

interface ExecutionNodeCardProps {
  node: ExecutionNode;
  isActive: boolean;
}

/**
 * 基础节点卡片组件
 */
const ExecutionNodeCard: React.FC<ExecutionNodeCardProps> = ({ node, isActive }) => {
  // 根据节点状态确定卡片样式
  const getCardStyle = () => {
    switch (node.status) {
      case 'waiting': return { opacity: 0.6 };
      case 'executing': return { boxShadow: '0 0 5px #1890ff' };
      case 'error': return { boxShadow: '0 0 5px #f5222d' };
      default: return {};
    }
  };
  
  // 渲染节点标题（图标+节点名称+执行状态）
  const renderTitle = () => (
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
      {node.status === 'completed' && 
        <CheckCircleFilled style={{ color: DEEP_BLUE_COLOR, marginLeft: 8, fontSize: '16px' }} />
      }
      {node.status === 'error' && 
        <span style={{ color: '#f5222d', marginLeft: 8, fontSize: '16px' }}>❌</span>
      }
    </div>
  );
  
  // 渲染节点内容
  const renderNodeContent = () => {
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
          【{variablePath}】的值
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
 * 展示卡内容组件
 */
const DisplayNodeContent: React.FC<{ node: ExecutionNode }> = ({ node }) => {
  const output = node.output as DisplayNodeOutput | undefined;
  const { content, animationComplete } = output || {};
  
  // 无调试代码
  
  // 处理复制文本
  const handleCopyText = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      // 使用message组件需要导入，这里直接使用alert
      alert('内容已复制到剪贴板');
    }
  };
  
  // 处理下载Markdown
  const handleDownloadMarkdown = () => {
    if (!content) return;
    
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${node.name.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    alert('Markdown文件已下载');
  };
  
  // 渲染内容展示区域
  const renderContent = () => {
    if (!content) {
      return <div className="no-content">暂无内容</div>;
    }
    
    // 无调试代码
    
    try {
      // 使用ReactMarkdown渲染，设置安全配置
      return (
        <div className="markdown-content">
          <ReactMarkdown
            // 确保常见的Markdown语法可用
            skipHtml={false}
            // 显示异常处理
            children={content}
          />
        </div>
      );
    } catch (error) {
      console.error(`[DisplayNodeContent] Markdown渲染错误:`, error);
      // 渲染错误时回退到纯文本显示
      return (
        <div className="markdown-content fallback">
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {content}
          </pre>
        </div>
      );
    }
  };
  
  return (
    <div>
      {renderContent()}
      
      {animationComplete && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button 
              icon={<CopyOutlined />} 
              onClick={handleCopyText}
            >
              复制文本
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleDownloadMarkdown}
            >
              下载Markdown
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

/**
 * 从系统标识符中提取完整ID
 * 例如：从 "@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_description-=" 提取 "npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_description"
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
 * 通过关键字匹配判断变量类型
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
 * 例如：从 "@gv_task_c05d073b-081e-4337-a249-fe13e03ca7d4_output-=" 提取 "task"
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

  // 无调试日志
  
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
        
        // 无调试日志
        
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
        
        // 无调试日志
        
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
 * 工作任务卡内容组件
 */
const WorkTaskNodeContent: React.FC<{ node: ExecutionNode }> = ({ node }) => {
  const output = node.output as WorkTaskNodeOutput | undefined;
  const [showDebug, setShowDebug] = useState(false);
  
  // 提取必要的属性
  const workTaskId = node.config?.workTaskId || output?.taskId;
  const taskId = node.config?.taskId; // 用于调试，检查旧版属性
  const taskName = output?.taskName || node.config?.taskName || node.name;
  const npc = output?.npc || node.config?.npc;
  const aiService = node.config?.aiService || '未定义';
  const inputPrompt = node.config?.inputPrompt || node.config?.input || '未定义';
  
  // 处理状态变更回调
  const handleStatusChange = (status: {
    phase: ExecutionPhase;
    progress: number;
    message?: string;
  }) => {
    console.log(`[WorkTaskNodeContent] 任务状态更新: ${status.phase}, 进度: ${status.progress}%`);
    
    // 更新节点输出状态
    if (node.id && status) {
      // 更新节点输出
      const nodeOutput: WorkTaskNodeOutput = {
        ...(node.output as WorkTaskNodeOutput || {}),
        taskName: taskName,
        status: {
          progress: status.progress,
          state: status.phase === ExecutionPhase.COMPLETED ? 'completed' : 
                 status.phase === ExecutionPhase.ERROR ? 'error' : 'running'
        }
      };
      
      // 通过WorkflowEngine更新节点
      if (window.workflowEngine) {
        window.workflowEngine.updateNode(node.id, { output: nodeOutput });
        console.log(`[WorkTaskNodeContent] 更新节点输出: ${node.id}`, nodeOutput);
      }
    }
  };
  
  // 处理完成回调
  const handleComplete = (output: string) => {
    console.log(`[WorkTaskNodeContent] 任务执行完成: ${workTaskId}, 输出: ${output.substring(0, 50)}...`);
    
    // 更新节点输出
    if (node.id) {
      const nodeOutput: ExtendedWorkTaskNodeOutput = {
        ...(node.output as WorkTaskNodeOutput || {}),
        taskName: taskName,
        status: {
          progress: 100,
          state: 'completed'
        },
        result: output
      };
      
      // 通过WorkflowEngine更新节点
      if (window.workflowEngine) {
        window.workflowEngine.updateNode(node.id, { 
          output: nodeOutput as any, // 使用any类型绕过类型检查
          status: 'completed'
        });
        console.log(`[WorkTaskNodeContent] 更新节点输出并标记完成: ${node.id}`);
        
        // UI组件处理完成后，通知任务节点真正完成了
        // 这将触发WorkTaskNodeHandler中注册的回调，继而执行下一个节点
        setTimeout(() => {
          if (window.workTaskCompletionNotifier) {
            console.log(`[WorkTaskNodeContent] 通知工作任务真正完成: ${node.id}`);
            window.workTaskCompletionNotifier.notifyTaskCompletion(node.id);
          }
        }, 100); // 短暂延迟确保UI状态已更新，特别是变量写入完成
      }
    }
  };
  
  // 调试面板显示核心信息
  const renderDebugPanel = () => {
    return (
      showDebug && (
        <div style={{ 
          padding: '12px', 
          marginTop: '16px',
          marginBottom: '10px',
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
          </Descriptions>
        </div>
      )
    );
  };
  
  // 如果没有任务ID，则回退到旧的展示方式
  if (!workTaskId) {
    return (
      <div>
        <Paragraph>
          <Text strong>{taskName}</Text> 未配置任务ID，无法执行
        </Paragraph>
        
        <div style={{ marginTop: '16px', textAlign: 'left' }}>
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
  
  // 使用新的工作任务执行器组件
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
      />
      
      <div style={{ marginTop: '16px', textAlign: 'left' }}>
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
};

export default ExecutionNodeCard;
