'use strict';
/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: lipengxiang
* Date: 
* Desc: 
*/


var log4js = require('log4js');

module.exports = {
  /**
   * @desc: 初始化日志系统
   */
  init,

  /**
   * @desc: info, 普通日志.
   *        (dev/prod方式下都将输出)
   */
  info,

  /**
   * @desc: debug下日志.
   *        (仅dev方式下都将输出)
   */
  debug,

  /**
   * @desc: 错误日志.
   *        (dev/prod方式下都将输出)
   */
  error,
}

function init(logfile, errfile) {
  let cfg = {
    appenders: {
      // everything: { type: 'dateFile', filename: './log/', pattern: 'yyyy-MM-dd.log', alwaysIncludePattern: true },
      everything: { type: 'stdout' },
      info: logfile ? { type: 'file', filename: logfile } : { type: 'console' },
      err:  errfile ? { type: 'file', filename: errfile } : { type: 'console' },
    },
    categories: {
      default: { appenders: ['everything'], level: 'OFF' },
      debug: { appenders: ['info'], level: 'debug' },
      info: { appenders: ['info'], level: 'info' },
      err: { appenders: ['err'], level: 'error' },
    }
  };

  if (!logfile) {
    delete cfg.categories.info;
    delete cfg.categories.debug;
  }
  if (!errfile) {
    delete cfg.categories.err;
  }

  log4js.configure(cfg);
}

function info(msg) {
  let logger = log4js.getLogger('info');
  logger && logger.info(msg);
}

function debug(msg) {
  let logger = log4js.getLogger('debug');
  logger && logger.debug(msg);
}

function error(msg) {
  let logger = log4js.getLogger('err');
  logger && logger.error(msg);
}

