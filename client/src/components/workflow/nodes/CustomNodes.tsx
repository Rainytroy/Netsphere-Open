import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// 基础节点样式
const baseNodeStyle: React.CSSProperties = {
  padding: '5px 10px', // 减少上下内边距
  borderRadius: '3px',
  width: '150px',
  fontSize: '12px',
  color: '#222',
  textAlign: 'center',
  borderWidth: '1px',
  borderStyle: 'solid',
  transition: 'box-shadow 0.3s ease-in-out', // 添加过渡效果
};

// 输入连接点样式
const inputHandleStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  background: '#1890ff', // 蓝色圆点
  border: '1px solid white',
  top: -20, // 增加偏移量，使连接点远离卡片边缘
  borderRadius: '50%',
};

// 输出连接点样式
const outputHandleStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  background: '#1890ff', // 蓝色圆点
  border: '1px solid white',
  bottom: -20, // 增加偏移量，使连接点远离卡片边缘
  borderRadius: '50%',
};

// Yes连接点样式
const yesHandleStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  background: '#059405', // 使用起点卡的绿色
  border: '1px solid white',
  bottom: -20, // 调整为与其他连接点一致的偏移量
  left: '25%',
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '8px',
  fontWeight: 'normal', // 移除加粗
  fontFamily: 'Arial, sans-serif', // 使用Arial字体
  color: 'white',
};

// No连接点样式
const noHandleStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  background: '#f5222d', // 红色圆点
  border: '1px solid white',
  bottom: -20, // 调整为与其他连接点一致的偏移量
  left: '75%',
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '8px',
  fontWeight: 'normal', // 移除加粗
  fontFamily: 'Arial, sans-serif', // 使用Arial字体
  color: 'white',
};

// 标签样式
const labelStyle: React.CSSProperties = {
  position: 'absolute',
  fontSize: '9px',
  fontWeight: 'bold',
  pointerEvents: 'none',
};

// 起点节点
export const StartNode = ({ data }: NodeProps) => {
  const style: React.CSSProperties = {
    ...baseNodeStyle,
    background: '#d5f5d5',
    borderColor: '#059405',
    position: 'relative',
  };
  
  return (
    <div 
      style={style}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px 2px rgba(5, 148, 5, 0.5)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* 先显示内容 */}
      <div>
        <strong>{data.label || '起点卡'}</strong>
        <div style={{ fontSize: '10px' }}>{data.description}</div>
      </div>
      
      {/* 输出连接点放在后面，与其他节点结构保持一致 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="source" 
          position={Position.Bottom} 
          style={{
            ...outputHandleStyle,
            background: '#059405', // 绿色起点
          }}
        />
      </div>
    </div>
  );
};

// 赋值节点
export const AssignNode = ({ data }: NodeProps) => {
  const style: React.CSSProperties = {
    ...baseNodeStyle,
    background: '#e6f7ff',
    borderColor: '#1890ff',
    position: 'relative',
  };
  
  return (
    <div 
      style={style}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px 2px rgba(24, 144, 255, 0.5)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* 输入连接点 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="target" 
          position={Position.Top} 
          style={inputHandleStyle}
        />
      </div>
      
      <div>
        <strong>{data.label || '赋值卡'}</strong>
        <div style={{ fontSize: '10px' }}>{data.description}</div>
      </div>
      
      {/* 输出连接点 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="source" 
          position={Position.Bottom} 
          style={outputHandleStyle}
        />
      </div>
    </div>
  );
};

// 循环节点
export const LoopNode = ({ data }: NodeProps) => {
  const style: React.CSSProperties = {
    ...baseNodeStyle,
    background: '#fff2e6',
    borderColor: '#fa8c16',
    position: 'relative',
  };
  
  return (
    <div 
      style={style}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px 2px rgba(250, 140, 22, 0.5)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* 输入连接点 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="target" 
          position={Position.Top} 
          style={{
            ...inputHandleStyle,
            background: '#fa8c16', // 黄色 - 循环节点颜色
          }}
        />
      </div>
      
      <div>
        <strong>{data.label || '循环卡'}</strong>
        <div style={{ fontSize: '10px' }}>{data.description}</div>
      </div>
      
      {/* 底部连接点排列 - 移除了中间的Out出点 */}
      <div style={{ position: 'relative' }}>
        {/* No 连接点 (右侧) */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="no" 
          style={noHandleStyle}
        >
          N
        </Handle>

        {/* Yes 连接点 (左侧) */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="yes" 
          style={yesHandleStyle}
        >
          Y
        </Handle>
      </div>
    </div>
  );
};

// 展示节点
export const DisplayNode = ({ data }: NodeProps) => {
  const style: React.CSSProperties = {
    ...baseNodeStyle,
    background: '#f9f0ff',
    borderColor: '#722ed1',
    position: 'relative',
  };
  
  return (
    <div 
      style={style}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px 2px rgba(114, 46, 209, 0.5)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* 输入连接点 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="target" 
          position={Position.Top} 
          style={{
            ...inputHandleStyle,
            background: '#722ed1', // 紫色 - 展示节点颜色
          }}
        />
      </div>
      
      <div>
        <strong>{data.label || '展示卡'}</strong>
        <div style={{ fontSize: '10px' }}>{data.description}</div>
      </div>
      
      {/* 输出连接点 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="source" 
          position={Position.Bottom} 
          style={{
            ...outputHandleStyle,
            background: '#722ed1', // 紫色 - 展示节点颜色
          }}
        />
      </div>
    </div>
  );
};

// 工作任务节点
export const WorkTaskNode = ({ data }: NodeProps) => {
  const style: React.CSSProperties = {
    ...baseNodeStyle,
    background: '#ffffff', // 白色背景
    borderColor: '#001529', // 使用左侧导航的深蓝色边框
    color: '#001529', // 使用左侧导航的深蓝色文字
    position: 'relative',
  };
  
  return (
    <div 
      style={style}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px 2px rgba(0, 21, 41, 0.5)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* 输入连接点 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="target" 
          position={Position.Top} 
          style={{
            ...inputHandleStyle,
            background: '#001529', // 使用左侧导航的深蓝色连接点
            border: '1px solid white',
          }}
        />
      </div>
      
      <div>
        <strong>{data.label || '工作任务卡'}</strong>
        <div style={{ fontSize: '10px' }}>{data.description}</div>
      </div>
      
      {/* 输出连接点 */}
      <div style={{ position: 'relative' }}>
        <Handle 
          type="source" 
          position={Position.Bottom} 
          style={{
            ...outputHandleStyle,
            background: '#001529', // 使用左侧导航的深蓝色连接点
            border: '1px solid white',
          }}
        />
      </div>
    </div>
  );
};

// 节点类型映射表，用于注册
export const nodeTypes = {
  start: StartNode,
  assign: AssignNode,
  loop: LoopNode,
  display: DisplayNode,
  worktask: WorkTaskNode, // 添加工作任务节点类型
};
