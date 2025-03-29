import React from 'react';
import { Modal } from 'antd';

interface DeleteConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  content: string;
}

/**
 * 删除确认弹窗组件
 */
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  title,
  content,
}) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="确认"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      <p>{content}</p>
    </Modal>
  );
};

export default DeleteConfirmModal;
