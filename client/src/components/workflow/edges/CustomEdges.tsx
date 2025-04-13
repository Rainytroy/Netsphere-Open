import React, { useState } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { CloseOutlined } from '@ant-design/icons';

// 自定义边样式组件
export const CustomAnimatedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) => {
  // 添加悬停状态
  const [isHovered, setIsHovered] = useState(false);
  
  // 获取贝塞尔曲线路径
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  // 计算删除按钮的位置 (始终在线条中点)
  const deleteButtonX = labelX;
  const deleteButtonY = labelY;

  return (
    <>
      {/* 主线 - 完全隐藏，只保留ID以便React Flow正常工作 */}
      <path
        id={id}
        style={{
          ...style,
          strokeDasharray: 'none',
          opacity: 0, // 完全隐藏底层线
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* 动画部分 - 呼吸流动效果 */}
      <path
        style={{
          strokeWidth: 1, // 改为1px线条，更纤细
          strokeLinecap: 'round',
          zIndex: 5, // 确保动画线在上层
        }}
        className="react-flow__edge-path animated-segment"
        d={edgePath}
      />
      
      {/* 删除按钮 - 始终可见但更小巧 */}
      <foreignObject
        width={10}
        height={10}
        x={deleteButtonX - 5}
        y={deleteButtonY - 5}
        style={{ 
          zIndex: 10,
          pointerEvents: 'all' // 确保可点击
        }}
        requiredExtensions="http://www.w3.org/1999/xhtml"
        data-id={id} // 添加ID属性，便于事件处理器识别
      >
        <div
          style={{
            background: '#001529', // 深蓝色纯色
            color: 'white',
            borderRadius: '50%',
            width: '10px',
            height: '10px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            e.stopPropagation(); // 防止事件冒泡
            // 分发自定义事件，FlowCanvas可以通过监听此事件进行删除操作
            const event = new CustomEvent('edge:delete', { detail: { id } });
            window.dispatchEvent(event);
          }}
        >
          {isHovered && <CloseOutlined style={{ fontSize: '8px' }} />}
        </div>
      </foreignObject>
    </>
  );
};

// 导出边类型映射，用于注册
export const edgeTypes = {
  customAnimated: CustomAnimatedEdge,
};
