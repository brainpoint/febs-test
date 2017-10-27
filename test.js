'use strict';
/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: lipengxiang
* Date: 
* Desc: 
*/

var test = require('./lib');
var http = require('http');

//
// test work.
function test_work(pid, tid){ // or async function test_work(pid, tid) {
    // todo.
    test.add_count('request', 1);
    let token = test.begin('request nodjes');
    http.get('http://nodejs.org/dist/index.json', (res) => {
      const { statusCode } = res;
      let error;
      if (statusCode !== 200) {
        test.end_custom(token, statusCode.toString());
      } else {
        test.end_success(token);
      }

      test.finish();
    }).on('error', (e) => {
      test.end_failure(token);
    });
}

//
// begin test.
test.start({
            clientTotal: 100,          // 客户端总数.
            clientNumPerProcess: 10,  // 每个进程模拟的客户端个数. 默认50个.
            createDurtion: 5000,        // in ms, 模拟客户端在此时间段内创建完成. 默认10000
            testDurtion : 20000,          // in ms, 测试的持续时间.
          }, test_work);