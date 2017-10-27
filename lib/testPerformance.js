'use strict';
/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: lipengxiang
* Date: 
* Desc: 
*/

const debug = require('debug')('febs-test');
var cluster = require('cluster');
var os = require('os');
var logger = require('./logger');

var ora     = require('ora')
var spinner = ora('Testing... ');

var g_cur_process_num = 10;
const STEP_PROCESS = 10;

//--------------------------------------------------------
// event:
//    'message' (data) workitem 发送来的消息.
//    'finish'  ()     完成了所有的任务.
//--------------------------------------------------------
module.exports = class {
  constructor() {
    this.g_cur_work_process_count = 0;
  }

  /**
  * @desc: 测试电脑的性能.
  * @param opt: 
  *         {
              minMemory,            // in byte, 保留的最小内存数.
              logfile,              // 日志文件位置. null则不会存储.
            }
  * @return: 
  */
  test(opt) {

    logger.init(opt.logfile, opt.errfile);

    // master.
    if (cluster.isMaster) {

      spinner.start();

      //
      // uncaughtException
      process.on('uncaughtException', function (err) {
        spinner.stop();
        console.error(err);
        logger.error(process.pid, err);
      });

      process.on('SIGINT', ()=>{
        spinner.stop();
        this.finish();
      });
      
      opt.minMemory = opt.minMemory || 200*1024*1024;
      opt.minMemory = Math.max(opt.minMemory, 200*1024*1024);
      
      // welcome.
      
      let welcomestr = `
       ************************************************************
       *      Memory test begin.
       *        ${os.hostname()} ${os.platform()}
       *        - cpu numbers:  ${os.cpus().length}
       *        - cpu type:     ${os.cpus()[0].model} ${os.cpus()[0].speed} MHz
       *        - total memory: ${Math.floor(os.totalmem() / 1024 / 1024)} MB
       *        - free memory:  ${Math.floor(os.freemem() / 1024 / 1024)} MB
       * ----------------------------------------------------------
       *      config of:
       *        - min memory:                    ${opt.minMemory / 1024 / 1024} MB
       *        - logfile:                       ${opt.logfile||''}
       ************************************************************
    `
    console.log(welcomestr);
    logger.info(welcomestr);

      debug('start fork');

      setTimeout(()=>this.fork(opt), 1000);
      
    }
    // worker.
    else {
    } // if..else.
  }

  //
  // fork.
  fork(opt) {
    if (cluster.isMaster) {
      for (var i = 0; i < g_cur_process_num; i++) {
        cluster.fork();
      }

      console.log(` Current Process number: ${g_cur_process_num}, Free memory: ${Math.floor(os.freemem() / 1024 / 1024)} MB`);
      logger.info(` Current Process number: ${g_cur_process_num}, Free memory: ${Math.floor(os.freemem() / 1024 / 1024)} MB`);
      
      if (os.freemem() > opt.minMemory+20*1024*1024) {
        g_cur_process_num += STEP_PROCESS;
        this.finish(()=>this.fork(opt));
      } else {
        console.log('Finish max process number: ' + g_cur_process_num);
        logger.info('Finish max process number: ' + g_cur_process_num);
        spinner.stop();
        this.finish();
      }
    }
  }

  /**
  * @desc: all workitem finish.
  * @return: 
  */
  finish(cb) {
    if (cluster.isMaster) {
      debug('finish');
      
      cluster.disconnect(()=>{
        cb && cb();
        if (!cb) process.exit(0);
      });
    }
  }
};
