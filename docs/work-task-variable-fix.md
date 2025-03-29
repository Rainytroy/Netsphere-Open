# 工作任务变量修复文档

## 问题概述

系统中存在两套工作任务变量创建机制：
1. **WorkTaskService** 中直接创建/更新变量，使用不带UUID后缀的旧格式标识符
2. **WorkTaskVariableSourceProvider** 通过变量源提供者机制创建变量，使用带UUID后缀的新格式标识符

这导致以下问题：
- 每个工作任务会创建4个变量（每个字段2个格式）
- 删除工作任务时，旧格式变量可能被遗留
- 系统中存在大量冗余变量

## 修复方案

1. **移除WorkTaskService中的变量创建逻辑**
   - 删除`registerTaskVariables`的调用
   - 删除`updateTaskVariables`的调用
   - 保留方法本身但添加注释，以便其他代码可能仍在引用它们

2. **增强WorkTaskController中的删除逻辑**
   - 使用`WorkTaskVariableSourceProvider.deleteWorkTaskVariables`方法
   - 确保在删除工作任务前先删除所有相关变量

3. **创建一个数据修复脚本**
   - 清理同时存在的新旧格式变量，保留新格式
   - 删除与不存在工作任务关联的变量
   - 确保每个工作任务的每个字段只有一个最新变量

## 变量架构

系统采用变量源提供者(SourceProvider)模式管理变量：
1. 系统启动时，在`index.ts`中注册各种VariableSourceProvider
2. 每个Provider的`syncVariablesToDatabase`方法将相关数据同步为变量
3. VariableSourceProvider提供了变量的CRUD操作，包括格式化标识符

## 使用说明

### 清理重复变量

```bash
# 运行清理脚本
d:/Netsphere/tests/run-clean-duplicate-task-variables.bat
```

### 新变量格式

新的工作任务变量格式为：
- 标识符格式: `@任务名.字段名#UUID` 
- 例如: `@测试任务.input#fd8ee802-3a21-4f51-9601-326f5a750514`

### 最佳实践

1. 使用`WorkTaskVariableSourceProvider`处理所有变量相关操作
2. 不要手动创建工作任务变量，让源提供者处理
3. 删除工作任务时，使用`deleteWorkTaskVariables`方法删除变量

## 可能的后续工作

1. 添加变量创建/更新的事件机制，便于WorkTaskVariableSourceProvider实时响应变化
2. 优化`WorkTaskVariableSourceProvider.getVariables`方法的性能
3. 考虑将所有变量操作集中到各自的SourceProvider中
