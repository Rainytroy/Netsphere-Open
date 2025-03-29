import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

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
  // 获取贝塞尔曲线路径
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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
    </>
  );
};

// 导出边类型映射，用于注册
export const edgeTypes = {
  customAnimated: CustomAnimatedEdge,
};
