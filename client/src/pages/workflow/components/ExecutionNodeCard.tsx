import React, { useState, useEffect, useRef } from 'react';
import { Card, Spin, Typography, Space, Button, Progress, Tag } from 'antd';
import { CopyOutlined, DownloadOutlined, CheckCircleFilled } from '@ant-design/icons';
import { ExecutionVariableTransfer } from './variable';
import { ExecutionNode, WorkTaskNodeOutput, DisplayNodeOutput, AssignmentNodeOutput, LoopNodeOutput } from '../types';
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
 * 工作任务卡内容组件
 */
const WorkTaskNodeContent: React.FC<{ node: ExecutionNode }> = ({ node }) => {
  const output = node.output as WorkTaskNodeOutput | undefined;
  const { npc, taskName, status } = output || {};
  
  return (
    <div>
      {npc ? (
        <Paragraph>
          <Text strong>{npc}</Text> 负责的 <Text strong>{taskName}</Text> 正在运行
        </Paragraph>
      ) : (
        <Paragraph>
          <Text strong>{taskName}</Text> 正在运行
        </Paragraph>
      )}
      
      {/* 简化的任务状态展示 */}
      {status && (
        <div style={{ marginTop: 8 }}>
          <Progress 
            percent={status.progress} 
            status={status.state === 'completed' ? 'success' : 
                   status.state === 'error' ? 'exception' : 'active'} 
            size="small" 
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            {status.state === 'completed' ? '任务已完成' : 
             status.state === 'error' ? '任务执行出错' : '任务执行中...'}
          </div>
        </div>
      )}
    </div>
  );
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

export default ExecutionNodeCard;
