'use strict';
/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: lipengxiang
* Date: 
* Desc: 
*/

const debug = require('debug')('test');
var cluster = require('cluster');
var ora     = require('ora')
var communicate = require('./communicate');
var workers     = require('./workers');
var logger      = require('./logger');

var spinner = ora('Testing... ');

module.exports = {

  /**
  * @desc: 初始化模块.
  *        必须在workCB中调用finish来指明测试结束, 否则测试将在指定时间到达后结束.
  */
  start,
  finish,

  /**
  * @desc: 开始一个测试, 并在失败和成功的时候调用相应的处理.
  *        在测试结束后, 同类的测试将会归为相同的统计.
  *        在超时过后还未调用结束测试方法的, 将标记为超时.
  * @return: 
  */
  begin:         (type)=>global.communicate.begin(type),

  /**
  * @desc: 结束指定的测试, 并记录统计结果.
  *        end_custom 可以指定除'request', 'timeout' 之外自定义的测试结果类型.
  * @return: 
  */
  end_success:   (token)=>global.communicate.end_success(token),
  end_failure:   (token)=>global.communicate.end_failure(token),
  end_custom:    (token, type)=>global.communicate.end_custom(token, type),

  /**
  * @desc: 使用key来计数, 所欲偶测试进程的对同一个key的计数将累加.
  *        并且一个进程的计数操`作将在测试结束后输出.
  * @return: 
  */
  add_count:     (type, count)=>global.communicate.add_count(type, count),

  /**
   * 日志模块.
   */
  logger: logger,
};


/**
* @desc: 初始化测试模块.
* @param opt: 
*         {
            clientTotal,          // 客户端总数.
            clientNumPerProcess,  // 每个进程模拟的客户端个数. 默认50个.
            createDurtion,        // in ms, 模拟客户端在此时间段内创建完成. 默认10000
            testDurtion,          // in ms, 测试的持续时间.
            logfile,              // 日志文件位置. null则不会存储.
            errfile,              // 错误日志位置. null则不会存储.
          }
* @param workCB: function() {}  // 在此回调中编写测试程序.
* @return: 
*/
function start(opt, workCB) {
  global.communicate = new communicate(); // 全局对象.
  global.workers = new workers();

  if (cluster.isMaster) {
    global.workers.on('message', (data)=>{
      if (data.type == 'begin') {
        global.communicate._begin(data.data);
      }
      else if (data.type == 'end_custom') {
        global.communicate.end_custom(data.data, data.custom);
      }
      else if (data.type == 'add_count') {
        global.communicate._add_count(data.data);
      }
    });

    opt._currentDurtion = 0;
    let progressTimer = setInterval(()=>{
      opt._currentDurtion += 5000;
      if (opt._currentDurtion >= opt.testDurtion)
      {
        global.workers.finish();
        clearInterval(progressTimer);
        progressTimer = null;
      }
      console.log('...' + Math.floor((opt._currentDurtion/opt.testDurtion)*100) + '%');
    }, 5000);

    global.workers.on('finish', ()=>{
      if (progressTimer)
      {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      console.log();
      let finishat = '[finish at: ' + (new Date()).toLocaleString() + ']';
      let delta = process.hrtime(global.test_start_at);
      delta = (delta[0] * 1e9) + delta[1];

      spinner.stop();

      let ret = global.communicate.report();
      console.log(ret)
      logger.info(ret);

      console.log(finishat);
      logger.info(finishat);
      
      console.log(`Test take ${Math.ceil(delta/1000000000)} s`);
      logger.info(`Test take ${Math.ceil(delta/1000000000)} s`);

      process.exit(0);
    });

    global.workers.init(opt, workCB);

    global.test_start_at = process.hrtime();
    let startat = '[start at: ' + (new Date()).toLocaleString() + ']';
    console.log(startat);
    logger.info(startat);
    spinner.start();
    console.log();
  }
  else {
    global.workers.init(opt, workCB);
  }
}

function finish() {
  if (cluster.isWorker) {
    if (--global.clientNumPerProcess <= 0) {
      debug('worker finish')
      process.exit(0);
    }
  }
  else {

  }
}