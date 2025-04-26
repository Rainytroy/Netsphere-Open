import { useState, useEffect } from 'react';

// 本地存储键名
const SERVER_ADDRESS_KEY = 'netsphere_server_address';
const REMOTE_MODE_KEY = 'netsphere_remote_mode';

/**
 * 获取保存的服务器地址
 * @returns 服务器地址或null
 */
export const getServerAddress = (): string | null => {
  return localStorage.getItem(SERVER_ADDRESS_KEY);
};

/**
 * 设置服务器地址
 * @param address 服务器地址
 */
export const setServerAddress = (address: string): void => {
  localStorage.setItem(SERVER_ADDRESS_KEY, address);
};

/**
 * 获取是否启用远程模式
 * @returns 是否启用远程模式
 */
export const isRemoteMode = (): boolean => {
  return localStorage.getItem(REMOTE_MODE_KEY) === 'true';
};

/**
 * 设置远程模式
 * @param enabled 是否启用远程模式
 */
export const setIsRemoteMode = (enabled: boolean): void => {
  localStorage.setItem(REMOTE_MODE_KEY, enabled ? 'true' : 'false');
};

/**
 * 获取当前有效的API基础URL
 * 如果启用了远程模式，则使用配置的服务器地址
 * 否则使用localhost
 * @returns API基础URL
 */
export const getApiBaseUrl = (): string => {
  if (isRemoteMode()) {
    const serverAddress = getServerAddress() || 'localhost';
    return `http://${serverAddress}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

/**
 * 服务器配置Hook
 * 提供服务器配置状态和操作方法
 */
export const useServerConfig = () => {
  const [serverAddress, setServerAddressState] = useState<string | null>(getServerAddress());
  const [remoteMode, setRemoteModeState] = useState<boolean>(isRemoteMode());

  // 处理服务器地址变化
  const handleSetServerAddress = (address: string) => {
    setServerAddress(address);
    setServerAddressState(address);
  };

  // 处理远程模式变化
  const handleSetRemoteMode = (enabled: boolean) => {
    setIsRemoteMode(enabled);
    setRemoteModeState(enabled);
  };

  // 初始加载配置
  useEffect(() => {
    setServerAddressState(getServerAddress());
    setRemoteModeState(isRemoteMode());
  }, []);

  return {
    serverAddress,
    isRemoteMode: remoteMode,
    setServerAddress: handleSetServerAddress,
    setRemoteMode: handleSetRemoteMode,
    getApiBaseUrl
  };
};
