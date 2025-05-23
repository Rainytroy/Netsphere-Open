# 全局变量系统文档索引

本文档集合描述了Netsphere平台的全局变量系统设计和规范，特别是新的UUID标识符版本的实现。

## 文档目录

1. [系统概述与标识符规范](./variable-system-overview.md) - 全局变量系统的基本概念介绍及变量标识符的技术规范

2. [变量标识符解析规范](./variable-identifier-parsing.md) - 变量标识符的解析算法、正则表达式模式和实现指南

3. [系统架构设计](./variable-system-architecture.md) - 系统架构、数据流和核心组件设计

4. [全局变量系统配置指南](./variable-system-configuration.md) - 变量类型定义、字段映射和系统配置的详细文档

5. [UI设计规范](./variable-system-ui-design.md) - 全局变量系统的UI组件、色彩、排版和布局规范

6. [变量源集成指南](./variable-source-integration.md) - 如何将新的变量源集成到系统中的详细指南

7. [迁移与最佳实践](./variable-system-migration.md) - 从旧版标识符迁移到UUID标识符的策略及开发最佳实践

## 版本信息

**当前版本**: v2.2.0  
**创建时间**: 2025年3月18日  
**最后更新**: 2025年3月25日  
**文档状态**: 已定稿  

## 主要更新

### v2.2.0 (2025年3月25日)
- 新增变量数据处理最佳实践，提供更全面的开发指导
- 增强UUID生成机制文档，详细说明RFC4122 v4标准和timestampToUUID函数
- 优化变量测试工具，提高标识符解析的灵活性和可靠性
- 重构变量数据获取流程，确保始终使用最新数据
- 增强了变量ID处理逻辑，改进部分匹配算法
- 添加自动刷新和变量事件订阅机制，确保实时数据更新
- 改进防抖动逻辑，优化API调用性能
- 更新所有相关文档，反映最新实现和最佳实践

### v2.1.0 (2025年3月18日 18:15)
- 更新了系统标识符格式为`@gv_UUID_field`，确保与当前代码实现一致
- 增强了客户端变量解析器文档，明确客户端和服务端解析器的差异
- 自定义变量列表显示优化：来源列显示变量名称，名称列统一显示"值"
- 优化了变量标签样式，移除特定字体设置，使用全局字体风格
- 改进了工作任务(TASK)类型变量的颜色，从#52C41A改为更深的#389E0D，提高可识别性
- 优化了变量标签背景色，使用更饱和的颜色以增强视觉区分
- 更新了所有变量显示相关文档，添加了最佳实践指南

### v2.0.0 (2025年3月18日)
- 引入了基于UUID的变量标识符系统，解决了变量引用稳定性问题
- 实现了双重标识符机制（系统标识符和显示标识符）
- 优化了变量解析和显示组件
- 提供了完整的迁移路径和工具
