'use strict';
/**
* Copyright (c) 2017 Copyright tj All Rights Reserved.
* Author: lipengxiang
* Date: 
* Desc: 
*/

const debug = require('debug')('test');
var cluster = require('cluster');
var logger = require('./logger');
const uuid = require('uuid/v4');
const os   = require('os');

module.exports = class communicate {

  constructor() {
    if (cluster.isMaster) {
      this.tokens = new Map();  // <type, map>
      this.statistics = new Map(); // <type, statisticsObj>
      this.counts = new Map();     // <key, number>
    }
  }

  /**
  * @desc: 开始一个测试, 并在失败和成功的时候调用相应的处理.
  *        在测试结束后, 同类的测试将会归为相同的统计.
  *        在超时过后还未调用结束测试方法的, 将标记为超时.
  * @param type: 测试的类型, 相同的测试类型, 将累加统计.
  * @return: test_token. 
  */
  begin(type) {
    let id = uuid();
    id = (cluster.isWorker ? cluster.worker.id+id : '0' + id);

    let token = {
      type,
      id: id,
      startat: process.hrtime(),
    };

    if (cluster.isWorker) {
      try {
        process.send({type:'begin', data:token});
      } catch (e) {}
      return token;
    }
    this._begin(token);
    return token;
  }
  _begin(token) {
    if (!this.tokens.has(token.type)) {
      this.tokens.set(token.type, new Map());
      this.statistics.set(token.type, {
        request: 0,        // 总请求个数.
        failure: 0,
        success: 0,
        delayInSuccess: 0, // 总延迟.
        delayInSuccessMax: 0,
        delayInSuccessMin: Number.MAX_SAFE_INTEGER,
        delayInFailure: 0, // 总延迟.
        delayInFailureMax: 0,
        delayInFailureMin: Number.MAX_SAFE_INTEGER,
      });
    }

    this.statistics.get(token.type).request++;

    let map = this.tokens.get(token.type);
    map.set(token.id, token);
  }

  /**
   * @desc: 结束指定的测试token, 并且记录至统计结果中.
   */
  end_success(token) {
    try {
      if (cluster.isWorker) {
        try {
          process.send({type:'end_success', data:token});
        } catch (e) {}
        return;
      }
      
      let map = this.tokens.get(token.type);
      if (map.has(token.id)) {
        let endedAt = process.hrtime(token.startat);
        let delta = (endedAt[0] * 1e9) + endedAt[1];

        let statisticsObj = this.statistics.get(token.type);
        statisticsObj.success++;
        statisticsObj.delayInSuccess += delta;
        if (statisticsObj.delayInSuccessMax <= delta)
          statisticsObj.delayInSuccessMax = delta;
        else if (statisticsObj.delayInSuccessMin > delta)
          statisticsObj.delayInSuccessMin = delta;

        // delete.
        map.delete(token.id);
      } // if.

    } catch (e) {
      debug(e);
      logger.error(e);
    }
  }
  
  end_failure(token) {
    try {
      if (cluster.isWorker) {
        try {
          process.send({type:'end_failure', data:token});
        } catch (e) {}
        return;
      }

      let map = this.tokens.get(token.type);
      if (map.has(token.id)) {
        let endedAt = process.hrtime(token.startat);
        let delta = (endedAt[0] * 1e9) + endedAt[1];

        let statisticsObj = this.statistics.get(token.type);
        statisticsObj.failure++;
        statisticsObj.delayInFailure += delta;
        if (statisticsObj.delayInFailureMax <= delta)
          statisticsObj.delayInFailureMax = delta;
        else if (statisticsObj.delayInFailureMin > delta)
          statisticsObj.delayInFailureMin = delta;

        // delete.
        map.delete(token.id);
      }
    } catch (e) {
      debug(e);
      logger.error(e);
    }
  }

  /**
  * @desc: 使用key来计数, 所欲偶测试进程的对同一个key的计数将累加.
  *        并且所有进程的计数操作将在测试结束后输出.
  * @return: 
  */
  add_count(type, count=1) {
    if (cluster.isWorker) {
      try {
        process.send({type:'add_count', data:{type, count}});
      } catch (e) {}
      return;
    }

    this._add_count({type, count});
  }
  _add_count(data) {
    if (!this.counts.has(data.type)) {
      this.counts.set(data.type, data.count);
      return;
    }

    let num = this.counts.get(data.type) + data.count;
    this.counts.set(data.type, num);
  }

  report() {
    if (cluster.isMaster) {
      let ret = '' + os.EOL;

      //
      // count.
      ret += '------------------------------------' + os.EOL;
      ret += '- key count                        -' + os.EOL;
      ret += '------------------------------------' + os.EOL;
      this.counts.forEach(function(value, key){
        let ii = `    [${key}]`;
        while (ii.length < 30) {
          ii += ' ';
        }

        ret += ii + ': ' +value + os.EOL;
      });

      //
      // count.
      ret += os.EOL
      ret += '------------------------------------' + os.EOL;
      ret += '- statistics                       -' + os.EOL;
      ret += '------------------------------------' + os.EOL;
      this.statistics.forEach(function(value, key){
        if (value.delayInSuccessMin == Number.MAX_SAFE_INTEGER)
          value.delayInSuccessMin = 0;
        if (value.delayInFailureMin == Number.MAX_SAFE_INTEGER)
          value.delayInFailureMin = 0;
        
        if (value.success)  value.delayInSuccess = value.delayInSuccess / value.success;
        if (value.failure)  value.delayInFailure = value.delayInFailure / value.failure;

        ret += `    [${key}]:` + os.EOL;
        ret += `        request          : ${value.request}` + os.EOL;
        ret += `        failure          : ${value.failure}` + os.EOL;
        ret += `        delayInSuccessAvg: ${Math.ceil(value.delayInSuccess/1000000)} ms` + os.EOL;
        ret += `        delayInSuccessMax: ${Math.ceil(value.delayInSuccessMax/1000000)} ms` + os.EOL;
        ret += `        delayInSuccessMin: ${Math.ceil(value.delayInSuccessMin/1000000)} ms` + os.EOL;
        ret += `        delayInFailureAvg: ${Math.ceil(value.delayInFailure/1000000)} ms` + os.EOL;
        ret += `        delayInFailureMax: ${Math.ceil(value.delayInFailureMax/1000000)} ms` + os.EOL;
        ret += `        delayInFailureMin: ${Math.ceil(value.delayInFailureMin/1000000)} ms` + os.EOL;
      });

      return ret;
    }
  }
};
