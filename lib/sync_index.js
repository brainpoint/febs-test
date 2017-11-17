'use strict';

/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: tian
* Date: 
* Desc: 同步方式的接口
*/

var cluster = require('cluster');
var SyncWorker = require('./SyncWorker');
var communicate = require('./communicate');
var TaskMgr = require('./taskMgr');
var os = require('os');

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
    begin: (type) => global.communicate.begin(type),

    /**
    * @desc: 结束指定的测试, 并记录统计结果.
    *        end_custom 可以指定除'request', 'timeout' 之外自定义的测试结果类型.
    * @return token. 包含delay属性.
    */
    end_success: (token) => global.communicate.end_success(token),
    end_failure: (token) => global.communicate.end_failure(token),
    end_custom: (token, type) => global.communicate.end_custom(token, type),

    /**
    * @desc: 使用key来计数, 所欲偶测试进程的对同一个key的计数将累加.
    *        并且一个进程的计数操`作将在测试结束后输出.
    * @return: 
    */
    add_count: (type, count) => global.communicate.add_count(type, count),
};

/**
* @desc: 初始化测试模块.
* @param opt: 
*         {
            host,                 // IO服务器地址
            clientTotal,          // 客户端总数.
            processNum,           // 进程数. 默认50个.
            createDuration,       // 创建时间段
            logfile,              // 日志文件位置. null则不会存储.
            errfile,              // 错误日志位置. null则不会存储.
            debug,                // 指明debug则workCB在主线程运行, 并且不创建其他进程.
          }
* @param workCB: function(pid, tid) {}  // 在此回调中编写测试程序.
* @return: 
*/
function start(opt, workCB) {

    global.communicate = new communicate(); // 全局对象.

    opt.processNum = opt.processNum || 30;
    opt.clientTotal = opt.clientTotal || 600;
    opt.createDuration = opt.createDuration || 15000;
    opt.callback = workCB;

    if (cluster.isMaster) {
        // 打印系统信息.
        let info = `
************************************************************
* System info.
* ${os.hostname()} ${os.platform()}
* - cpu numbers  :${os.cpus().length}
* - cpu type     :${os.cpus()[0].model} ${os.cpus()[0].speed} MHz
* - total memory :${Math.floor(os.totalmem() / 1024 / 1024)} MB
* - free memory  :${Math.floor(os.freemem() / 1024 / 1024)} MB       
************************************************************
`
        console.log(info);

        global.io = require('./client');


        if (opt.debug) {
            //opt.processNum = 1;     // 调试模式进程数为1.
        }
        // 链接服务器.
        global.io.init(opt, init_master);
    }
    else {
        let wk = new SyncWorker(opt, false);
        cluster.wk = wk;
        wk.init();
    }
}

function finish() {
    if (cluster.isMaster) {
        _finish();
    }
    else {
        cluster.wk.finish();
    }
}

function init_master(err, opt) {
    if (err) {
        console.log("服务器连接失败");
        process.exit(0);
        return;
    }

    global.mgr = new TaskMgr(opt);          // 主线程管理器.


    // 如果是调试模式
    if (opt.debug) {
        return;
    }

    cluster.on('online', function (worker) {
        global.mgr.ready();
    });

    // 创建进程.
    global.mgr.create_process();

    

    process.on('SIGINT', () => {
        // ctrl + c 退出命令.
        process.exit(0);
    });


}

function _finish() {

}