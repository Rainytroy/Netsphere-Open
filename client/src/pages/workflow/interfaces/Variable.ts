/**
 * 变量接口定义
 */
export interface Variable {
  id: string;
  name: string;
  type: string;
  source: {
    id: string;
    name: string;
    type: string;
  };
  identifier: string;
  displayIdentifier: string;
  value: string;
  entityId: string;
  fieldname: string;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}
