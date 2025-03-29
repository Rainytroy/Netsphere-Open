declare module 'multer' {
  import { Request, Response, NextFunction } from 'express';
  
  interface StorageEngine {
    _handleFile(req: Express.Request, file: Express.Multer.File, callback: (error?: any, info?: Partial<Express.Multer.File>) => void): void;
    _removeFile(req: Express.Request, file: Express.Multer.File, callback: (error?: any) => void): void;
  }
  
  interface DiskStorageOptions {
    destination?: string | ((req: Request, file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => void);
    filename?: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => void;
  }
  
  interface MemoryStorageOptions {}
  
  interface MulterOptions {
    dest?: string;
    storage?: StorageEngine;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    fileFilter?(req: Express.Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void): void;
    preservePath?: boolean;
  }
  
  interface Field {
    name: string;
    maxCount?: number;
  }
  
  interface Multer {
    single(fieldname: string): (req: Request, res: Response, next: NextFunction) => void;
    array(fieldname: string, maxCount?: number): (req: Request, res: Response, next: NextFunction) => void;
    fields(fields: Field[]): (req: Request, res: Response, next: NextFunction) => void;
    none(): (req: Request, res: Response, next: NextFunction) => void;
    any(): (req: Request, res: Response, next: NextFunction) => void;
  }
  
  function multer(options?: MulterOptions): Multer;
  
  namespace multer {
    function diskStorage(options: DiskStorageOptions): StorageEngine;
    function memoryStorage(options?: MemoryStorageOptions): StorageEngine;
  }
  
  export = multer;
}
