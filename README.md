febs-test for server stress test;

- [Install](#install)
- [Example](#example)
- [Interface](#interface)

# Install

Use npm to install:

```js
npm install febs-test --save
```

# Example

```js
'use strict';
/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: lipengxiang
* Date: 
* Desc: 
*/

var test = require('febs-test');
var http = require('http');

//
// test work.
function test_work(){ // or async function test_work() {
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
            processNum: 10,            // 进程数. 默认50个.
            createDurtion: 5000,        // in ms, 模拟客户端在此时间段内创建完成. 默认10000
            testDurtion : 20000,          // in ms, 测试的持续时间.
          }, test_work);
```

result: 

```bash
       ************************************************************
       *      Stress test begin.
       *        HYs-MacBook-Air.local darwin
       *        - cpu numbers:  4
       *        - cpu type:     undefined undefined MHz
       *        - total memory: 4096 MB
       *        - free memory:  191 MB
       * ----------------------------------------------------------
       *      config of:
       *        - client total:                  100
       *        - client number in per process:  10
       *        - client create durtion:         5000 ms
       *        - process number:                10
       *        - test durtion:                  20 s
       *        - logfile:
       *        - errfile:
       ************************************************************

[start at: 2017-10-26 13:51:14]
⠋ Testing...
⠧ Testing... ...25%
⠇ Testing... ...50%
⠼ Testing...

------------------------------------
- key count                        -
------------------------------------
    [request]            : 100

------------------------------------
- statistics                       -
------------------------------------
    [request nodjes]:
        request          : 100
        timeout          : 0
        success          : 100
               delay-avg : 1944 ms
               delay-max : 8303 ms
               delay-min : 414 ms
        failure          : 0
               delay-avg : 0 ms
               delay-max : 0 ms
               delay-min : 0 ms

[finish at: 2017-10-26 13:51:25]
Test take 12 s
```

# Interface

```js
/**
* @desc: 初始化测试模块.
* @param opt: 
*         {
            clientTotal,          // 客户端总数.
            processNum,           // 进程数. 默认50个.
            createDurtion,        // in ms, 模拟客户端在此时间段内创建完成. 默认10000
            testDurtion,          // in ms, 测试的持续时间.
            logfile,              // 日志文件位置. null则不会存储.
            errfile,              // 错误日志位置. null则不会存储.
            debug,                // 指明debug则workCB在主线程运行, 并且不创建其他进程.
          }
* @param workCB: function(pid, tid) {}  // 在此回调中编写测试程序.
* @return: 
*/
function start(opt, workCB)
```

```js
/**
* @desc: 退出当前测试. 如果不调用此语句, 则测试会等待testDurtion时间到达后结束.
*/
function finish()
```

```js
/**
  * @desc: 开始一个测试, 并在失败和成功的时候调用相应的处理.
  *        在测试结束后, 同类的测试将会归为相同的统计.
  *        在超时过后还未调用结束测试方法的, 将标记为超时.
  * @param type: 测试的类型, 相同的测试类型, 将累加统计.
  * @return: test_token. 
  */
function begin(type)
```

```js
/**
* @desc: 结束指定的测试, 并记录统计结果.
*        end_custom 可以指定除'request', 'timeout' 之外自定义的测试结果类型.
* @return token. 包含delay属性.
*/
function end_success(token)
function end_failure(token)
function end_custom(token, type)
```

```js
/**
* @desc: 使用key来计数, 所欲偶测试进程的对同一个key的计数将累加.
*        并且所有进程的计数操作将在测试结束后输出.
* @return: 
*/
function add_count(type, count=1) 
```

```js
/**
 * 测试电脑性能, 并输出信息得到进程数的参考值.
 * @param opt: 
 *         {
            minMemory,            // in byte, 保留的最小内存数.
            logfile,              // 日志文件位置. null则不会存储.
            }
  */
function testPerformance(opt)
```