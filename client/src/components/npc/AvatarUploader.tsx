import React, { useState } from 'react';
import { Upload, message, Avatar } from 'antd';
import { LoadingOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';

interface AvatarUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
}

/**
 * 头像上传组件
 */
const AvatarUploader: React.FC<AvatarUploaderProps> = ({ 
  value, 
  onChange,
  disabled = false 
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(value);

  // 上传前检查文件类型和大小
  const beforeUpload = (file: RcFile) => {
    // 检查文件类型
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return false;
    }
    
    // 限制文件大小为5MB
    const isLessThan5M = file.size / 1024 / 1024 < 5;
    if (!isLessThan5M) {
      message.error('图片必须小于5MB!');
      return false;
    }
    
    return isImage && isLessThan5M;
  };

  // 处理文件上传状态变化
  const handleChange: UploadProps['onChange'] = (info: UploadChangeParam<UploadFile>) => {
    // 如果正在上传中
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    
    // 如果上传完成
    if (info.file.status === 'done') {
      setLoading(false);
      
      // 获取上传后的URL
      const url = info.file.response?.avatar || '';
      setImageUrl(url);
      
      // 调用父组件的onChange函数
      if (onChange) {
        onChange(url);
      }
    }
    
    // 如果上传出错
    if (info.file.status === 'error') {
      setLoading(false);
      message.error('上传头像失败');
    }
  };

  /**
   * 自定义上传请求（用于模拟上传）
   * 实际项目中，这个功能可能由表单组件统一处理
   */
  const customRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    try {
      // 模拟请求延迟
      setTimeout(() => {
        // 创建一个临时URL以便预览
        const objectUrl = URL.createObjectURL(file);
        setImageUrl(objectUrl);
        
        // 通知上传成功
        onSuccess({ avatar: objectUrl }, new XMLHttpRequest());
        
        // 通知父组件
        if (onChange) {
          onChange(objectUrl);
        }
      }, 1000);
    } catch (error) {
      onError(error);
    }
  };

  // 上传按钮
  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  return (
    <Upload
      name="avatar"
      listType="picture-card"
      className="avatar-uploader"
      showUploadList={false}
      beforeUpload={beforeUpload}
      onChange={handleChange}
      customRequest={customRequest}
      disabled={disabled}
    >
      {imageUrl ? (
        <Avatar 
          src={imageUrl} 
          size={96} 
          icon={<UserOutlined />} 
        />
      ) : (
        uploadButton
      )}
    </Upload>
  );
};

export default AvatarUploader;
