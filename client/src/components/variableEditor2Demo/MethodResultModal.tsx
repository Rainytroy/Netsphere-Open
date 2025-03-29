import React from 'react';
import { Modal, Button } from 'antd';
import { MethodResultModalProps } from './types';

/**
 * 方法结果弹窗
 */
const MethodResultModal: React.FC<MethodResultModalProps> = ({
  visible,
  title,
  result,
  onClose
}) => {
  return (
    <Modal
      title={`方法调用结果: ${title}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={600}
    >
      <pre
        style={{
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: '#f0f0f0',
          overflow: 'auto',
          maxHeight: '400px'
        }}
      >
        {typeof result === 'object'
          ? JSON.stringify(result, null, 2)
          : result}
      </pre>
    </Modal>
  );
};

export default MethodResultModal;
