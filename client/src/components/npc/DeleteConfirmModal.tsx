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
  // 处理确认按钮点击，阻止事件冒泡
  const handleConfirm = (e: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发卡片点击事件
    e.stopPropagation();
    onConfirm();
  };

  // 处理取消按钮点击，阻止事件冒泡
  const handleCancel = (e: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发卡片点击事件
    e.stopPropagation();
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      onOk={handleConfirm}
      okText="确认"
      cancelText="取消"
      okButtonProps={{ danger: true }}
      // 防止点击模态框背景时事件冒泡到卡片
      maskStyle={{ pointerEvents: 'auto' }}
      // 防止点击模态框内容时事件冒泡
      modalRender={(node) => (
        <div onClick={(e) => e.stopPropagation()}>
          {node}
        </div>
      )}
    >
      <p>{content}</p>
    </Modal>
  );
};

export default DeleteConfirmModal;
