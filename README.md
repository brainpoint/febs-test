febs-test for server stress test;

- [Install](#Install)
- [Example](#Example)
- [Interface](#Interface)

# Install

Use npm to install:

```js
npm install febs-test --save
```

# Example

```js
var test = require('febs-test');
var http = require('http');

test.start({
            clientTotal : 100,          // 客户端总数.
            clientNumPerProcess: 10,  // 每个进程模拟的客户端个数. 默认50个.
            createDurtion : 10000,        // in ms, 模拟客户端在此时间段内创建完成. 默认10000
            testDurtion : 20000,          // in ms, 测试的持续时间.
          }, function(){
            
              // todo.
              let token = test.test_begin('request nodjes');
              http.get('http://nodejs.org/dist/index.json', (res) => {
                const { statusCode } = res;
                let error;
                if (statusCode !== 200) {
                  test.test_end_failure(token);
                } else {
                  test.test_end_success(token);
                }

                test.finish();
              }).on('error', (e) => {
                test.test_end_failure(token);
              });
          });

```

result: 

```bash
       ************************************************************
       *      Stress test begin.
       *        HYs-MacBook-Air.local darwin
       *        - cpu numbers:  4
       *        - cpu type:     undefined undefined MHz
       *        - total memory: 4096 MB
       *        - free memory:  141 MB
       * ----------------------------------------------------------
       *      config of:
       *        - client total:                  100
       *        - client number in per process:  10
       *        - client create durtion:         10000 ms
       *        - process number:                10
       *        - test durtion:                  20 s
       *        - logfile:
       *        - errfile:
       ************************************************************

[start at: 2017-10-25 20:19:58]
[2017-10-25 20:19:58.716] [INFO] info - [start at: 2017-10-25 20:19:58]

[2017-10-25 20:20:12.913] [INFO] info -
------------------------------------
- key count                        -
------------------------------------

------------------------------------
- statistics                       -
------------------------------------
    [request nodjes]:
        request          : 100
        failure          : 0
        delayInSuccessAvg: 1274 ms
        delayInSuccessMax: 3741 ms
        delayInSuccessMin: 421 ms
        delayInFailureAvg: 0 ms
        delayInFailureMax: 0 ms
        delayInFailureMin: 0 ms

[finish at: 2017-10-25 20:20:12]
[2017-10-25 20:20:12.912] [INFO] info - [finish at: 2017-10-25 20:20:12]

```

# Show module debug info.

export DEBUG="test"

# Interface

```js
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
function test_begin(type)
```

```js
/**
 * @desc: 结束指定的测试token, 并且记录至统计结果中.
 */
function test_end_success(token)
function test_end_failure(token)
```

```js
/**
* @desc: 使用key来计数, 所欲偶测试进程的对同一个key的计数将累加.
*        并且所有进程的计数操作将在测试结束后输出.
* @return: 
*/
function add_count(type, count=1) 
```