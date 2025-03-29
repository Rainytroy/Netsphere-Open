import * as React from 'react';

const SimpleApp: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1>Netsphere</h1>
      <p>应用程序正在启动中...</p>
      <div style={{ marginTop: 24, padding: 16, background: '#f0f2f5', borderRadius: 8 }}>
        <h2>简易模式</h2>
        <p>正在运行一个简化版应用程序以验证React环境是否正常工作。</p>
        <p>这是一个临时页面，用于排查导入组件错误问题。</p>
      </div>
    </div>
  );
};

export default SimpleApp;
