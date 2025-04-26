import * as React from 'react';
import { ensureGlobalVariableSyncEventListenerExists } from './services/VariableSyncEventListener';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
// NPC模块页面
import NpcListPage from './pages/npc/NpcListPage';
import NpcCreatePage from './pages/npc/NpcCreatePage';
import NpcEditPage from './pages/npc/NpcEditPage';
// 设置页面
import SettingsPage from './pages/settings/SettingsPage';
// 全局变量模块页面
import VariableListPage from './pages/variable/VariableListPage';
import VariableCreatePage from './pages/variable/VariableCreatePage';
import VariableEditPage from './pages/variable/VariableEditPage';
import VariableDebugPage from './pages/variable/VariableDebugPage';
import SseTestPage from './pages/variable/SseTestPage';
// AI服务模块页面
import AiServiceListPage from './pages/aiService/AiServiceListPage';
import AiServiceCreatePage from './pages/aiService/AiServiceCreatePage';
import AiServiceEditPage from './pages/aiService/AiServiceEditPage';
// 工作任务模块页面
import WorkTaskListPage from './pages/workTask/WorkTaskListPage';
import WorkTaskCreatePage from './pages/workTask/WorkTaskCreatePage';
import WorkTaskEditPage from './pages/workTask/WorkTaskEditPage';
// 工作流模块页面
import WorkflowListPage from './pages/workflow/WorkflowListPage';
import WorkflowCreatePage from './pages/workflow/WorkflowCreatePage';
import WorkflowEditPage from './pages/workflow/WorkflowEditPage';
import WorkflowUsePage from './pages/workflow/WorkflowUsePage';
// 演示模块页面
import EditorDemo from './pages/demo/EditorDemo';
import VariableEditor2Demo from './components/VariableEditor2Demo';
import VariableEditor2DemoRefactored from './components/VariableEditor2Demo.refactored';
import VariableEditorEnhancedDemo from './pages/demo/variable-editor-enhanced/DemoPage';
// 使用最新的重构版VariableEditorXDemo
import VariableEditorXDemo from './pages/demo/variable-editor-x/DemoPage';
// 变量编辑器包装组件示例
import VariableEditorWrapperDemo from './pages/demo/variable-editor-wrapper-demo';
// 执行状态指示器演示
import ExecutionStatusDemo from './pages/demo/execution-status-demo';
// 赋值节点演示页面
import AssignmentNodeDemo from './pages/workflow/demo/AssignmentNodeDemo';
import { ENABLE_WORKFLOW } from './config';

function App() {
  // 初始化变量同步事件监听器 - 确保应用一启动就连接到SSE服务
  React.useEffect(() => {
    // 初始化全局变量同步事件监听器
    ensureGlobalVariableSyncEventListenerExists();
    console.log('[App] 已初始化变量同步事件监听器');
  }, []);

  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            
            {/* NPC模块路由 */}
            <Route path="/npc/list" element={<NpcListPage />} />
            <Route path="/npc/create" element={<NpcCreatePage />} />
            <Route path="/npc/edit/:id" element={<NpcEditPage />} />
            
            {/* 全局变量模块路由 */}
            <Route path="/variable/list" element={<VariableListPage />} />
            <Route path="/variable/create" element={<VariableCreatePage />} />
            <Route path="/variable/edit/:id" element={<VariableEditPage />} />
            <Route path="/variable/debug" element={<VariableDebugPage />} />
            {/* Redirect to the new SSE test page */}
            <Route path="/variable/sync-monitor" element={<SseTestPage />} />
            <Route path="/variable/sse-test" element={<SseTestPage />} />
            
            {/* AI服务模块路由 */}
            <Route path="/ai-service" element={<AiServiceListPage />} />
            <Route path="/ai-service/create" element={<AiServiceCreatePage />} />
            <Route path="/ai-service/edit/:id" element={<AiServiceEditPage />} />
            
            {/* 工作任务模块路由 */}
            <Route path="/task" element={<WorkTaskListPage />} />
            <Route path="/work-task/create" element={<WorkTaskCreatePage />} />
            <Route path="/work-task/edit/:id" element={<WorkTaskEditPage />} />
            
            {/* 工作流模块路由 - 受功能标记控制 */}
            {ENABLE_WORKFLOW && (
              <>
                <Route path="/workflow" element={<WorkflowListPage />} />
                {/* 创建页直接重定向到列表页，因为我们现在在列表页直接创建 */}
                <Route path="/workflow/create" element={<WorkflowListPage />} />
                <Route path="/workflow/:id/edit" element={<WorkflowEditPage />} />
                <Route path="/workflow/:id/use" element={<WorkflowUsePage />} />
              </>
            )}
            
            {/* 演示模块路由 */}
            <Route path="/demo/editor" element={<EditorDemo />} />
            <Route path="/demo/variable-editor" element={<VariableEditor2Demo />} />
            <Route path="/demo/variable-editor-enhanced" element={<VariableEditor2DemoRefactored />} />
            <Route path="/demo/variable-editor-x" element={<VariableEditorXDemo />} />
            <Route path="/demo/variable-editor-wrapper" element={<VariableEditorWrapperDemo />} />
            <Route path="/demo/execution-status" element={<ExecutionStatusDemo />} />
            <Route path="/demo/assignment-node" element={<AssignmentNodeDemo />} />
            
            {/* 设置页面路由 */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
