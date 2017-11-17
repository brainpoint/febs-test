'use strict';

/**
* Copyright (c) 2017 Copyright tj All Rights Reserved.
* Author: tian
* Date: 2017-11-15
* Desc: 
*/

var io = require('socket.io-client');
var os = require('os');

let socketIO = null;

exports.init = function (opt, callback) {
    socketIO = io(opt.host, { 'reconnection': false, 'autoConnect': true });

    console.log("连接IO服务器...");
    socketIO.on('connect', function () {
        // 向服务器发送连接信息
        let info = {};
        info.clientTotal = opt.clientTotal;
        info.processNum = opt.processNum;
        info.cpuNum = os.cpus().length;
        info.cpuInfo = os.cpus()[0].model + " " + os.cpus()[0].speed + " MHz";
        info.memory = (os.totalmem() / 1024 / 1024 / 1024.0).toFixed(2) + "G";
        socketIO.emit("login_press", info);
        console.log("连接成功");
        callback(false, opt);
    });

    socketIO.on('connect_error', function () {
        callback(true, opt);
    });

    // disconnect.
    socketIO.on('disconnect', function () {
        console.log("与服务器断开连接");
    });

    socketIO.on("begin_press", function(msg){
        let param = {};
        param.type = "begin_press";
        param.duration = msg.duration;
        param.no = msg.no;
        param.scale = msg.scale;

        //process.send(data);

        global.mgr.begin_press(param);

    });
}

// 向服务器发送数据
exports.sendMsg = function(topic ,data){
    socketIO.emit(topic, data);
}