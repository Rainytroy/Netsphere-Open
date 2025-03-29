import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { AiService, AiServiceType } from "../models/AiService";
import { AppDataSource } from "../database";
import { DeepseekAdapter } from "../adapters/DeepseekAdapter";
import { AnthropicAdapter } from "../adapters/AnthropicAdapter";

/**
 * AI服务控制器，管理AI服务的CRUD操作和连接测试
 */
export class AiServiceController {
  private aiServiceRepository = AppDataSource.getRepository(AiService);

  /**
   * 获取所有AI服务
   */
  async getAllServices(req: Request, res: Response) {
    try {
      const services = await this.aiServiceRepository.find();
      
      // 安全处理：掩码化API密钥
      const safeMaskedServices = services.map(service => ({
        ...service,
        apiKey: this.maskApiKey(service.apiKey)
      }));
      
      return res.json(safeMaskedServices);
    } catch (error) {
      console.error('获取AI服务列表失败:', error);
      return res.status(500).json({ message: '获取AI服务列表失败', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  /**
   * 获取单个AI服务
   */
  async getServiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const service = await this.aiServiceRepository.findOne({ where: { id } });
      
      if (!service) {
        return res.status(404).json({ message: 'AI服务不存在' });
      }
      
      // 安全处理：掩码化API密钥
      const safeMaskedService = {
        ...service,
        apiKey: this.maskApiKey(service.apiKey)
      };
      
      return res.json(safeMaskedService);
    } catch (error) {
      console.error('获取AI服务失败:', error);
      return res.status(500).json({ message: '获取AI服务失败', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  /**
   * 创建AI服务
   */
  async createService(req: Request, res: Response) {
    try {
      const { name, type, apiKey, baseUrl, defaultModel, config } = req.body;
      
      // 验证必填字段
      if (!name || !type || !apiKey) {
        return res.status(400).json({ message: '缺少必要字段' });
      }
      
      // 验证服务类型是否有效
      if (!Object.values(AiServiceType).includes(type)) {
        return res.status(400).json({ message: '无效的服务类型' });
      }
      
      // 创建新服务
      const service = new AiService();
      service.name = name;
      service.type = type;
      service.apiKey = apiKey;
      service.baseUrl = baseUrl;
      service.defaultModel = defaultModel;
      service.config = config;
      
      // 检查是否需要设置为默认服务
      const existingServices = await this.aiServiceRepository.find();
      if (existingServices.length === 0) {
        // 如果是第一个服务，自动设为默认
        service.isDefault = true;
      } else if (req.body.isDefault) {
        // 如果请求设置为默认，先取消其他服务的默认状态
        await this.aiServiceRepository.update({}, { isDefault: false });
        service.isDefault = true;
      }
      
      // 保存服务
      const savedService = await this.aiServiceRepository.save(service);
      
      // 安全处理：掩码化API密钥
      const safeMaskedService = {
        ...savedService,
        apiKey: this.maskApiKey(savedService.apiKey)
      };
      
      return res.status(201).json(safeMaskedService);
    } catch (error) {
      console.error('创建AI服务失败:', error);
      return res.status(500).json({ message: '创建AI服务失败', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  /**
   * 更新AI服务
   */
  async updateService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, apiKey, baseUrl, defaultModel, config } = req.body;
      
      // 查找服务
      const service = await this.aiServiceRepository.findOne({ where: { id } });
      
      if (!service) {
        return res.status(404).json({ message: 'AI服务不存在' });
      }
      
      // 更新服务
      if (name) service.name = name;
      if (type) service.type = type;
      if (apiKey) service.apiKey = apiKey;
      
      // 可选字段
      if (baseUrl !== undefined) service.baseUrl = baseUrl;
      if (defaultModel !== undefined) service.defaultModel = defaultModel;
      if (config !== undefined) service.config = config;
      
      // 保存更新
      const updatedService = await this.aiServiceRepository.save(service);
      
      // 安全处理：掩码化API密钥
      const safeMaskedService = {
        ...updatedService,
        apiKey: this.maskApiKey(updatedService.apiKey)
      };
      
      return res.json(safeMaskedService);
    } catch (error) {
      console.error('更新AI服务失败:', error);
      return res.status(500).json({ message: '更新AI服务失败', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  /**
   * 删除AI服务
   */
  async deleteService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const service = await this.aiServiceRepository.findOne({ where: { id } });
      
      if (!service) {
        return res.status(404).json({ message: 'AI服务不存在' });
      }
      
      // 检查是否删除的是默认服务
      const isDefault = service.isDefault;
      
      // 删除服务
      await this.aiServiceRepository.remove(service);
      
      // 如果删除的是默认服务，设置其他服务为默认（如果还有其他服务）
      if (isDefault) {
        const remainingServices = await this.aiServiceRepository.find();
        if (remainingServices.length > 0) {
          remainingServices[0].isDefault = true;
          await this.aiServiceRepository.save(remainingServices[0]);
        }
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error('删除AI服务失败:', error);
      return res.status(500).json({ message: '删除AI服务失败', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  /**
   * 设置默认AI服务
   */
  async setDefaultService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const service = await this.aiServiceRepository.findOne({ where: { id } });
      
      if (!service) {
        return res.status(404).json({ message: 'AI服务不存在' });
      }
      
      // 先取消所有服务的默认状态
      await this.aiServiceRepository.update({}, { isDefault: false });
      
      // 设置当前服务为默认
      service.isDefault = true;
      await this.aiServiceRepository.save(service);
      
      // 安全处理：掩码化API密钥
      const safeMaskedService = {
        ...service,
        apiKey: this.maskApiKey(service.apiKey)
      };
      
      return res.json(safeMaskedService);
    } catch (error) {
      console.error('设置默认AI服务失败:', error);
      return res.status(500).json({ message: '设置默认AI服务失败', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  /**
   * 获取默认AI服务
   */
  async getDefaultService(req: Request, res: Response) {
    try {
      const service = await this.aiServiceRepository.findOne({ where: { isDefault: true } });
      
      if (!service) {
        return res.status(404).json({ message: '未设置默认AI服务' });
      }
      
      // 安全处理：掩码化API密钥
      const safeMaskedService = {
        ...service,
        apiKey: this.maskApiKey(service.apiKey)
      };
      
      return res.json(safeMaskedService);
    } catch (error) {
      console.error('获取默认AI服务失败:', error);
      return res.status(500).json({ message: '获取默认AI服务失败', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  /**
   * 测试AI服务连接
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // 测试有两种情况：
      // 1. 测试现有服务（通过ID）
      // 2. 测试尚未保存的服务配置（通过请求体）
      
      let service: AiService;
      
      if (id) {
        // 测试已存在的服务
        const existingService = await this.aiServiceRepository.findOne({ where: { id } });
        if (!existingService) {
          return res.status(404).json({ message: 'AI服务不存在' });
        }
        service = existingService;
      } else {
        // 测试新配置
        const { type, apiKey, baseUrl, defaultModel, config } = req.body;
        
        if (!type || !apiKey) {
          return res.status(400).json({ message: '缺少必要字段' });
        }
        
        // 创建临时服务对象
        service = new AiService();
        service.type = type;
        service.apiKey = apiKey;
        service.baseUrl = baseUrl;
        service.defaultModel = defaultModel;
        service.config = config;
      }
      
      // 根据服务类型选择适配器
      let adapter;
      switch (service.type) {
        case AiServiceType.DEEPSEEK:
          adapter = new DeepseekAdapter();
          break;
        case AiServiceType.ANTHROPIC:
          adapter = new AnthropicAdapter();
          break;
        default:
          return res.status(400).json({ message: '不支持的服务类型' });
      }
      
      // 使用适配器测试连接
      try {
        // 对于已保存的服务，需要解密API密钥
        const decryptedService = new AiService();
        decryptedService.type = service.type;
        decryptedService.apiKey = id ? service.decryptApiKey() : service.apiKey;
        decryptedService.baseUrl = service.baseUrl;
        decryptedService.defaultModel = service.defaultModel;
        decryptedService.config = service.config;
        
        adapter.initialize(decryptedService);
        const result = await adapter.testConnection();
        
        return res.json(result);
      } catch (adapterError) {
        return res.status(400).json({ 
          success: false, 
          message: `连接测试失败: ${adapterError instanceof Error ? adapterError.message : '未知错误'}`
        });
      }
    } catch (error) {
      console.error('测试AI服务连接失败:', error);
      return res.status(500).json({ 
        success: false, 
        message: `测试连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  }

  /**
   * 掩码化API密钥，只显示前4位和后4位
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey) return '';
    
    // 如果是加密格式，则返回占位符
    if (apiKey.includes(':')) {
      return '••••••••••••••••';
    }
    
    // 对于纯文本密钥，显示部分
    if (apiKey.length <= 8) {
      return '••••••••';
    }
    
    return `${apiKey.substring(0, 4)}${'•'.repeat(apiKey.length - 8)}${apiKey.substring(apiKey.length - 4)}`;
  }
}
