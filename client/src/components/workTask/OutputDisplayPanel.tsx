import * as React from 'react';
import { Card, Typography, Space, Button, message } from 'antd';
import { CopyOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ExecutionStatus, TestExecuteDebugInfo } from '../../services/workTaskService';
import ExecutionStatusPanel from './ExecutionStatusPanel';
import createLogger from '../../utils/logger';

const logger = createLogger('OutputDisplayPanel');

const { Text } = Typography;

interface OutputDisplayPanelProps {
  taskId?: string;                 // 工作任务ID（用于持久化和再次运行）
  output: string;                 // 输出内容
  executionTime: string;          // 执行时间
  executionStatus: ExecutionStatus; // 执行状态
  debugInfo?: TestExecuteDebugInfo | null; // 调试信息(只用于日志，已不再显示)
  onRerun?: () => void;           // 再次运行回调
  serverLogs?: string[];          // 服务端处理日志(不再显示)
}

/**
 * 输出显示面板组件
 * 显示工作任务的执行结果
 * 注意: 服务端日志面板已移除，用户将直接查看服务端日志
 */
const OutputDisplayPanel: React.FC<OutputDisplayPanelProps> = ({
  taskId,
  output,
  executionTime,
  executionStatus,
  debugInfo,
  onRerun,
  serverLogs = [] // 仍然接收参数以保持API兼容性，但不再使用
}) => {
  // 复制输出内容到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(
      () => {
        message.success('已复制输出内容到剪贴板');
      },
      () => {
        message.error('复制失败，请手动选择文本并复制');
      }
    );
  };

  return (
    <div className="output-display-panel">
      {/* 输出内容区域 */}
      <Card 
        className="output-result-card"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <ExecutionStatusPanel 
                executionStatus={executionStatus}
                executionTime={executionTime}
                showTime={false}
                size="default"
              />
              <Text strong>执行结果</Text>
            </Space>
            <Space>
              <Button 
                size="small" 
                type="text" 
                icon={<CopyOutlined />} 
                onClick={handleCopy}
              >
                复制
              </Button>
              {onRerun && (
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={onRerun}
                  disabled={executionStatus === ExecutionStatus.RUNNING}
                >
                  重新运行
                </Button>
              )}
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {executionTime}
              </Text>
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        <div 
          className="output-content"
          style={{ 
            whiteSpace: 'pre-wrap', 
            padding: 16,
            backgroundColor: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            fontSize: '14px',
            lineHeight: '1.6',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {output !== undefined && output !== null && output !== '' ? output : (
            <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
              <div><InfoCircleOutlined style={{ marginRight: 8 }} />尚未生成输出内容</div>
              <div style={{ marginTop: 8, fontSize: '12px' }}>
                点击"输出测试"按钮开始执行任务并生成输出
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OutputDisplayPanel;
