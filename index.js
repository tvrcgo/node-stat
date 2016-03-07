'use strict';

/**
 * 统计库
 * @author tvrcgo
 * @since 2015/11
 */

var path = require('path');
var fs = require('fs');
var util = require('util');
var qs = require('querystring');
var crypto = require('crypto');

/**
 * 写日志对象
 * @param {Object} 实例化参数
 */
function Logger (options) {
    if ( !(this instanceof Logger) ) {
        return new Logger(options);
    }
    this._name = options.name || 'node-stat';
    this._dir = options.dir || '.';
    this._streams = {};
}

/**
 * 获取日志流
 */
Logger.prototype.stream = function(type){
    type = type || 'log';
    var tm = _time(),
        suffix = [tm[0], tm[1], tm[2],tm[3]].join(''), //yyyymmddHH
        filename = [this._name, type, suffix].join('_') + '.log',
        skey = _md5(filename),
        tar = this._streams[type];

    if ( !tar || tar.key !== skey ) {
        if (tar && tar.stream) {
            tar.stream.end();
        }
        this._streams[type] = {
            key: skey,
            stream: fs.createWriteStream(path.join(this._dir, filename), {
                flags: 'a', encoding:'utf-8'
            })
        }
    }

    return this._streams[type].stream;
}

/**
 * 写日志
 * @param {Object} 日志参数对象
 */
Logger.prototype.log = function(type, params){

    var line = Object.keys(params).map(function(key){
        var val = !_non(params[key]) ? params[key] : '';
        // 过滤日志分隔符
        if (typeof val == 'string' || val instanceof String) {
            val = val.replace(/`/g, '\'');
        }
        return key + '=' + val;
    }).join('`') + "\n";

    var stream = this.stream(type);
    stream.write(line);
}

/**
 * 统计对象
 * @param {Object} 实例化参数
 * @param {object} 初始参数
 */
function Stat(opts, params){
    if (!(this instanceof Stat)) {
        return new Stat(opts, params);
    }
    opts = opts || {};
    this._dir = opts.dir;
    this._name = opts.name;
    var tm = _time(true);
    this._params = _mix({
        _t: tm
    }, params);
}

/**
 * 中间件：初始化公共参数，扩展 res.stat 对象
 * @param {Object} 中间件参数
 */
Stat.mixin = function(opts){

    return function(req, res, next){

        var ref = req.headers['referer'] || '';
        var ua = req.headers['user-agent'];
        var url = req.url || '';

        var params = {
            _path: req.path,
            _url: url,
            _ua: ua,
            _ref: ref
        };

        // 用户唯一ID: xuid
        params._uid = req.query.uid || _uuid();
        //合并 req.query 参数
        _mix( params, req.query );

        // 扩展 res.stat 对象
        res.stat = Stat(opts, params);

        next();
    }
};

/**
 * 新参数
 * @param {object|function} 参数对象或函数运行返回对象
 */
Stat.prototype.use = function(param){
    if ( param && typeof param === 'function' ) {
        _mix(this._params, param.call(this, this._params));
    }
    else {
        param = param || {};
        _mix(this._params, param);
    }
    return this;
};

/**
 * 获取统计参数
 * @param  {String} key
 */
Stat.prototype.param = function(key) {
    return this._params[key] || '';
};

/**
 * 获取 Logger 对象
 * @param {String} 日志类型
 */
Stat.prototype.logger = function(type){
    if (!Stat.logger) {
        Stat.logger = Logger({
            name: this._name,
            dir: this._dir
        });
    }
    if (type) {
        var _this = this;
        return {
            log: function(params){
                params.type = type;
                _mix(params, this._params);
                Stat.logger.log(type, params);
            }.bind(_this)
        };
    }
    return Stat.logger;
};

/**
 * pageview 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.pageview = function(params){
    params.type = 'pageview';
    _mix(params, this._params);
    this.logger().log('pageview', params);
    return this;
};

/**
 * event 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.event = function(params){
    params.type = 'event';
    _mix(params, this._params);
    this.logger().log('event', params);
    return this;
};

/**
 * click 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.click = function(params){
    params.type = 'click';
    _mix(params, this._params);
    _except(params, ['xurl', 'xref']);
    this.logger().log('click', params);
    return this;
};

/**
 * error 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.error = function(params){
    params.type = 'error';
    _mix(params, this._params);
    this.logger().log('error', params);
    return this;
};

module.exports = Stat;

/**
 * 用户唯一ID
 * @return {String} 3个8位随机串连接
 */
function _uuid() {
    // 三个8位的随机串
    return [_ss(), _ss(), _ss()].join('-');
}

/**
 * 8位随机串
 */
function _ss() {
    return Math.random().toString(16).substr(2);
}

/**
 * 当前时间戳
 */
function _time(format){

    var dat = new Date
	var y = dat.getFullYear();
	var m = dat.getMonth() + 1;
	var d = dat.getDate();

	var H = dat.getHours();
	var M = dat.getMinutes();
	var S = dat.getSeconds();
	var MM = dat.getMilliseconds();

	if (m <= 9) m = '0' + m;
	if (d <= 9) d = '0' + d;
	if (H <= 9) H = '0' + H;
	if (M <= 9) M = '0' + M;
	if (S <= 9) S = '0' + S;

    if (format) {
        return [y,m,d].join('-') + ' ' +[H,M,S].join(':') + '.' + MM ;
    }

	return [y,m,d,H,M,S,MM]
}

/**
 * 合并对象
 * @param {[Object]} 两个或多个对象
 * @return {Object } 合并后的对象
 */
function _mix() {
    var args = [].slice.call(arguments);
    var src = args[0] || {};
    for (var i=1; i<args.length; i++) {
        var tar = args[i];
        for( var key in tar ) {
            if ( tar.hasOwnProperty(key) && !_non(tar[key]) ) {
                src[key] = tar[key];
            }
        }
    }
    return src;
}

/**
 * 过滤字段
 * @param  {Object} params 参数对象
 * @param  {Array} keys  要过滤的参数key数组
 * @return {Object}   过滤后的对象
 */
function _except(params, keys) {
    for(var key in params) {
        if (keys.indexOf(key)>=0) {
            delete params[key];
        }
    }
    return params;
}

/**
 * 解析 QueryString 参数
 * @param  {String} url URL
 * @return {Object} query参数对象
 */
function _query(url) {
    return qs.parse(url.split('?')[1] || '') || {};
}

/**
 * is null or undefined
 * @param  {*} obj
 * @return {Bool}
 */
function _non(obj) {
    return obj === null || obj === undefined;
}

/**
 * md5
 * @param  {string} str
 * @return {string}
 */
function _md5(str) {
    var hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
}
