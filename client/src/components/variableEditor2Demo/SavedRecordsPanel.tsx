import React from 'react';
import { Card, List, Button, Tooltip, Typography, Empty, Space, Popconfirm } from 'antd';
import { DeleteOutlined, LoadingOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { SavedRecord } from './types';

const { Text } = Typography;

interface SavedRecordsPanelProps {
  records: SavedRecord[];
  onLoadRecord: (id: string) => void;
  onDeleteRecord: (id: string) => void;
}

/**
 * 已保存记录面板组件
 * 显示用户保存的编辑器内容记录，并提供加载和删除功能
 */
const SavedRecordsPanel: React.FC<SavedRecordsPanelProps> = ({
  records,
  onLoadRecord,
  onDeleteRecord
}) => {
  // 格式化时间戳为可读的时间字符串
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card
      title="已保存记录"
      size="small"
      bodyStyle={{ padding: '8px', maxHeight: '200px', overflow: 'auto' }}
      style={{ marginBottom: '8px' }}
      extra={<Text type="secondary">{records.length ? `共 ${records.length} 条` : ''}</Text>}
    >
      {records.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无保存的记录"
          style={{ margin: '10px 0' }}
        />
      ) : (
        <List
          size="small"
          dataSource={records}
          renderItem={(record) => (
            <List.Item
              key={record.id}
              actions={[
                <Tooltip title="加载此记录" key="load">
                  <Button
                    type="text"
                    size="small"
                    icon={<SyncOutlined />}
                    onClick={() => onLoadRecord(record.id)}
                  />
                </Tooltip>,
                <Popconfirm
                  key="delete"
                  title="确定删除此记录?"
                  okText="确定"
                  cancelText="取消"
                  onConfirm={() => onDeleteRecord(record.id)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              ]}
            >
                <List.Item.Meta
                  title={
                    <Tooltip title={record.preview}>
                      <Text ellipsis style={{ maxWidth: '200px' }}>
                        {record.preview}
                      </Text>
                    </Tooltip>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTimestamp(record.timestamp)}
                      </Text>
                      {record.htmlContent && (
                        <Text type="success" style={{ fontSize: '11px' }}>
                          包含变量标记格式
                        </Text>
                      )}
                    </Space>
                  }
                />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default SavedRecordsPanel;
