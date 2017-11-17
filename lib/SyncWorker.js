'use strict';
/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: tian
* Date: 
* Desc: 同步式工作线程
*/
const debug = require('debug')('febs');
var arrivals = require('arrivals');

module.exports = class SyncWorker {
    constructor(opt, isMaster) {
        this._isMaster = isMaster;
        this._opt = opt;
        this._npp = 1;      // 每个进程的callback数量
        this._numFinish = 0;
    }

    init() {
        process.on("message", (msg) => {
            this._deal_msg(msg);
        });
    }

    send(msg){

    }

    _deal_msg(msg) {
        if (msg.type == "begin_press") {
            this._begin_press(msg);
        }        
        else if (msg.type == "exit") {
            process.exit(0);
        }
    }

    finish() {
        this._numFinish++;
        if (this._numFinish == this._npp) {
            // 通知主进程任务完成.
            process.send({ type: "finish", pid: process.pid });

            // 任务全部执行完成.进程退出
            process.exit(0);
        }
    }

    _begin_press(param) {
        let total = this._opt.clientTotal * param.scale;
        this._npp = Math.floor(total / this._opt.processNum);
        let duration = Math.floor(this._opt.createDurtion / this._npp);
        let threadId = 0;
        const p = arrivals.uniform.process(duration, duration * this._nnp);
        p.on('arrival', () => {
            if(threadId < this._npp){
                this._opt.callback(process.pid, threadId++);
            }
        });
        p.on('finished', function () {

        });
        p.start();
    }
}