'use strict';
/**
* Copyright (c) 2017 Copyright brainpoint All Rights Reserved.
* Author: lipengxiang
* Date: 
* Desc: 
*/

const debug = require('debug')('febs-test');
const cluster = require('cluster');
const logger = require('./logger');
const uuid = require('uuid/v4');
const os   = require('os');
const febs = require('febs');

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
        failure: {count:0, delayAvg:0, delayMax:0, delayMin:Number.MAX_SAFE_INTEGER},
        success: {count:0, delayAvg:0, delayMax:0, delayMin:Number.MAX_SAFE_INTEGER},
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
    return this.end_custom(token, 'success');
  }
  
  end_failure(token) {
    return this.end_custom(token, 'failure');
  }

  /**
  * @desc: 使用自定义结果标识来结束当前测试.
  * @return token. 包含delay属性.
  */
  end_custom(token, type) {
    try {
      if (type == 'request' || type == 'timeout') {
        logger.error('can\'t use \'request\' as type');
        return token;
      }

      if (cluster.isWorker) {
        try {
          process.send({type:'end_custom', data:token, custom:type});
        } catch (e) {}

        let endedAt = process.hrtime(token.startat);
        let delta = (endedAt[0] * 1e9) + endedAt[1];
        token.delay = Math.ceil(delta/1000000);
        return token;
      }

      let map = this.tokens.get(token.type);
      if (map.has(token.id)) {
        let endedAt = process.hrtime(token.startat);
        let delta = (endedAt[0] * 1e9) + endedAt[1];
        token.delay = Math.ceil(delta/1000000);

        let statisticsObj = this.statistics.get(token.type);
        if (!statisticsObj.hasOwnProperty(type))
          statisticsObj[type] = {count:0, delayAvg:0, delayMax:0, delayMin:Number.MAX_SAFE_INTEGER};
        
        let obj = statisticsObj[type];

        obj.count++;
        obj.delayAvg = febs.utils.bigint_add(obj.delayAvg, token.delay);
        if (obj.delayMax <= delta)
          obj.delayMax = delta;
        else if (obj.delayMin > delta)
          obj.delayMin = delta;

        // delete.
        map.delete(token.id);
      }
    } catch (e) {
      debug(e);
      logger.error(e);
    }
    return token;
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
        while (ii.length < 25) {
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

        let timeout = 0;
        for (var kk in value) {
          if (kk != 'request') {
            timeout += value[kk].count;
          }
        }
        timeout = value.request-timeout;

        if (value.success.delayMin == Number.MAX_SAFE_INTEGER)
          value.success.delayMin = 0;
        if (value.failure.delayMin == Number.MAX_SAFE_INTEGER)
          value.failure.delayMin = 0;
        
        let delayAvg1 = value.success.delayAvg, delayAvg2 = value.failure.delayAvg;
        if (value.success.count)  delayAvg1 = febs.utils.bigint_dividedBy(delayAvg1, value.success.count);
        if (value.failure.count)  delayAvg2 = febs.utils.bigint_dividedBy(delayAvg2, value.failure.count);

        ret += `    [${key}]:` + os.EOL;
        ret += `        request          : ${value.request}` + os.EOL;
        ret += `        timeout          : ${timeout}` + os.EOL;
        ret += `        success          : ${value.success.count}` + os.EOL;
        ret += `               delay-avg : ${febs.utils.bigint_toFixed(delayAvg1)} ms` + os.EOL;
        ret += `               delay-max : ${Math.ceil(value.success.delayMax/1000000)} ms` + os.EOL;
        ret += `               delay-min : ${Math.ceil(value.success.delayMin/1000000)} ms` + os.EOL;
        ret += `        failure          : ${value.failure.count}` + os.EOL;
        ret += `               delay-avg : ${febs.utils.bigint_toFixed(delayAvg2)} ms` + os.EOL;
        ret += `               delay-max : ${Math.ceil(value.failure.delayMax/1000000)} ms` + os.EOL;
        ret += `               delay-min : ${Math.ceil(value.failure.delayMin/1000000)} ms` + os.EOL;

        for (var kk in value) {
          if (kk != 'request' && kk != 'success' && kk != 'failure') {
            if (value[kk].delayMin == Number.MAX_SAFE_INTEGER)
              value[kk].delayMin = 0;
            
            delayAvg1 = value[kk].delayAvg;
            if (value[kk].count)  delayAvg1 = febs.utils.bigint_dividedBy(delayAvg1, value[kk].count);
    
            let sk = `        ${kk}`;
            while (sk.length < 25) sk += ' ';
            ret += sk + `: ${value[kk].count}` + os.EOL;
            ret += `               delay-avg : ${febs.utils.bigint_toFixed(delayAvg1)} ms` + os.EOL;
            ret += `               delay-max : ${Math.ceil(value[kk].delayMax/1000000)} ms` + os.EOL;
            ret += `               delay-min : ${Math.ceil(value[kk].delayMin/1000000)} ms` + os.EOL;    
          }
        }
      });

      return ret;
    }
  }
};
