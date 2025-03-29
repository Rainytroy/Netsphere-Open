import React from 'react';
import { Button, Space } from 'antd';

interface FormActionButtonsProps {
  isEdit: boolean;
  submitting: boolean;
  onCancel: () => void;
}

/**
 * 表单底部操作按钮组件
 * 包含提交和取消按钮
 */
const FormActionButtons: React.FC<FormActionButtonsProps> = ({
  isEdit,
  submitting,
  onCancel
}) => {
  return (
    <Space>
      <Button type="primary" htmlType="submit" loading={submitting}>
        {isEdit ? '保存修改' : '创建任务'}
      </Button>
      <Button onClick={onCancel}>返回</Button>
    </Space>
  );
};

export default FormActionButtons;
