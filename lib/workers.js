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
var events = require('events');
var arrivals = require('arrivals');
var exec = require('child_process').exec;
var logger = require('./logger');

var is_win = os.platform().indexOf('win') == 0;

var g_workers = [];

//--------------------------------------------------------
// event:
//    'message' (data) workitem 发送来的消息.
//    'finish'  ()     完成了所有的任务.
//--------------------------------------------------------
module.exports = class workers extends events.EventEmitter {
  constructor() {
    super();
    this.g_cur_work_process_count = 0;
  }

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
  * @return: 
  */
  init(opt, workCB) {

    opt.clientNumPerProcess = opt.clientNumPerProcess || 50;
    opt.createDurtion = opt.createDurtion || 10000;
    opt.testDurtion = opt.testDurtion || 20000;
    if (opt.testDurtion < opt.createDurtion*2) opt.testDurtion = opt.createDurtion*2;
    opt.processNum = Math.ceil(opt.clientTotal / opt.clientNumPerProcess);

    logger.init(opt.logfile, opt.errfile);

    // master.
    if (cluster.isMaster) {

      //
      // uncaughtException
      process.on('uncaughtException', function (err) {
        console.error(err);
        logger.error(process.pid, err);
      });

      process.on('SIGINT', ()=>{
        this.finish();

        let ret = global.communicate.report();
        logger.info(ret);
      });

      this.g_cur_work_process_count = 0;

      if (!opt.clientTotal) {
        console.error('err param clientTotal');
        process.exit(0);
      }
      
      opt.clientTotal = opt.clientNumPerProcess * opt.processNum;
      
      // welcome.
      
      let welcomestr = `
       ************************************************************
       *      Stress test begin.
       *        ${os.hostname()} ${os.platform()}
       *        - cpu numbers:  ${os.cpus().length}
       *        - cpu type:     ${os.cpus()[0].model} ${os.cpus()[0].speed} MHz
       *        - total memory: ${Math.floor(os.totalmem() / 1024 / 1024)} MB
       *        - free memory:  ${Math.floor(os.freemem() / 1024 / 1024)} MB
       * ----------------------------------------------------------
       *      config of:
       *        - client total:                  ${opt.clientTotal}
       *        - client number in per process:  ${opt.clientNumPerProcess}
       *        - client create durtion:         ${opt.createDurtion} ms 
       *        - process number:                ${opt.processNum}
       *        - test durtion:                  ${Math.ceil(opt.testDurtion/1000)} s
       *        - logfile:                       ${opt.logfile||''}
       *        - errfile:                       ${opt.errfile||''}
       ************************************************************
    `
    console.log(welcomestr);
    logger.info(welcomestr);

      debug('start fork');

      // cluster.on('listening',function(worker,address){
      //   console.log('listening: worker ' + worker.process.pid +', Address: '+address.address+":"+address.port);
      // });

      cluster.on('online', (worker) => {
        this.g_cur_work_process_count++;
        debug('worker online ' + this.g_cur_work_process_count);
      });

      cluster.on('exit', (worker, code, signal) =>{
        debug('worker exit ' + this.g_cur_work_process_count);
        this.g_cur_work_process_count--;
        if (this.g_cur_work_process_count <= 0) {
          if (this.closeTimer) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
          }
          this.finish();
        }
      });

      cluster.on('message', (worker, message, handle) => {
        this.emit('message', message);
      });

      //
      // fork.
      if (opt.debug) {
        this._createArrivalCount(opt, workCB)(function(){
        });
      }
      else {
        for (var i = 0; i < opt.processNum; i++) {
          g_workers.push(cluster.fork());
        }
      }

      // 结束测试的timer.
      this.closeTimer = setTimeout(()=>{
        debug('close timer');
        this.finish();
        this.closeTimer = null;
      }, opt.testDurtion);
    }

    // worker.
    else {
      this._createArrivalCount(opt, workCB)(function(){
      });
    } // if..else.
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
        this.emit('finish');
      } catch(e) {}
    }
  }

  _createArrivalCount(opt, workCB) {
    const task = function(callback) {

      let durtion = Math.floor(opt.createDurtion/opt.clientNumPerProcess);
      global.clientNumPerProcess = opt.clientNumPerProcess;

      let threadId = 0;
      const p = arrivals.uniform.process(durtion, durtion*opt.clientNumPerProcess);
      p.on('arrival', function() {
        workCB(process.pid, threadId++);
      });
      p.on('finished', function() {
        return callback(null);
      });
      p.start();
    };
  
    return task;
  }

};
