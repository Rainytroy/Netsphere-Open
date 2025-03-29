# 禁用变量去重功能说明

## 修改概述

已经移除了`VariableService.ts`中的去重逻辑，此前的逻辑会导致相同identifier的变量被合并，造成以下问题：

1. NPC变量本应有5个，但只显示了1个
2. 工作任务变量本应有2个，但只显示了1个

## 具体更改

1. 移除了使用Map进行去重的逻辑
2. 直接合并所有变量（数据库变量 + 源变量），不进行任何去重处理
3. 保留原有的排序逻辑（按类型、来源名称和变量名称排序）

## 日志输出变化

更新前:
```
从 3 个变量源获取变量...
成功获取 14 个源变量
开始变量去重...
去重完成，从 14 个变量减少到 4 个
```

更新后:
```
从 3 个变量源获取变量...
成功获取 14 个源变量
合并数据库变量和源变量...
合并完成，总共 14 个变量（数据库: 0 + 源变量: 14）
```

## 相关文件

1. `d:/Netsphere/server/src/services/VariableService.ts` - 移除去重逻辑
2. `d:/Netsphere/server/src/models/Variable.ts` - 添加displayIdentifier字段
3. `d:/Netsphere/server/src/controllers/VariableController.ts` - 更新创建和更新方法

## 数据清理

建议执行以下步骤来清理数据:

1. 使用`clean-all-variables.ts`脚本清除所有变量
2. 重启服务器，让变量源自动重新生成变量

这样可以确保所有变量都有正确的displayIdentifier字段，且没有重复的数据。
