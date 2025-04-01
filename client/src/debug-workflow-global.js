// 全局调试函数，可以在浏览器控制台中直接调用
// 使用方法：
// 1. 复制整个文件内容到浏览器控制台
// 2. 调用 window.debugWorkflows() 查看所有工作流
// 3. 调用 window.debugWorkflow("工作流ID") 查看特定工作流

// 定义全局调试函数
window.debugWorkflows = async function() {
  try {
    console.log('正在获取工作流列表...');
    
    // 通过全局工作流服务获取数据
    const workflowService = window.workflowService || (window.netsphere && window.netsphere.workflowService);
    
    if (!workflowService) {
      console.error('无法找到工作流服务，请确保在正确的页面运行此脚本');
      console.log('提示: 尝试导航到工作流列表页面，然后再次运行此脚本');
      return;
    }
    
    const response = await workflowService.getWorkflows();
    
    if (!response || !response.workflows || response.workflows.length === 0) {
      console.log('未找到任何工作流数据');
      return;
    }
    
    console.log(`找到 ${response.workflows.length} 个工作流:`);
    console.table(response.workflows.map(w => ({
      ID: w.id,
      名称: w.name,
      描述: w.description ? (w.description.length > 50 ? w.description.substring(0, 50) + '...' : w.description) : '(无描述)',
      描述长度: w.description ? w.description.length : 0,
      更新时间: w.updatedAt
    })));
    
    // 返回完整数据以便进一步检查
    return response.workflows;
  } catch (error) {
    console.error('获取工作流失败:', error);
  }
};

// 查看特定工作流详情的函数
window.debugWorkflow = async function(workflowId) {
  if (!workflowId) {
    console.error('请提供工作流ID');
    return;
  }
  
  try {
    const workflowService = window.workflowService || (window.netsphere && window.netsphere.workflowService);
    
    if (!workflowService) {
      console.error('无法找到工作流服务，请确保在正确的页面运行此脚本');
      return;
    }
    
    console.log(`正在获取工作流 ${workflowId} 的详细信息...`);
    const workflow = await workflowService.getWorkflow(workflowId);
    
    if (!workflow) {
      console.log(`未找到ID为 ${workflowId} 的工作流`);
      return;
    }
    
    console.log('工作流详情:');
    console.log('ID:', workflow.id);
    console.log('名称:', workflow.name);
    console.log('描述:', workflow.description || '(无描述)');
    console.log('描述长度:', workflow.description ? workflow.description.length : 0);
    console.log('是否启用:', workflow.isActive ? '是' : '否');
    console.log('创建时间:', workflow.createdAt);
    console.log('更新时间:', workflow.updatedAt);
    
    // 返回完整数据以便进一步检查
    return workflow;
  } catch (error) {
    console.error(`获取工作流 ${workflowId} 失败:`, error);
  }
};

// 查看工作流变量的函数
window.debugWorkflowVariables = async function(workflowId) {
  if (!workflowId) {
    console.error('请提供工作流ID');
    return;
  }
  
  try {
    const workflowVariableService = window.workflowVariableService || 
      (window.netsphere && window.netsphere.workflowVariableService);
    
    if (!workflowVariableService) {
      console.error('无法找到工作流变量服务，请确保在正确的页面运行此脚本');
      return;
    }
    
    console.log(`正在获取工作流 ${workflowId} 的变量...`);
    const variables = await workflowVariableService.getWorkflowVariables(workflowId);
    
    if (!variables || variables.length === 0) {
      console.log(`工作流 ${workflowId} 没有关联的变量`);
      return;
    }
    
    console.log(`找到 ${variables.length} 个变量:`);
    console.table(variables.map(v => ({
      ID: v.id,
      名称: v.name,
      标识符: v.identifier,
      显示标识符: v.displayIdentifier,
      值长度: v.value ? v.value.length : 0,
      类型: v.type
    })));
    
    // 找到描述变量并单独显示
    const descVar = variables.find(v => v.identifier.endsWith('.description'));
    if (descVar) {
      console.log('==== 描述变量详情 ====');
      console.log('标识符:', descVar.identifier);
      console.log('值:', descVar.value);
      console.log('值长度:', descVar.value ? descVar.value.length : 0);
    }
    
    // 返回完整数据以便进一步检查
    return variables;
  } catch (error) {
    console.error(`获取工作流 ${workflowId} 的变量失败:`, error);
  }
};

console.log('调试函数已加载。使用以下函数进行调试:');
console.log('1. debugWorkflows() - 查看所有工作流');
console.log('2. debugWorkflow("工作流ID") - 查看特定工作流详情');
console.log('3. debugWorkflowVariables("工作流ID") - 查看工作流变量');
