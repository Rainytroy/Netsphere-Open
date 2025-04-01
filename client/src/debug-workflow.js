// 调试工具：查看工作流数据
// 在浏览器控制台中使用

(async () => {
  try {
    // 从浏览器window对象获取已初始化的工作流服务实例
    const workflowService = window.netsphere?.workflowService;
    
    if (!workflowService) {
      console.error('工作流服务不可用，请确保在工作流页面运行此脚本');
      return;
    }
    
    console.log('正在获取工作流列表...');
    const response = await workflowService.getWorkflows();
    
    console.log('工作流列表获取成功:');
    if (response?.workflows?.length > 0) {
      // 输出工作流数据，特别关注description字段
      response.workflows.forEach((workflow, index) => {
        console.log(`\n工作流 #${index + 1} - ${workflow.name}`);
        console.log('ID:', workflow.id);
        console.log('描述:', workflow.description || '(无描述)');
        console.log('描述长度:', workflow.description?.length || 0);
        console.log('创建时间:', workflow.createdAt);
        console.log('更新时间:', workflow.updatedAt);
        console.log('----------------------------------');
      });
    } else {
      console.log('没有找到工作流数据');
    }
  } catch (error) {
    console.error('获取工作流数据失败:', error);
  }
})();
