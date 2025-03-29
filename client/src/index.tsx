import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 如果你想开始测量应用性能，可以传递一个函数
// 来记录结果（例如: reportWebVitals(console.log)）
// 或发送到分析端点。了解更多: https://bit.ly/CRA-vitals
reportWebVitals();
