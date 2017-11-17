'use strict';

/**
* Copyright (c) 2017 Copyright tj All Rights Reserved.
* Author: tian
* Date: 2017-11-15
* Desc: 任务管理器
*/

var cluster = require('cluster');
var os = require('os');
var SyncWorker = require('./SyncWorker');

var gWokers = [];

module.exports = class TaskMgr {
    constructor(opt) {
        this._opt = opt;
        this._timer = null;
        this._startTime = 0;
        this._numReady = 0;
        this._numFinish = 0;
        this._pressNO = 0;

        if (opt.debug) {
            let wk = new SyncWorker(opt, true);
            gWokers.push(wk);
            wk.init();
        }
    }

    ready() {
        this._numReady++;
        if (this._numReady >= this._opt.processNum) {
            // 全部线程准备就绪,向服务器发送准备就绪的消息.
            global.io.sendMsg("client_ready");
        }
    }

    // 创建进程.
    create_process() {
        this._numReady = 0;
        this._numFinish = 0;
        // 创建进程.
        for (let i = 0; i < this._opt.processNum; i++) {
            gWokers.push(cluster.fork());
        }

        // 监听消息.
        for (let i = 0; i < gWokers.length; i++) {
            gWokers[i].on('message', process_msg);
        }
    }

    // 开始一次压测
    begin_press(params) {
        this._pressNO = params.no;
        this._numFinish = 0;

        // 给所有线程发送开始命令.
        for (let i = 0; i < gWokers.length; i++) {
            gWokers[i].send(params);
        }

        console.log("*********************** begin press ***************************")
        console.log("duration:" + (params.duration / 1000) + "s");
        this._startTime = Date.now();
        this._timer = setInterval(() => {
            let passDuration = Date.now() - this._startTime;
            if (passDuration >= params.duration) {
                // 任务时间用完,强制结束任务线程.
                this._force_finish();

                clearInterval(this._timer);
                this._timer = null;
                passDuration = params.duration;
            }
            let info = '...' + Math.floor((passDuration / params.duration) * 100) + '%  ' + `free memory: ${Math.floor(os.freemem() / 1024 / 1024)} MB` + `    cpu stage: ${os.loadavg()[0]} %`;
            console.log(info);

        }, 5000);
    }

    // 
    finish_press() {
        this._numFinish++;
        if (this._numFinish < this._opt.processNum) {
            return;
        }

        // 如果计时器没有停止, 关闭它.
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        this._numFinish = 0;

        let info = {};
        let ret = global.communicate.report(info);

        console.log(ret);

        let passDuration = Date.now() - this._startTime;

        let rp = {};
        rp.no = this._pressNO;
        rp.info = info;
        rp.time = passDuration;
        global.io.sendMsg("press_report", rp);

        passDuration = Math.floor(passDuration / 1000);
        console.log("Press take :" + passDuration + "s");

        // 清空worker
        try {
            for (let i = 0; i < g_workers.length; i++) {
                let cmd = is_win ? `taskkill /PID ${g_workers[i].process.pid} /F` : `kill ${g_workers[i].process.pid}`;
                exec(cmd, function (err, stdout, stderr) {
                });
            }
        } catch (e) {

        }
        gWokers = [];
        global.communicate.clear();
        this.create_process();
    }

    _force_finish() {
        for (let i = 0; i < gWokers.length; i++) {
            gWokers[i].send({ type: "exit" });
        }

        this._numFinish = this._opt.processNum;
        this.finish_press();
    }

}


function process_msg(msg) {
    if (msg.type == 'begin') {
        global.communicate._begin(msg.data);
    }
    else if (msg.type == 'end_custom') {
        global.communicate.end_custom(msg.data, msg.custom);
    }
    else if (msg.type == 'add_count') {
        global.communicate._add_count(msg.data);
    }
    else if (msg.type == "finish") {
        global.mgr.finish_press(msg.pid);
    }
}