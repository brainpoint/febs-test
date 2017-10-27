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
var exec = require('child_process').exec;

var ora     = require('ora')
var spinner = ora('Testing... ');

var g_cur_process_num = 10;
const STEP_PROCESS = 10;

var is_win = os.platform().indexOf('win') == 0;

var g_workers = [];

//--------------------------------------------------------
// event:
//    'message' (data) workitem 发送来的消息.
//    'finish'  ()     完成了所有的任务.
//--------------------------------------------------------
module.exports = class {
  constructor() {
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
        console.log('Finish max process number: ' + g_cur_process_num);
        logger.info('Finish max process number: ' + g_cur_process_num);
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
      setInterval(function(){}, 10000);
    } // if..else.
  }

  //
  // fork.
  fork(opt) {
    if (cluster.isMaster) {
      for (; g_workers.length < g_cur_process_num;) {
        g_workers.push( cluster.fork() );
      }

      console.log(` Current Process number: ${g_cur_process_num}, Free memory: ${Math.floor(os.freemem() / 1024 / 1024)} MB`);
      logger.info(` Current Process number: ${g_cur_process_num}, Free memory: ${Math.floor(os.freemem() / 1024 / 1024)} MB`);
      
      if (os.freemem() > opt.minMemory+50*1024*1024) {
        g_cur_process_num += STEP_PROCESS;
        setTimeout(()=>{
          this.fork(opt);
        }, 2000);
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
  finish() {
    if (cluster.isMaster) {
      debug('finish');

      try {
        for (let i = 0; i < g_workers.length; i++) {
          if (!g_workers[i].isDead()) {
            let cmd = is_win ? `taskkill /PID ${g_workers[i].process.pid} /F` : `kill ${g_workers[i].process.pid}`;
            exec(cmd, function(err, stdout, stderr){
            });
          }
        }
        g_workers = [];
        process.exit(0);
      } catch(e) {}
    }
  }
};
