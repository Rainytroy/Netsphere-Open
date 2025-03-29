/**
 * 清理重复的工作任务变量
 * 用于找出并删除同一工作任务字段的旧格式（不带UUID）和新格式（带UUID）变量中的旧格式变量
 */
import { AppDataSource } from '../database';
import { WorkTask } from '../models/WorkTask';
import { Variable, VariableType } from '../models/Variable';
import { VariableEventPublisher, VariableEventType } from '../services/VariableEventPublisher';

const eventPublisher = VariableEventPublisher.getInstance();

/**
 * 清理重复变量的主函数
 */
async function cleanDuplicateTaskVariables() {
  try {
    console.log('开始清理重复的工作任务变量...');
    
    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('数据库连接初始化成功');
    }
    
    const workTaskRepo = AppDataSource.getRepository(WorkTask);
    const variableRepo = AppDataSource.getRepository(Variable);
    
    // 获取所有工作任务
    const tasks = await workTaskRepo.find();
    console.log(`找到 ${tasks.length} 个工作任务`);
    
    // 逐个处理工作任务
    let totalDuplicatesRemoved = 0;
    for (const task of tasks) {
      console.log(`\n处理工作任务: "${task.name}" (ID: ${task.id})`);
      
      // 获取与该任务相关的所有变量
      const taskVariables = await variableRepo.find({
        where: {
          type: VariableType.TASK,
          entityId: task.id
        }
      });
      
      console.log(`- 找到 ${taskVariables.length} 个相关变量`);
      
      // 按字段分组
      const fieldGroups: Record<string, Variable[]> = {};
      for (const variable of taskVariables) {
        // 从标识符中提取字段名
        const fieldMatch = variable.identifier.match(/@[^.]+\.([^#]+)(?:#.*)?$/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          if (!fieldGroups[field]) {
            fieldGroups[field] = [];
          }
          fieldGroups[field].push(variable);
        }
      }
      
      // 处理每个字段的变量组
      for (const [field, variables] of Object.entries(fieldGroups)) {
        if (variables.length <= 1) {
          continue; // 没有重复，跳过
        }
        
        console.log(`  - 字段 "${field}" 有 ${variables.length} 个变量`);
        
        // 将变量分为新旧格式
        const oldFormatVars = variables.filter(v => !v.identifier.includes('#'));
        const newFormatVars = variables.filter(v => v.identifier.includes('#'));
        
        console.log(`    - 旧格式变量 (无ID): ${oldFormatVars.length} 个`);
        console.log(`    - 新格式变量 (带ID): ${newFormatVars.length} 个`);
        
        // 如果存在两种格式，删除旧格式的变量
        if (oldFormatVars.length > 0 && newFormatVars.length > 0) {
          console.log(`    => 删除 ${oldFormatVars.length} 个旧格式变量`);
          
          // 保存副本用于发布事件
          const variableCopies = oldFormatVars.map(v => ({ ...v }));
          
          // 删除旧格式变量
          await variableRepo.remove(oldFormatVars);
          totalDuplicatesRemoved += oldFormatVars.length;
          
          // 发布变量删除事件
          for (const variable of variableCopies) {
            try {
              eventPublisher.publish(VariableEventType.DELETED, variable);
            } catch (error) {
              console.warn(`发布变量(${variable.id})删除事件失败:`, error);
            }
          }
        }
        // 如果只有旧格式没有新格式（可能是从未更新过），保留一个旧格式并创建对应的新格式
        else if (oldFormatVars.length > 0 && newFormatVars.length === 0) {
          console.log(`    => 保留一个旧格式变量并创建对应的新格式变量`);
          
          // 保留第一个变量，删除其余的
          const [keepVar, ...removeVars] = oldFormatVars;
          
          if (removeVars.length > 0) {
            console.log(`    => 删除 ${removeVars.length} 个冗余的旧格式变量`);
            
            // 保存副本用于发布事件
            const variableCopies = removeVars.map(v => ({ ...v }));
            
            // 删除多余的旧格式变量
            await variableRepo.remove(removeVars);
            totalDuplicatesRemoved += removeVars.length;
            
            // 发布变量删除事件
            for (const variable of variableCopies) {
              try {
                eventPublisher.publish(VariableEventType.DELETED, variable);
              } catch (error) {
                console.warn(`发布变量(${variable.id})删除事件失败:`, error);
              }
            }
          }
        }
        // 如果有多个新格式变量，保留最新的一个
        else if (newFormatVars.length > 1) {
          // 按更新时间排序，保留最新的
          const sortedVars = newFormatVars.sort((a, b) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
          
          const [keepVar, ...removeVars] = sortedVars;
          
          if (removeVars.length > 0) {
            console.log(`    => 删除 ${removeVars.length} 个冗余的新格式变量，保留最新的`);
            
            // 保存副本用于发布事件
            const variableCopies = removeVars.map(v => ({ ...v }));
            
            // 删除冗余的新格式变量
            await variableRepo.remove(removeVars);
            totalDuplicatesRemoved += removeVars.length;
            
            // 发布变量删除事件
            for (const variable of variableCopies) {
              try {
                eventPublisher.publish(VariableEventType.DELETED, variable);
              } catch (error) {
                console.warn(`发布变量(${variable.id})删除事件失败:`, error);
              }
            }
          }
        }
      }
    }
    
    // 清理孤立变量（关联的工作任务已不存在）
    console.log('\n开始清理孤立的工作任务变量...');
    
    // 获取所有工作任务的ID
    const taskIds = tasks.map(task => task.id);
    
    // 找出所有没有对应工作任务的变量
    const orphanedVariables = await variableRepo.find({
      where: {
        type: VariableType.TASK
      }
    });
    
    const realOrphanedVars = orphanedVariables.filter(variable => {
      try {
        const source = typeof variable.source === 'string' 
          ? JSON.parse(variable.source) 
          : variable.source;
        
        // 确保source.id和entityId都是字符串并且不在任务ID列表中
        const sourceId = source?.id ? String(source.id) : '';
        const entityId = variable.entityId ? String(variable.entityId) : '';
        
        return !taskIds.includes(sourceId) && !taskIds.includes(entityId);
      } catch (error) {
        console.warn(`解析变量(${variable.id})的source失败:`, error);
        return true; // 解析失败，视为孤立变量
      }
    });
    
    if (realOrphanedVars.length > 0) {
      console.log(`找到 ${realOrphanedVars.length} 个孤立变量，准备删除...`);
      
      // 保存副本用于发布事件
      const variableCopies = realOrphanedVars.map(v => ({ ...v }));
      
      // 删除孤立变量
      await variableRepo.remove(realOrphanedVars);
      
      // 发布变量删除事件
      for (const variable of variableCopies) {
        try {
          eventPublisher.publish(VariableEventType.DELETED, variable);
        } catch (error) {
          console.warn(`发布变量(${variable.id})删除事件失败:`, error);
        }
      }
      
      console.log(`成功删除 ${realOrphanedVars.length} 个孤立变量`);
      totalDuplicatesRemoved += realOrphanedVars.length;
    } else {
      console.log('没有找到孤立变量');
    }
    
    console.log(`\n清理完成，共删除 ${totalDuplicatesRemoved} 个重复或孤立变量`);
  } catch (error) {
    console.error('清理重复工作任务变量失败:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行清理
cleanDuplicateTaskVariables()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
