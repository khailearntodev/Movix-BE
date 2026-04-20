
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
const UAParser = require('ua-parser-js');

export const getDeviceInfo = (req: Request) => {
  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();

  return {
    deviceId: uuidv4(),
    deviceName: result.device.model || result.os.name || 'Unknown Device',
    deviceType: result.device.type || 'desktop',
    browser: result.browser.name,
    os: result.os.name,
  };
};

export const getIpAddress = (req: Request): string => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  if (Array.isArray(ip)) return ip[0];
  return ip || 'Unknown IP';
};