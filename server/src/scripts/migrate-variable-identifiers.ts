import { AppDataSource } from '../database';
import { Variable } from '../models/Variable';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';
import { Repository } from 'typeorm';

/**
 * 变量标识符迁移脚本
 * 
 * 该脚本将所有现有变量更新为新格式：
 * 1. 更新标识符格式，包含实体ID: @实体名称.字段#实体ID
 * 2. 添加entityId字段，关联到源实体
 * 3. 添加isValid字段，默认为true
 */

/**
 * 执行变量标识符迁移
 */
async function migrateVariableIdentifiers() {
  // 初始化数据库连接
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  const variableRepo = AppDataSource.getRepository(Variable);
  const identifierFormatter = IdentifierFormatterService.getInstance();
  
  try {
    console.log('======== 变量标识符迁移开始 ========');
    console.log('获取所有需要迁移的变量...');
    
    // 获取所有变量
    const variables = await variableRepo.find();
    console.log(`找到 ${variables.length} 个变量需要迁移`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // 逐个处理变量
    for (const variable of variables) {
      try {
        // 检查变量是否已有entityId，如果有可能已经迁移过
        if (variable.entityId) {
          console.log(`变量 ${variable.id} (${variable.identifier}) 已有entityId，跳过`);
          skippedCount++;
          continue;
        }
        
        // 解析当前标识符
        const parsedId = identifierFormatter.parseIdentifier(variable.identifier);
        const sourceType = variable.type;
        const sourceName = parsedId.sourceName;
        const field = parsedId.field;
        
        // 获取实体ID
        let sourceId: string | null = null;
        
        if (variable.source) {
          // 尝试从source中获取ID
          if (typeof variable.source === 'string') {
            try {
              const sourceObj = JSON.parse(variable.source);
              sourceId = sourceObj.id || null;
            } catch (e) {
              console.warn(`变量 ${variable.id} 的source不是有效的JSON: ${variable.source}`);
            }
          } else if (typeof variable.source === 'object' && variable.source !== null) {
            sourceId = (variable.source as any).id || null;
          }
        }
        
        if (!sourceId) {
          console.warn(`变量 ${variable.id} (${variable.identifier}) 没有有效的源ID，跳过`);
          errorCount++;
          continue;
        }
        
        console.log(`处理变量: ${variable.identifier} (ID: ${variable.id})`);
        
        // 生成新标识符
        const newIdentifier = identifierFormatter.formatIdentifier(
          sourceType,
          sourceName,
          field,
          sourceId
        );
        
        // 更新变量
        variable.identifier = newIdentifier;
        variable.entityId = sourceId;
        variable.isValid = true;
        
        await variableRepo.save(variable);
        successCount++;
        
        console.log(`✓ 已更新变量: ${variable.identifier}`);
        
        // 每100个输出一次进度
        if (successCount % 100 === 0) {
          console.log(`已处理 ${successCount + skippedCount + errorCount} 个变量，成功: ${successCount}, 跳过: ${skippedCount}, 失败: ${errorCount}`);
        }
      } catch (error) {
        console.error(`处理变量 ${variable.id} 失败:`, error);
        errorCount++;
      }
    }
    
    console.log('\n======== 迁移完成 ========');
    console.log(`总计: ${variables.length} 个变量`);
    console.log(`成功: ${successCount} 个变量已更新`);
    console.log(`跳过: ${skippedCount} 个变量已迁移过，被跳过`);
    console.log(`失败: ${errorCount} 个变量更新失败`);
    
  } catch (error: any) {
    console.error('迁移过程中发生错误:', error);
    console.error('错误栈:', error.stack);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    console.log('数据库连接已关闭');
  }
}

/**
 * 备份数据库
 */
async function backupVariables(variableRepo: Repository<Variable>): Promise<void> {
  try {
    const variables = await variableRepo.find();
    const backupData = JSON.stringify(variables, null, 2);
    
    // 使用Node.js的fs模块写入文件
    const fs = require('fs');
    const backupFile = `variables_backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(backupFile, backupData);
    
    console.log(`备份已保存到文件: ${backupFile}`);
  } catch (error) {
    console.error('备份变量失败:', error);
    throw new Error('备份失败，迁移已取消');
  }
}

// 执行迁移
migrateVariableIdentifiers()
  .then(() => {
    console.log('变量标识符迁移脚本执行完毕');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });
